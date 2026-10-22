import "server-only";
import { cache } from "react";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { games, gameTrophies, userTrophies } from "@/db/schema";
import { getUserTimezone } from "@/lib/profiles";
import type { TrophyGrade } from "@/lib/types";
import { traduccionesEnCache } from "@/lib/trofeosIdioma";
import type { Idioma } from "@/lib/idiomasTrofeo";
import { calcularPeriodos, horaFavorita, type Periodos } from "@/lib/periodos";

/**
 * Histórico de trofeos.
 *
 * Sale de `user_trophy.earnedAt`, que ya se guardaba desde el principio y no
 * se usaba en ninguna pantalla. Es el único dato de la app que cuenta una
 * historia en el tiempo: todo lo demás (porcentajes, totales) es una foto de
 * cómo están las cosas hoy.
 *
 * OJO con la cobertura: la fecha de un trofeo solo llega cuando se ha pedido
 * el detalle de ese juego, así que el histórico cubre menos trofeos que el
 * total del perfil. Por eso `cobertura()` existe y por eso la UI dice sobre
 * cuántos trofeos está hablando en vez de dar a entender que están todos. El
 * cron de /api/cron/sync va rellenando ese hueco pasada a pasada.
 */

export interface MesConTrofeos {
  /** "2026-01" */
  mes: string;
  total: number;
  platinos: number;
}

/**
 * Trofeos por mes de los últimos N meses, con los huecos rellenos a cero.
 *
 * Los meses vacíos importan: una gráfica que salta de enero a junio como si
 * fueran contiguos miente sobre el ritmo.
 */
export async function trofeosPorMes(userId: string, meses = 12): Promise<MesConTrofeos[]> {
  const filas = await db
    .select({
      mes: sql<string>`to_char(date_trunc('month', ${userTrophies.earnedAt}), 'YYYY-MM')`,
      total: sql<number>`count(*)`,
      platinos: sql<number>`count(*) filter (where ${gameTrophies.grade} = 'platinum')`,
    })
    .from(userTrophies)
    .leftJoin(
      gameTrophies,
      and(
        eq(gameTrophies.gameId, userTrophies.gameId),
        eq(gameTrophies.trophyId, userTrophies.trophyId),
      ),
    )
    .where(
      and(
        eq(userTrophies.userId, userId),
        eq(userTrophies.earned, true),
        isNotNull(userTrophies.earnedAt),
        sql`${userTrophies.earnedAt} > now() - make_interval(months => ${meses})`,
      ),
    )
    .groupBy(sql`date_trunc('month', ${userTrophies.earnedAt})`);

  const porMes = new Map(
    filas.map((f) => [f.mes, { total: Number(f.total), platinos: Number(f.platinos) }]),
  );

  const salida: MesConTrofeos[] = [];
  const hoy = new Date();

  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1));
    const clave = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const dato = porMes.get(clave);
    salida.push({ mes: clave, total: dato?.total ?? 0, platinos: dato?.platinos ?? 0 });
  }

  return salida;
}

export interface Rachas {
  /** Días seguidos cazando trofeos que siguen vivos (cuentan hoy o ayer). */
  actual: number;
  /** La mejor racha de siempre. */
  mejor: number;
  /** Días distintos con al menos un trofeo. */
  diasActivos: number;
  /** Si hoy ya cuenta para la racha — si no, y `actual > 0`, está en riesgo. */
  hoyCuenta: boolean;
}

/**
 * Rachas de días.
 *
 * Se traen los días distintos y se recorren en memoria en vez de resolverlo
 * con funciones de ventana en SQL: son unos cientos de filas por persona y el
 * cálculo se lee de un vistazo, que aquí vale más que el microsegundo.
 *
 * `cache()`: el layout raíz ya llama a esto para la cabecera, y varias
 * páginas (p.ej. la portada) lo vuelven a pedir para lo suyo — sin
 * memoizar, esa segunda llamada era la misma consulta otra vez.
 */
export const rachas = cache(async (userId: string): Promise<Rachas> => rachasDeDias(await diasConTrofeo(userId, false)));

/**
 * Lo mismo pero solo con los días de ESTE año (21 oct 2026): para el Wrap,
 * que lo enseña bajo "Tu 2026". Antes salía la cuenta de siempre y alguien con
 * años en Paragon veía "1555 días con trofeo" en un año.
 */
export const rachasDelAnio = cache(async (userId: string): Promise<Rachas> => rachasDeDias(await diasConTrofeo(userId, true)));

/** Los días distintos con algún trofeo, en orden ("YYYY-MM-DD"). */
async function diasConTrofeo(userId: string, soloEsteAnio: boolean): Promise<string[]> {
  const filas = await db
    .select({ dia: sql<string>`to_char(date(${userTrophies.earnedAt}), 'YYYY-MM-DD')` })
    .from(userTrophies)
    .where(
      and(
        eq(userTrophies.userId, userId),
        eq(userTrophies.earned, true),
        isNotNull(userTrophies.earnedAt),
        soloEsteAnio ? sql`date_part('year', ${userTrophies.earnedAt}) = date_part('year', now())` : undefined,
      ),
    )
    .groupBy(sql`date(${userTrophies.earnedAt})`)
    .orderBy(sql`date(${userTrophies.earnedAt})`);

  return filas.map((f) => f.dia);
}

/** Rachas a partir de los días con trofeo (ordenados). */
export function rachasDeDias(dias: string[]): Rachas {
  if (dias.length === 0) return { actual: 0, mejor: 0, diasActivos: 0, hoyCuenta: false };

  const DIA_MS = 86_400_000;
  const aFecha = (s: string) => Date.parse(`${s}T00:00:00Z`);

  let mejor = 1;
  let corriendo = 1;

  for (let i = 1; i < dias.length; i++) {
    const seguidos = aFecha(dias[i]) - aFecha(dias[i - 1]) === DIA_MS;
    corriendo = seguidos ? corriendo + 1 : 1;
    if (corriendo > mejor) mejor = corriendo;
  }

  // La racha actual solo sigue viva si el último día es hoy o ayer; si no, se
  // rompió y lo honesto es un cero, no el último tramo bueno.
  const hoy = new Date();
  const hoyUTC = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  const distancia = (hoyUTC - aFecha(dias[dias.length - 1])) / DIA_MS;
  const actual = distancia <= 1 ? corriendo : 0;
  const hoyCuenta = distancia === 0;

  return { actual, mejor, diasActivos: dias.length, hoyCuenta };
}

export interface ResumenHistorico {
  /** Trofeos con fecha conocida: la base real de todo lo de arriba. */
  conFecha: number;
  esteAnio: number;
  mejorMes: { mes: string; total: number } | null;
}

export async function resumenHistorico(userId: string): Promise<ResumenHistorico> {
  const [fila] = await db
    .select({
      conFecha: sql<number>`count(*)`,
      esteAnio: sql<number>`count(*) filter (
        where date_part('year', ${userTrophies.earnedAt}) = date_part('year', now())
      )`,
    })
    .from(userTrophies)
    .where(
      and(
        eq(userTrophies.userId, userId),
        eq(userTrophies.earned, true),
        isNotNull(userTrophies.earnedAt),
      ),
    );

  const [mejor] = await db
    .select({
      mes: sql<string>`to_char(date_trunc('month', ${userTrophies.earnedAt}), 'YYYY-MM')`,
      total: sql<number>`count(*)`,
    })
    .from(userTrophies)
    .where(
      and(
        eq(userTrophies.userId, userId),
        eq(userTrophies.earned, true),
        isNotNull(userTrophies.earnedAt),
      ),
    )
    .groupBy(sql`date_trunc('month', ${userTrophies.earnedAt})`)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  return {
    conFecha: Number(fila?.conFecha ?? 0),
    esteAnio: Number(fila?.esteAnio ?? 0),
    mejorMes: mejor ? { mes: mejor.mes, total: Number(mejor.total) } : null,
  };
}

/** El mejor mes de ESTE año (para el Wrap; con empate, el más reciente, como la gráfica). */
export async function mejorMesDelAnio(userId: string): Promise<{ mes: string; total: number } | null> {
  const [mejor] = await db
    .select({
      mes: sql<string>`to_char(date_trunc('month', ${userTrophies.earnedAt}), 'YYYY-MM')`,
      total: sql<number>`count(*)`,
    })
    .from(userTrophies)
    .where(
      and(
        eq(userTrophies.userId, userId),
        eq(userTrophies.earned, true),
        isNotNull(userTrophies.earnedAt),
        sql`date_part('year', ${userTrophies.earnedAt}) = date_part('year', now())`,
      ),
    )
    .groupBy(sql`date_trunc('month', ${userTrophies.earnedAt})`)
    .orderBy(sql`count(*) desc, date_trunc('month', ${userTrophies.earnedAt}) desc`)
    .limit(1);
  return mejor ? { mes: mejor.mes, total: Number(mejor.total) } : null;
}

/* ------------------------------ Desglose de un mes ----------------------------- */

/**
 * El "métete dentro" de la gráfica: qué hay detrás de la barra de un mes.
 *
 * El filtro va por mes natural en la zona del servidor, igual que el
 * `date_trunc` que agrupa la gráfica: si uno contara por UTC y el otro por
 * local, la suma del desglose no cuadraría con la altura de la barra, que es
 * la primera cosa que alguien comprobaría.
 */
const MES_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/;

export function esMesValido(mes: string): boolean {
  return MES_VALIDO.test(mes);
}

/** Condición común: trofeos conseguidos por el usuario dentro de ese mes. */
function delMes(userId: string, mes: string) {
  return and(
    eq(userTrophies.userId, userId),
    eq(userTrophies.earned, true),
    isNotNull(userTrophies.earnedAt),
    sql`date_trunc('month', ${userTrophies.earnedAt}) = to_date(${mes}, 'YYYY-MM')`,
  );
}

export interface TrofeoDelMes {
  gameId: string;
  juego: string;
  trophyId: string;
  nombre: string;
  detalle: string;
  grade: TrophyGrade | null;
  iconUrl: string | null;
  earnedAt: string;
  rarityPercent: number | null;
}

export interface TrofeoReciente extends TrofeoDelMes {
  /** Carátula del juego (no del trofeo) — para la lista de "Últimos trofeos" del perfil. */
  gameIconUrl: string | null;
}

/**
 * Los últimos trofeos conseguidos, de toda la biblioteca — para "Últimos
 * trofeos" en el perfil (visible tanto para el dueño como para quien lo
 * visita, es información pública igual que el resto de la ficha). Mismo
 * origen que `trofeosDelMes` (earnedAt de user_trophy), solo que sin
 * filtrar por mes: la foto más reciente, sin más.
 */
export async function ultimosTrofeos(userId: string, limite = 8, idioma?: Idioma): Promise<TrofeoReciente[]> {
  const filas = await db
    .select({
      gameId: userTrophies.gameId,
      juego: games.title,
      gameIconUrl: games.iconUrl,
      trophyId: userTrophies.trophyId,
      nombre: gameTrophies.name,
      detalle: gameTrophies.detail,
      grade: gameTrophies.grade,
      iconUrl: gameTrophies.iconUrl,
      earnedAt: userTrophies.earnedAt,
      rarityPercent: userTrophies.rarityPercent,
    })
    .from(userTrophies)
    .innerJoin(games, eq(games.id, userTrophies.gameId))
    .leftJoin(
      gameTrophies,
      and(
        eq(gameTrophies.gameId, userTrophies.gameId),
        eq(gameTrophies.trophyId, userTrophies.trophyId),
      ),
    )
    .where(
      and(
        eq(userTrophies.userId, userId),
        eq(userTrophies.earned, true),
        isNotNull(userTrophies.earnedAt),
      ),
    )
    .orderBy(desc(userTrophies.earnedAt))
    .limit(limite);

  // Solo lo ya guardado (sin llamar a ninguna plataforma): la traducción se
  // trae al abrir la ficha del juego, ver lib/trofeosIdioma.ts.
  const tr = idioma ? await traduccionesEnCache(filas.map((f) => ({ gameId: f.gameId, trophyId: f.trophyId })), idioma).catch(() => null) : null;

  return filas.map((f) => {
    const t = tr?.get(`${f.gameId}:${f.trophyId}`);
    return {
      gameId: f.gameId,
      juego: f.juego,
      gameIconUrl: f.gameIconUrl ?? null,
      trophyId: f.trophyId,
      nombre: t?.name ?? f.nombre ?? "Trofeo",
      detalle: t?.detail ?? f.detalle ?? "",
      grade: f.grade ?? null,
      iconUrl: f.iconUrl ?? null,
      earnedAt: f.earnedAt!.toISOString(),
      rarityPercent: f.rarityPercent ?? null,
    };
  });
}

export async function trofeosDelMes(userId: string, mes: string): Promise<TrofeoDelMes[]> {
  if (!esMesValido(mes)) return [];

  const filas = await db
    .select({
      gameId: userTrophies.gameId,
      juego: games.title,
      trophyId: userTrophies.trophyId,
      nombre: gameTrophies.name,
      detalle: gameTrophies.detail,
      grade: gameTrophies.grade,
      iconUrl: gameTrophies.iconUrl,
      earnedAt: userTrophies.earnedAt,
      rarityPercent: userTrophies.rarityPercent,
    })
    .from(userTrophies)
    .innerJoin(games, eq(games.id, userTrophies.gameId))
    .leftJoin(
      gameTrophies,
      and(
        eq(gameTrophies.gameId, userTrophies.gameId),
        eq(gameTrophies.trophyId, userTrophies.trophyId),
      ),
    )
    .where(delMes(userId, mes))
    .orderBy(desc(userTrophies.earnedAt));

  return filas.map((f) => ({
    gameId: f.gameId,
    juego: f.juego,
    trophyId: f.trophyId,
    nombre: f.nombre ?? "Trofeo",
    detalle: f.detalle ?? "",
    grade: f.grade ?? null,
    iconUrl: f.iconUrl ?? null,
    earnedAt: f.earnedAt!.toISOString(),
    rarityPercent: f.rarityPercent ?? null,
  }));
}

export interface DesgloseMes {
  total: number;
  porGrado: { grade: TrophyGrade | null; total: number }[];
  porJuego: { gameId: string; juego: string; iconUrl: string | null; total: number }[];
  /** Un dato por día del mes, con los días a cero incluidos. */
  porDia: { dia: string; total: number }[];
}

export async function desgloseDelMes(userId: string, mes: string): Promise<DesgloseMes> {
  const vacio: DesgloseMes = { total: 0, porGrado: [], porJuego: [], porDia: [] };
  if (!esMesValido(mes)) return vacio;

  const [porGrado, porJuego, porDia] = await Promise.all([
    db
      .select({ grade: gameTrophies.grade, total: sql<number>`count(*)` })
      .from(userTrophies)
      .leftJoin(
        gameTrophies,
        and(
          eq(gameTrophies.gameId, userTrophies.gameId),
          eq(gameTrophies.trophyId, userTrophies.trophyId),
        ),
      )
      .where(delMes(userId, mes))
      .groupBy(gameTrophies.grade),

    db
      .select({
        gameId: userTrophies.gameId,
        juego: games.title,
        iconUrl: games.iconUrl,
        total: sql<number>`count(*)`,
      })
      .from(userTrophies)
      .innerJoin(games, eq(games.id, userTrophies.gameId))
      .where(delMes(userId, mes))
      .groupBy(userTrophies.gameId, games.title, games.iconUrl)
      .orderBy(sql`count(*) desc`),

    db
      .select({
        dia: sql<string>`to_char(date(${userTrophies.earnedAt}), 'YYYY-MM-DD')`,
        total: sql<number>`count(*)`,
      })
      .from(userTrophies)
      .where(delMes(userId, mes))
      .groupBy(sql`date(${userTrophies.earnedAt})`),
  ]);

  // Los días vacíos del mes se rellenan aquí: un calendario con huecos dice
  // más sobre el ritmo que una lista de los días que sí hubo.
  const conteo = new Map(porDia.map((d) => [d.dia, Number(d.total)]));
  const [anio, mesNum] = mes.split("-").map(Number);
  const diasDelMes = new Date(Date.UTC(anio, mesNum, 0)).getUTCDate();

  const dias: DesgloseMes["porDia"] = [];
  for (let d = 1; d <= diasDelMes; d++) {
    const clave = `${mes}-${String(d).padStart(2, "0")}`;
    dias.push({ dia: clave, total: conteo.get(clave) ?? 0 });
  }

  return {
    total: [...conteo.values()].reduce((a, b) => a + b, 0),
    porGrado: porGrado.map((g) => ({ grade: g.grade ?? null, total: Number(g.total) })),
    porJuego: porJuego.map((j) => ({
      gameId: j.gameId,
      juego: j.juego,
      iconUrl: j.iconUrl ?? null,
      total: Number(j.total),
    })),
    porDia: dias,
  };
}

/**
 * Juegos distintos en los que se ha conseguido algún trofeo este año.
 *
 * Existe porque el Wrap decía "este año has estado a tope en N juegos"
 * usando el tamaño de la biblioteca entera: 284 juegos de siempre, no los de
 * este año. La cifra que acompaña a "trofeos de este año" tiene que salir del
 * mismo sitio que ellos.
 */
export async function juegosDelAnio(userId: string): Promise<number> {
  const [fila] = await db
    .select({ total: sql<number>`count(distinct ${userTrophies.gameId})` })
    .from(userTrophies)
    .where(
      and(
        eq(userTrophies.userId, userId),
        eq(userTrophies.earned, true),
        isNotNull(userTrophies.earnedAt),
        sql`date_part('year', ${userTrophies.earnedAt}) = date_part('year', now())`,
      ),
    );

  return Number(fila?.total ?? 0);
}

export interface Efemeride extends TrofeoDelMes {
  gameIconUrl: string | null;
  aniosAtras: number;
}

/**
 * "Tal día como hoy": trofeos conseguidos el mismo día y mes que hoy, en
 * años anteriores. Mismo origen que `ultimosTrofeos` (`earnedAt` de
 * `user_trophy`), pero comparado por día/mes en tu propia zona horaria
 * (`users.timezone`, mismo criterio que `franjasHorarias`) — sin la
 * conversión, alguien que consiguió un platino a las 2 de la madrugada
 * hora local podría aparecer como "ayer" en UTC, y el aniversario saldría
 * un día tarde o pronto según dónde caiga la medianoche real.
 */
export async function talDiaComoHoy(userId: string, ahora = new Date()): Promise<Efemeride[]> {
  const tz = await getUserTimezone(userId);

  const fechaLocal = sql`(${userTrophies.earnedAt} at time zone 'UTC' at time zone ${tz})`;

  const filas = await db
    .select({
      gameId: userTrophies.gameId,
      juego: games.title,
      gameIconUrl: games.iconUrl,
      trophyId: userTrophies.trophyId,
      nombre: gameTrophies.name,
      detalle: gameTrophies.detail,
      grade: gameTrophies.grade,
      iconUrl: gameTrophies.iconUrl,
      earnedAt: userTrophies.earnedAt,
      rarityPercent: userTrophies.rarityPercent,
    })
    .from(userTrophies)
    .innerJoin(games, eq(games.id, userTrophies.gameId))
    .leftJoin(
      gameTrophies,
      and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)),
    )
    .where(
      and(
        eq(userTrophies.userId, userId),
        eq(userTrophies.earned, true),
        isNotNull(userTrophies.earnedAt),
        sql`extract(month from ${fechaLocal}) = ${ahora.getMonth() + 1}`,
        sql`extract(day from ${fechaLocal}) = ${ahora.getDate()}`,
        sql`extract(year from ${fechaLocal}) < ${ahora.getFullYear()}`,
      ),
    )
    .orderBy(desc(userTrophies.earnedAt));

  return filas.map((f) => ({
    gameId: f.gameId,
    juego: f.juego,
    gameIconUrl: f.gameIconUrl ?? null,
    trophyId: f.trophyId,
    nombre: f.nombre ?? "Trofeo",
    detalle: f.detalle ?? "",
    grade: f.grade ?? null,
    iconUrl: f.iconUrl ?? null,
    earnedAt: f.earnedAt!.toISOString(),
    rarityPercent: f.rarityPercent ?? null,
    aniosAtras: ahora.getFullYear() - f.earnedAt!.getFullYear(),
  }));
}

/**
 * "Oráculo de Platino": tu ritmo real de los últimos 90 días, en trofeos
 * por semana — para proyectar una fecha de "a este paso, lo terminas el
 * X" en el juego que sea (ver `prevision()` más abajo). A propósito
 * TROFEOS por semana, no horas: ya se descartó una versión en horas para
 * "Deuda de Backlog" porque no hay ningún histórico de horas jugadas en
 * el tiempo en este proyecto — `earnedAt` sí es una serie real, por eso
 * esto es honesto y aquello no lo era.
 *
 * `null` si no ha conseguido ningún trofeo en esos 90 días — sin ritmo
 * reciente no hay con qué proyectar nada, y una media de "siempre" (siglos
 * de inactividad incluidos) daría una fecha carente de sentido.
 */
export async function ritmoSemanal(userId: string): Promise<number | null> {
  const desde = new Date(Date.now() - 90 * 86_400_000);

  const [fila] = await db
    .select({ total: sql<number>`count(*)` })
    .from(userTrophies)
    .where(and(eq(userTrophies.userId, userId), eq(userTrophies.earned, true), gte(userTrophies.earnedAt, desde)));

  const total = Number(fila?.total ?? 0);
  if (total === 0) return null;

  return total / (90 / 7);
}

export interface Prevision {
  fecha: string;
  semanas: number;
}

/** A tu ritmo real, cuándo terminarías `trofeosRestantes` — `null` si no hay ritmo reciente con el que proyectar nada (ver `ritmoSemanal`). */
export function prevision(ritmo: number | null, trofeosRestantes: number): Prevision | null {
  if (!ritmo || trofeosRestantes <= 0) return null;

  const semanas = Math.ceil(trofeosRestantes / ritmo);
  const fecha = new Date(Date.now() + semanas * 7 * 86_400_000);
  return { fecha: fecha.toISOString(), semanas };
}

/* ------------------------------ Periodos (Estadísticas de la app) ----------------------------- */

export interface PeriodosDeCaza extends Periodos {
  /** La hora (0-23, zona del usuario) a la que más trofeos cae; null sin datos. */
  horaFavorita: number | null;
}

/**
 * Semana / Año / Siempre y la hora favorita (ver lib/periodos.ts), todo en la
 * zona horaria del usuario: un trofeo de las 00:30 en Madrid es de ese día,
 * no del anterior como diría UTC.
 */
export async function periodosDeCaza(userId: string): Promise<PeriodosDeCaza> {
  const tz = await getUserTimezone(userId);
  const local = sql`(${userTrophies.earnedAt} at time zone 'UTC' at time zone ${tz})`;
  const deUsuario = and(eq(userTrophies.userId, userId), eq(userTrophies.earned, true), isNotNull(userTrophies.earnedAt));

  const [dias, horas, [hoy]] = await Promise.all([
    db
      .select({ dia: sql<string>`to_char(${local}, 'YYYY-MM-DD')`, total: sql<number>`count(*)` })
      .from(userTrophies)
      .where(deUsuario)
      .groupBy(sql`1`),
    db
      .select({ hora: sql<number>`extract(hour from ${local})::int`, total: sql<number>`count(*)` })
      .from(userTrophies)
      .where(deUsuario)
      .groupBy(sql`1`),
    db.execute<{ hoy: string }>(sql`select to_char(now() at time zone ${tz}, 'YYYY-MM-DD') as hoy`).then((r) => [...r]),
  ]);

  return {
    ...calcularPeriodos(dias.map((d) => ({ dia: d.dia, total: Number(d.total) })), hoy?.hoy ?? new Date().toISOString().slice(0, 10)),
    horaFavorita: horaFavorita(horas.map((h) => ({ hora: Number(h.hora), total: Number(h.total) }))),
  };
}
