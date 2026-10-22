import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { enSerie, recordado } from "@/lib/enSerie";
import { prepararTablas } from "@/lib/esquema";

/**
 * Tráfico dentro de Paragon (21 oct 2026), para Admin → Analítica. Vercel
 * Analytics lo mide, pero sus datos no se ven desde la app. Esto cuenta en
 * nuestra propia base, sin cookies ni almacenamiento en el navegador:
 *
 * - `trafico_dia`: por día y tipo de página (lib/traficoRutas.ts), cuántas
 *   vistas, cuántas eran entradas (la primera página de una visita) y
 *   cuántas desde el móvil. Sin IP, sin navegador, sin nada de la persona.
 * - `trafico_origen`: por día, de dónde llegan las entradas (dominio).
 * - `actividad_usuario`: qué días entra cada usuario con sesión, para saber
 *   cuánta gente usa Paragon (activos por día/semana/mes). Solo la fecha; se
 *   borra a los 90 días (está en la política de privacidad).
 *
 * Ampliado el 21 oct 2026 ("todo lo que se pueda sacar de analíticas"):
 *
 * - `trafico_dimension`: por día, contadores de etiquetas cerradas — país
 *   (cabecera de Vercel, nunca la IP), navegador, sistema, dispositivo,
 *   idioma, ancho de pantalla, tema y campaña de cada visita; y por cada
 *   vista, el día de la semana con la hora y si había sesión. Las etiquetas
 *   salen de lib/traficoRutas.ts, nunca el User-Agent tal cual.
 * - `rendimiento_dia`: Web Vitals (LCP, INP, CLS, FCP, TTFB) por día: cuántas
 *   medidas, la suma y cuántas buenas/regulares/malas.
 * - `trafico_404`: qué direcciones dan "no encontrado".
 * - `trafico_bot`: los bots que el contador descarta, por familia.
 * - `actividad_app`: qué días entra cada usuario desde la app (90 días).
 *
 * El "día" es el de Madrid. Tablas creadas solas la primera vez; nada lanza.
 */

const ZONA = "Europe/Madrid";
let tablasListas: Promise<boolean> | null = null;

export function asegurarTablas(): Promise<boolean> {
  tablasListas ??= (async () => {
    try {
      // Sin tocar nada si ya está todo (ver lib/esquema.ts: el ALTER de cada arranque
      // bloqueaba la tabla y dejaba colgado lo demás).
      const ok = await prepararTablas({
        tablas: ["trafico_dia", "trafico_origen", "actividad_usuario", "trafico_dimension", "rendimiento_dia", "trafico_404", "trafico_bot", "actividad_app"],
        ddl: [
        sql`
        CREATE TABLE IF NOT EXISTS "trafico_dia" (
          "dia" date NOT NULL,
          "ruta" text NOT NULL,
          "vistas" integer NOT NULL DEFAULT 0,
          "entradas" integer NOT NULL DEFAULT 0,
          "movil" integer NOT NULL DEFAULT 0,
          PRIMARY KEY ("dia", "ruta")
        )
      `,
        sql`
        CREATE TABLE IF NOT EXISTS "trafico_origen" (
          "dia" date NOT NULL,
          "origen" text NOT NULL,
          "entradas" integer NOT NULL DEFAULT 0,
          PRIMARY KEY ("dia", "origen")
        )
      `,
        sql`
        CREATE TABLE IF NOT EXISTS "actividad_usuario" (
          "dia" date NOT NULL,
          "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
          PRIMARY KEY ("dia", "userId")
        )
      `,
        sql`
        CREATE TABLE IF NOT EXISTS "trafico_dimension" (
          "dia" date NOT NULL,
          "tipo" text NOT NULL,
          "valor" text NOT NULL,
          "n" integer NOT NULL DEFAULT 0,
          PRIMARY KEY ("dia", "tipo", "valor")
        )
      `,
        sql`
        CREATE TABLE IF NOT EXISTS "rendimiento_dia" (
          "dia" date NOT NULL,
          "metrica" text NOT NULL,
          "n" integer NOT NULL DEFAULT 0,
          "suma" double precision NOT NULL DEFAULT 0,
          "buenas" integer NOT NULL DEFAULT 0,
          "regulares" integer NOT NULL DEFAULT 0,
          "malas" integer NOT NULL DEFAULT 0,
          PRIMARY KEY ("dia", "metrica")
        )
      `,
        sql`
        CREATE TABLE IF NOT EXISTS "trafico_404" (
          "dia" date NOT NULL,
          "ruta" text NOT NULL,
          "n" integer NOT NULL DEFAULT 0,
          PRIMARY KEY ("dia", "ruta")
        )
      `,
        sql`
        CREATE TABLE IF NOT EXISTS "trafico_bot" (
          "dia" date NOT NULL,
          "bot" text NOT NULL,
          "n" integer NOT NULL DEFAULT 0,
          PRIMARY KEY ("dia", "bot")
        )
      `,
        sql`
        CREATE TABLE IF NOT EXISTS "actividad_app" (
          "dia" date NOT NULL,
          "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
          PRIMARY KEY ("dia", "userId")
        )
      `,
        ],
      });
      if (!ok) throw new Error("tablas sin crear");
      return true;
    } catch (error) {
      console.error("[trafico] no se pudieron crear las tablas", error);
      tablasListas = null;
      return false;
    }
  })();
  return tablasListas;
}

const HOY = sql.raw(`(now() at time zone '${ZONA}')::date`);

/** Suma 1 a varias etiquetas de `trafico_dimension` de hoy, en una sola consulta. */
async function sumarDimensiones(pares: [string, string][]): Promise<void> {
  if (pares.length === 0) return;
  const filas = sql.join(
    pares.map(([tipo, valor]) => sql`(${HOY}, ${tipo}, ${valor.slice(0, 60)}, 1)`),
    sql`, `,
  );
  await db.execute(sql`
    INSERT INTO "trafico_dimension" ("dia", "tipo", "valor", "n") VALUES ${filas}
    ON CONFLICT ("dia", "tipo", "valor") DO UPDATE SET "n" = "trafico_dimension"."n" + 1
  `);
}

/** Etiquetas de la visita (solo en su primera página) para las tartas y barras de Admin → Analítica. */
export interface DimensionesVisita {
  pais: string | null;
  navegador: string;
  sistema: string;
  dispositivo: string;
  idioma: string;
  pantalla: string | null;
  tema: string | null;
  campana: string | null;
}

/** Una vista de página. `origen` y `visita` solo en la primera página de la visita. Nunca lanza. */
export async function registrarVista(v: {
  ruta: string;
  entrada: boolean;
  origen: string | null;
  movil: boolean;
  userId: string | null;
  visita?: DimensionesVisita | null;
}): Promise<void> {
  try {
    if (!(await asegurarTablas())) return;
    await db.execute(sql`
      INSERT INTO "trafico_dia" ("dia", "ruta", "vistas", "entradas", "movil")
      VALUES (${HOY}, ${v.ruta}, 1, ${v.entrada ? 1 : 0}, ${v.movil ? 1 : 0})
      ON CONFLICT ("dia", "ruta") DO UPDATE SET
        "vistas" = "trafico_dia"."vistas" + 1,
        "entradas" = "trafico_dia"."entradas" + EXCLUDED."entradas",
        "movil" = "trafico_dia"."movil" + EXCLUDED."movil"
    `);
    if (v.entrada && v.origen) {
      await db.execute(sql`
        INSERT INTO "trafico_origen" ("dia", "origen", "entradas") VALUES (${HOY}, ${v.origen}, 1)
        ON CONFLICT ("dia", "origen") DO UPDATE SET "entradas" = "trafico_origen"."entradas" + 1
      `);
    }
    if (v.userId) {
      await db.execute(sql`INSERT INTO "actividad_usuario" ("dia", "userId") VALUES (${HOY}, ${v.userId}) ON CONFLICT DO NOTHING`);
    }
    // Día de la semana (1 = lunes) y hora de Madrid, para el mapa de calor; y si había sesión.
    const ahora = new Date(new Date().toLocaleString("en-US", { timeZone: ZONA }));
    const pares: [string, string][] = [
      ["semanahora", `${((ahora.getDay() + 6) % 7) + 1}-${ahora.getHours()}`],
      ["sesion", v.userId ? "con" : "sin"],
    ];
    const d = v.entrada ? v.visita : null;
    if (d) {
      pares.push(["navegador", d.navegador], ["sistema", d.sistema], ["dispositivo", d.dispositivo], ["idioma", d.idioma]);
      if (d.pais) pares.push(["pais", d.pais]);
      if (d.pantalla) pares.push(["pantalla", d.pantalla]);
      if (d.tema) pares.push(["tema", d.tema]);
      if (d.campana) pares.push(["campana", d.campana]);
    }
    await sumarDimensiones(pares);
  } catch (error) {
    console.error("[trafico] registrar", error);
  }
}

/** Una medida de Web Vitals con la nota que le da el propio navegador. Nunca lanza. */
export async function registrarRendimiento(metrica: string, valor: number, nota: "good" | "needs-improvement" | "poor"): Promise<void> {
  try {
    if (!(await asegurarTablas())) return;
    await db.execute(sql`
      INSERT INTO "rendimiento_dia" ("dia", "metrica", "n", "suma", "buenas", "regulares", "malas")
      VALUES (${HOY}, ${metrica}, 1, ${valor}, ${nota === "good" ? 1 : 0}, ${nota === "needs-improvement" ? 1 : 0}, ${nota === "poor" ? 1 : 0})
      ON CONFLICT ("dia", "metrica") DO UPDATE SET
        "n" = "rendimiento_dia"."n" + 1,
        "suma" = "rendimiento_dia"."suma" + EXCLUDED."suma",
        "buenas" = "rendimiento_dia"."buenas" + EXCLUDED."buenas",
        "regulares" = "rendimiento_dia"."regulares" + EXCLUDED."regulares",
        "malas" = "rendimiento_dia"."malas" + EXCLUDED."malas"
    `);
  } catch (error) {
    console.error("[trafico] rendimiento", error);
  }
}

/** Una dirección que ha dado "no encontrado". Nunca lanza. */
export async function registrar404(ruta: string): Promise<void> {
  try {
    if (!(await asegurarTablas())) return;
    await db.execute(sql`
      INSERT INTO "trafico_404" ("dia", "ruta", "n") VALUES (${HOY}, ${ruta.slice(0, 120)}, 1)
      ON CONFLICT ("dia", "ruta") DO UPDATE SET "n" = "trafico_404"."n" + 1
    `);
  } catch (error) {
    console.error("[trafico] 404", error);
  }
}

/** Un aviso del contador que venía de un bot: solo se cuenta su familia. Nunca lanza. */
export async function registrarBot(bot: string): Promise<void> {
  try {
    if (!(await asegurarTablas())) return;
    await db.execute(sql`
      INSERT INTO "trafico_bot" ("dia", "bot", "n") VALUES (${HOY}, ${bot}, 1)
      ON CONFLICT ("dia", "bot") DO UPDATE SET "n" = "trafico_bot"."n" + 1
    `);
  } catch (error) {
    console.error("[trafico] bot", error);
  }
}

/**
 * El usuario ha usado la app hoy. Se llama en cada petición autenticada de
 * /api/mobile, así que se recuerda en memoria quién ya se apuntó hoy en esta
 * instancia para no escribir en la base a cada petición.
 */
const appHoy = { dia: "", vistos: new Set<string>() };
export async function registrarActividadApp(userId: string): Promise<void> {
  const dia = new Date().toLocaleDateString("sv-SE", { timeZone: ZONA });
  if (appHoy.dia !== dia) {
    appHoy.dia = dia;
    appHoy.vistos.clear();
  }
  if (appHoy.vistos.has(userId)) return;
  appHoy.vistos.add(userId);
  try {
    if (!(await asegurarTablas())) return;
    await db.execute(sql`INSERT INTO "actividad_app" ("dia", "userId") VALUES (${HOY}, ${userId}) ON CONFLICT DO NOTHING`);
  } catch (error) {
    console.error("[trafico] actividad app", error);
  }
}

export interface PuntoDia {
  dia: string;
  valor: number;
}

export interface Analitica {
  dias: number;
  vistasPorDia: (PuntoDia & { entradas: number })[];
  activosPorDia: PuntoDia[];
  altasPorDia: PuntoDia[];
  syncPorDia: (PuntoDia & { trofeos: number })[];
  totales: { vistas: number; entradas: number; movil: number; altas: number; trofeosNuevos: number; syncs: number };
  /** Lo mismo del periodo anterior de igual largo, para las variaciones. */
  anteriores: { vistas: number; entradas: number; altas: number };
  activos: { hoy: number; semana: number; mes: number };
  topRutas: { ruta: string; vistas: number; entradas: number }[];
  topOrigenes: { origen: string; entradas: number }[];
}

/** Serie de N días hasta hoy (Madrid), con los días sin datos a cero. */
function serieCompleta<T extends { dia: string }>(dias: number, filas: T[], vacio: Omit<T, "dia">): T[] {
  const porDia = new Map(filas.map((f) => [f.dia, f]));
  const hoy = new Date(new Date().toLocaleString("en-US", { timeZone: ZONA }));
  return Array.from({ length: dias }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - (dias - 1 - i));
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return porDia.get(clave) ?? ({ dia: clave, ...vacio } as T);
  });
}

/** Todo lo de Admin → Analítica para los últimos `dias` días. */
export function analitica(dias: number): Promise<Analitica> {
  return recordado(`analitica-${dias}`, 2 * 60_000, () => calcularAnalitica(dias));
}

async function calcularAnalitica(dias: number): Promise<Analitica> {
  await asegurarTablas();
  const desde = sql`${HOY} - ${dias - 1}::int`;
  const desdeAnterior = sql`${HOY} - ${2 * dias - 1}::int`;
  const numero = (v: unknown) => Number(v ?? 0);

  const [vistas, activosDia, altas, syncs, [totales], [anteriores], [activos], rutas, origenes] = await enSerie([
    db.execute<{ dia: string; vistas: number; entradas: number }>(sql`
      SELECT "dia"::text AS "dia", sum("vistas")::int AS "vistas", sum("entradas")::int AS "entradas"
      FROM "trafico_dia" WHERE "dia" >= ${desde} GROUP BY "dia"`),
    db.execute<{ dia: string; valor: number }>(sql`
      SELECT "dia"::text AS "dia", count(*)::int AS "valor" FROM "actividad_usuario" WHERE "dia" >= ${desde} GROUP BY "dia"`),
    db.execute<{ dia: string; valor: number }>(sql`
      SELECT ("createdAt" at time zone 'UTC' at time zone ${ZONA})::date::text AS "dia", count(*)::int AS "valor"
      FROM "user" WHERE ("createdAt" at time zone 'UTC' at time zone ${ZONA})::date >= ${desde} GROUP BY 1`),
    db.execute<{ dia: string; valor: number; trofeos: number }>(sql`
      SELECT ("createdAt" at time zone 'UTC' at time zone ${ZONA})::date::text AS "dia", count(*)::int AS "valor", sum("newTrophies")::int AS "trofeos"
      FROM "sync_run" WHERE ("createdAt" at time zone 'UTC' at time zone ${ZONA})::date >= ${desde} GROUP BY 1`),
    db.execute<{ vistas: number; entradas: number; movil: number }>(sql`
      SELECT coalesce(sum("vistas"), 0)::int AS "vistas", coalesce(sum("entradas"), 0)::int AS "entradas", coalesce(sum("movil"), 0)::int AS "movil"
      FROM "trafico_dia" WHERE "dia" >= ${desde}`),
    db.execute<{ vistas: number; entradas: number; altas: number }>(sql`
      SELECT
        (SELECT coalesce(sum("vistas"), 0)::int FROM "trafico_dia" WHERE "dia" >= ${desdeAnterior} AND "dia" < ${desde}) AS "vistas",
        (SELECT coalesce(sum("entradas"), 0)::int FROM "trafico_dia" WHERE "dia" >= ${desdeAnterior} AND "dia" < ${desde}) AS "entradas",
        (SELECT count(*)::int FROM "user" WHERE ("createdAt" at time zone 'UTC' at time zone ${ZONA})::date >= ${desdeAnterior}
           AND ("createdAt" at time zone 'UTC' at time zone ${ZONA})::date < ${desde}) AS "altas"`),
    db.execute<{ hoy: number; semana: number; mes: number }>(sql`
      SELECT
        count(DISTINCT "userId") FILTER (WHERE "dia" = ${HOY})::int AS "hoy",
        count(DISTINCT "userId") FILTER (WHERE "dia" > ${HOY} - 7)::int AS "semana",
        count(DISTINCT "userId") FILTER (WHERE "dia" > ${HOY} - 30)::int AS "mes"
      FROM "actividad_usuario" WHERE "dia" > ${HOY} - 30`),
    db.execute<{ ruta: string; vistas: number; entradas: number }>(sql`
      SELECT "ruta", sum("vistas")::int AS "vistas", sum("entradas")::int AS "entradas"
      FROM "trafico_dia" WHERE "dia" >= ${desde} GROUP BY "ruta" ORDER BY 2 DESC LIMIT 12`),
    db.execute<{ origen: string; entradas: number }>(sql`
      SELECT "origen", sum("entradas")::int AS "entradas"
      FROM "trafico_origen" WHERE "dia" >= ${desde} GROUP BY "origen" ORDER BY 2 DESC LIMIT 10`),
  ]);

  const syncsLista = [...syncs].map((s) => ({ dia: s.dia, valor: numero(s.valor), trofeos: numero(s.trofeos) }));
  const altasLista = [...altas].map((a) => ({ dia: a.dia, valor: numero(a.valor) }));
  return {
    dias,
    vistasPorDia: serieCompleta(dias, [...vistas].map((v) => ({ dia: v.dia, valor: numero(v.vistas), entradas: numero(v.entradas) })), { valor: 0, entradas: 0 }),
    activosPorDia: serieCompleta(dias, [...activosDia].map((a) => ({ dia: a.dia, valor: numero(a.valor) })), { valor: 0 }),
    altasPorDia: serieCompleta(dias, altasLista, { valor: 0 }),
    syncPorDia: serieCompleta(dias, syncsLista, { valor: 0, trofeos: 0 }),
    totales: {
      vistas: numero(totales?.vistas),
      entradas: numero(totales?.entradas),
      movil: numero(totales?.movil),
      altas: altasLista.reduce((s, a) => s + a.valor, 0),
      trofeosNuevos: syncsLista.reduce((s, a) => s + a.trofeos, 0),
      syncs: syncsLista.reduce((s, a) => s + a.valor, 0),
    },
    anteriores: { vistas: numero(anteriores?.vistas), entradas: numero(anteriores?.entradas), altas: numero(anteriores?.altas) },
    activos: { hoy: numero(activos?.hoy), semana: numero(activos?.semana), mes: numero(activos?.mes) },
    topRutas: [...rutas].map((r) => ({ ruta: r.ruta, vistas: numero(r.vistas), entradas: numero(r.entradas) })),
    topOrigenes: [...origenes].map((o) => ({ origen: o.origen, entradas: numero(o.entradas) })),
  };
}

/** Limpieza del cron: la actividad por usuario dura 90 días; el tráfico agregado, dos años. */
export async function limpiarTrafico(): Promise<void> {
  try {
    if (!(await asegurarTablas())) return;
    await db.execute(sql`DELETE FROM "actividad_usuario" WHERE "dia" < ${HOY} - 90`);
    await db.execute(sql`DELETE FROM "trafico_dia" WHERE "dia" < ${HOY} - 730`);
    await db.execute(sql`DELETE FROM "trafico_origen" WHERE "dia" < ${HOY} - 730`);
    await db.execute(sql`DELETE FROM "actividad_app" WHERE "dia" < ${HOY} - 90`);
    await db.execute(sql`DELETE FROM "trafico_dimension" WHERE "dia" < ${HOY} - 730`);
    await db.execute(sql`DELETE FROM "rendimiento_dia" WHERE "dia" < ${HOY} - 730`);
    await db.execute(sql`DELETE FROM "trafico_404" WHERE "dia" < ${HOY} - 180`);
    await db.execute(sql`DELETE FROM "trafico_bot" WHERE "dia" < ${HOY} - 180`);
  } catch (error) {
    console.error("[trafico] limpiar", error);
  }
}

export interface Reparto {
  valor: string;
  n: number;
}

export interface Rendimiento {
  metrica: string;
  n: number;
  media: number;
  buenas: number;
  regulares: number;
  malas: number;
}

export interface Audiencia {
  /** Etiquetas por tipo (pais, navegador, sistema...), de más a menos. */
  reparto: Record<string, Reparto[]>;
  /** [dia 1-7][hora 0-23] → vistas. */
  semanaHora: number[][];
  rendimiento: Rendimiento[];
  noEncontradas: Reparto[];
  bots: Reparto[];
  appPorDia: PuntoDia[];
  usuariosApp: number;
  usuariosWeb: number;
}

/** Lo de las secciones Audiencia, Cuándo, Rendimiento y Calidad de Admin → Analítica. */
export function audiencia(dias: number): Promise<Audiencia> {
  return recordado(`audiencia-${dias}`, 2 * 60_000, () => calcularAudiencia(dias));
}

async function calcularAudiencia(dias: number): Promise<Audiencia> {
  await asegurarTablas();
  const desde = sql`${HOY} - ${dias - 1}::int`;
  const numero = (v: unknown) => Number(v ?? 0);
  const [dims, rend, n404, bots, app, [usuarios]] = await enSerie([
    db.execute<{ tipo: string; valor: string; n: number }>(sql`
      SELECT "tipo", "valor", sum("n")::int AS "n" FROM "trafico_dimension" WHERE "dia" >= ${desde}
      GROUP BY "tipo", "valor" ORDER BY 3 DESC`),
    db.execute<{ metrica: string; n: number; suma: number; buenas: number; regulares: number; malas: number }>(sql`
      SELECT "metrica", sum("n")::int AS "n", sum("suma") AS "suma", sum("buenas")::int AS "buenas",
        sum("regulares")::int AS "regulares", sum("malas")::int AS "malas"
      FROM "rendimiento_dia" WHERE "dia" >= ${desde} GROUP BY "metrica"`),
    db.execute<{ valor: string; n: number }>(sql`
      SELECT "ruta" AS "valor", sum("n")::int AS "n" FROM "trafico_404" WHERE "dia" >= ${desde} GROUP BY 1 ORDER BY 2 DESC LIMIT 15`),
    db.execute<{ valor: string; n: number }>(sql`
      SELECT "bot" AS "valor", sum("n")::int AS "n" FROM "trafico_bot" WHERE "dia" >= ${desde} GROUP BY 1 ORDER BY 2 DESC`),
    db.execute<{ dia: string; valor: number }>(sql`
      SELECT "dia"::text AS "dia", count(*)::int AS "valor" FROM "actividad_app" WHERE "dia" >= ${desde} GROUP BY "dia"`),
    db.execute<{ app: number; web: number }>(sql`
      SELECT
        (SELECT count(DISTINCT "userId")::int FROM "actividad_app" WHERE "dia" >= ${desde}) AS "app",
        (SELECT count(DISTINCT "userId")::int FROM "actividad_usuario" WHERE "dia" >= ${desde}) AS "web"`),
  ]);

  const reparto: Record<string, Reparto[]> = {};
  const semanaHora = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const f of dims) {
    if (f.tipo === "semanahora") {
      const [d, h] = f.valor.split("-").map(Number);
      if (d >= 1 && d <= 7 && h >= 0 && h <= 23) semanaHora[d - 1][h] += numero(f.n);
      continue;
    }
    (reparto[f.tipo] ??= []).push({ valor: f.valor, n: numero(f.n) });
  }
  return {
    reparto,
    semanaHora,
    rendimiento: [...rend].map((r) => ({
      metrica: r.metrica,
      n: numero(r.n),
      media: numero(r.n) > 0 ? numero(r.suma) / numero(r.n) : 0,
      buenas: numero(r.buenas),
      regulares: numero(r.regulares),
      malas: numero(r.malas),
    })),
    noEncontradas: [...n404].map((r) => ({ valor: r.valor, n: numero(r.n) })),
    bots: [...bots].map((r) => ({ valor: r.valor, n: numero(r.n) })),
    appPorDia: serieCompleta(dias, [...app].map((a) => ({ dia: a.dia, valor: numero(a.valor) })), { valor: 0 }),
    usuariosApp: numero(usuarios?.app),
    usuariosWeb: numero(usuarios?.web),
  };
}
