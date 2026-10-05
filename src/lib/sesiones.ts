import "server-only";
import { and, asc, count, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { boostParticipants, boostSessions, gameTrophies, games, notificationLog, userGames, userTrophies, users } from "@/db/schema";
import { avatarUrlSql } from "@/lib/avatarSql";
import { avisarUsuario } from "@/lib/avisos";
import { contieneLenguajeOfensivo } from "@/lib/contentFilter";
import type { Idioma } from "@/lib/idiomasTrofeo";
import { traduccionesEnCache } from "@/lib/trofeosIdioma";

/**
 * Sesiones de trofeos online ("boosting"): muchos platinos exigen trofeos
 * multijugador y encontrar gente es lo más difícil. Alguien publica "necesito
 * 3 personas para X el sábado a las 21:00", otros se apuntan y a todos les
 * llega un recordatorio una hora antes (cron → `recordarSesiones`).
 *
 * Plazas: en la interfaz se habla SIEMPRE del total contando a quien organiza
 * ("4 plazas" = tú + 3 libres). En la base, `boost_session.plazas` sigue
 * guardando solo los huecos para otros (como desde el principio), así que
 * no hizo falta migrar nada: total = plazas + 1.
 */

export class SesionError extends Error {}

/** Total de plazas contando a quien organiza. */
export const MIN_PLAZAS_TOTALES = 2;
export const MAX_PLAZAS_TOTALES = 16;
const MAX_DIAS_ANTELACION = 60;

interface Persona {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
}

export interface SesionVista {
  id: string;
  /** Nombre del trofeo en el idioma de quien mira si está en caché; si no, el guardado. */
  trofeo: string;
  /** Datos del trofeo si casa con uno del juego (los de texto libre no). */
  trofeoInfo: { iconUrl: string | null; grade: string | null; detail: string } | null;
  descripcion: string | null;
  fechaHora: Date;
  /** Total contando a quien organiza. */
  plazasTotales: number;
  /** Anfitrión + apuntados. */
  ocupadas: number;
  libres: number;
  cancelada: boolean;
  juego: { id: string; titulo: string; iconUrl: string | null; platform: string; deviceLabel: string; igdbId: number | null };
  anfitrion: Persona;
  participantes: Persona[];
  soyAnfitrion: boolean;
  estoyApuntado: boolean;
  /** Si quien mira tiene ese juego en su biblioteca (mismo igdbId o mismo id). */
  loTengo: boolean;
}

export async function crearSesion(
  hostId: string,
  datos: { gameId: string; trophyId?: string | null; trofeo: string; descripcion: string; fechaHora: Date; plazasTotales: number },
): Promise<string> {
  let trofeo = datos.trofeo.trim();
  // Elegido de la lista: se guarda el nombre ORIGINAL del juego (el que casa
  // con game_trophy.name), no el traducido, para poder enseñar su icono y
  // traducirlo a quien mire en otro idioma.
  if (datos.trophyId) {
    const [def] = await db
      .select({ name: gameTrophies.name })
      .from(gameTrophies)
      .where(and(eq(gameTrophies.gameId, datos.gameId), eq(gameTrophies.trophyId, datos.trophyId)))
      .limit(1);
    if (!def) throw new SesionError("Ese trofeo no es de este juego.");
    trofeo = def.name.trim().slice(0, 120);
  }
  const descripcion = datos.descripcion.trim();
  if (trofeo.length < 3 || trofeo.length > 120) throw new SesionError("Di qué trofeo o logro vais a por él (3-120 caracteres).");
  if (descripcion.length > 500) throw new SesionError("La descripción puede tener como mucho 500 caracteres.");
  if (contieneLenguajeOfensivo(trofeo) || contieneLenguajeOfensivo(descripcion)) {
    throw new SesionError("Ese texto contiene lenguaje ofensivo — cámbialo e inténtalo de nuevo.");
  }
  if (!Number.isInteger(datos.plazasTotales) || datos.plazasTotales < MIN_PLAZAS_TOTALES || datos.plazasTotales > MAX_PLAZAS_TOTALES) {
    throw new SesionError(`Entre ${MIN_PLAZAS_TOTALES} y ${MAX_PLAZAS_TOTALES} plazas en total, contándote a ti.`);
  }
  const ahora = Date.now();
  if (Number.isNaN(datos.fechaHora.getTime()) || datos.fechaHora.getTime() < ahora + 10 * 60_000) {
    throw new SesionError("La sesión tiene que ser dentro de al menos 10 minutos.");
  }
  if (datos.fechaHora.getTime() > ahora + MAX_DIAS_ANTELACION * 86_400_000) {
    throw new SesionError(`Como mucho con ${MAX_DIAS_ANTELACION} días de antelación.`);
  }
  // Solo de juegos que tienes: quien organiza tiene que poder jugarlo.
  const [propio] = await db
    .select({ gameId: userGames.gameId })
    .from(userGames)
    .where(and(eq(userGames.userId, hostId), eq(userGames.gameId, datos.gameId), eq(userGames.isWishlist, false)))
    .limit(1);
  if (!propio) throw new SesionError("Solo puedes organizar sesiones de juegos de tu biblioteca.");

  const [fila] = await db
    .insert(boostSessions)
    .values({ hostId, gameId: datos.gameId, trofeo, descripcion: descripcion || null, fechaHora: datos.fechaHora, plazas: datos.plazasTotales - 1 })
    .returning({ id: boostSessions.id });
  return fila.id;
}

/**
 * Próximas sesiones (y las que empezaron hace menos de 2 h), más cercanas
 * primero. Con `soloId`, esa sesión sea cual sea su estado (la ficha).
 */
export async function listarSesiones(userId: string | null, idioma: Idioma, soloId?: string): Promise<SesionVista[]> {
  const desde = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const filas = await db
    .select({
      id: boostSessions.id,
      trofeo: boostSessions.trofeo,
      descripcion: boostSessions.descripcion,
      fechaHora: boostSessions.fechaHora,
      plazas: boostSessions.plazas,
      cancelada: boostSessions.cancelada,
      hostId: boostSessions.hostId,
      gameId: games.id,
      titulo: games.title,
      iconUrl: games.iconUrl,
      platform: games.platform,
      deviceLabel: games.deviceLabel,
      igdbId: games.igdbId,
      hostHandle: users.handle,
      hostName: users.name,
      hostImage: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
    })
    .from(boostSessions)
    .innerJoin(games, eq(games.id, boostSessions.gameId))
    .innerJoin(users, eq(users.id, boostSessions.hostId))
    .where(
      soloId
        ? eq(boostSessions.id, soloId)
        : and(eq(boostSessions.cancelada, false), gt(boostSessions.fechaHora, desde)),
    )
    .orderBy(asc(boostSessions.fechaHora))
    .limit(50);
  if (filas.length === 0) return [];

  const ids = filas.map((f) => f.id);
  const [participantes, definiciones] = await Promise.all([
    db
      .select({
        sessionId: boostParticipants.sessionId,
        userId: users.id,
        handle: users.handle,
        name: users.name,
        image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
      })
      .from(boostParticipants)
      .innerJoin(users, eq(users.id, boostParticipants.userId))
      .where(inArray(boostParticipants.sessionId, ids))
      .orderBy(asc(boostParticipants.joinedAt)),
    // El trofeo elegido de la lista se guarda con su nombre original: así se
    // encuentra su icono y su traducción. Los escritos a mano no casan y se
    // enseñan tal cual.
    db
      .select({
        gameId: gameTrophies.gameId,
        trophyId: gameTrophies.trophyId,
        name: gameTrophies.name,
        detail: gameTrophies.detail,
        grade: gameTrophies.grade,
        iconUrl: gameTrophies.iconUrl,
      })
      .from(gameTrophies)
      .where(
        and(
          inArray(gameTrophies.gameId, [...new Set(filas.map((f) => f.gameId))]),
          inArray(gameTrophies.name, [...new Set(filas.map((f) => f.trofeo))]),
        ),
      ),
  ]);
  const defPorClave = new Map(definiciones.map((d) => [`${d.gameId}\u0000${d.name}`, d]));
  const traducciones = await traduccionesEnCache(
    definiciones.map((d) => ({ gameId: d.gameId, trophyId: d.trophyId })),
    idioma,
  );

  // Juegos de quien mira, para marcar "lo tienes" (por igdbId: el mismo
  // juego en otra plataforma también cuenta) y ordenar esos primero.
  const mios = userId
    ? await db
        .select({ gameId: userGames.gameId, igdbId: games.igdbId })
        .from(userGames)
        .innerJoin(games, eq(games.id, userGames.gameId))
        .where(and(eq(userGames.userId, userId), eq(userGames.isWishlist, false)))
    : [];
  const misIds = new Set(mios.map((m) => m.gameId));
  const misIgdb = new Set(mios.map((m) => m.igdbId).filter((x): x is number => x !== null));

  return filas.map((f) => {
    const suyos = participantes.filter((p) => p.sessionId === f.id);
    const def = defPorClave.get(`${f.gameId}\u0000${f.trofeo}`);
    const traducido = def ? traducciones.get(`${def.gameId}:${def.trophyId}`) : undefined;
    const plazasTotales = f.plazas + 1;
    const ocupadas = suyos.length + 1;
    return {
      id: f.id,
      trofeo: traducido?.name ?? f.trofeo,
      trofeoInfo: def ? { iconUrl: def.iconUrl, grade: def.grade, detail: traducido?.detail || def.detail } : null,
      descripcion: f.descripcion,
      fechaHora: f.fechaHora,
      plazasTotales,
      ocupadas,
      libres: Math.max(0, plazasTotales - ocupadas),
      cancelada: f.cancelada,
      juego: { id: f.gameId, titulo: f.titulo, iconUrl: f.iconUrl, platform: f.platform, deviceLabel: f.deviceLabel, igdbId: f.igdbId },
      anfitrion: { userId: f.hostId, handle: f.hostHandle, name: f.hostName, image: f.hostImage },
      participantes: suyos.map(({ sessionId: _s, ...p }) => p),
      soyAnfitrion: f.hostId === userId,
      estoyApuntado: suyos.some((p) => p.userId === userId),
      loTengo: misIds.has(f.gameId) || (f.igdbId !== null && misIgdb.has(f.igdbId)),
    };
  });
}

/**
 * Trofeos que le faltan a `userId` en ese juego, para elegir uno al
 * organizar. Lista vacía = el juego no tiene trofeos guardados (manual,
 * Epic...) o ya los tiene todos: entonces se escribe a mano.
 */
export async function trofeosPendientes(
  userId: string,
  gameId: string,
  idioma: Idioma,
): Promise<{ trophyId: string; name: string; grade: string | null; iconUrl: string | null; grupo: string | null }[]> {
  const filas = await db
    .select({
      trophyId: gameTrophies.trophyId,
      name: gameTrophies.name,
      grade: gameTrophies.grade,
      iconUrl: gameTrophies.iconUrl,
      groupId: gameTrophies.groupId,
      groupName: gameTrophies.groupName,
    })
    .from(gameTrophies)
    .leftJoin(
      userTrophies,
      and(eq(userTrophies.userId, userId), eq(userTrophies.gameId, gameTrophies.gameId), eq(userTrophies.trophyId, gameTrophies.trophyId)),
    )
    .where(and(eq(gameTrophies.gameId, gameId), sql`coalesce(${userTrophies.earned}, false) = false`));
  const traducciones = await traduccionesEnCache(filas.map((f) => ({ gameId, trophyId: f.trophyId })), idioma);
  return filas
    .sort(
      (a, b) =>
        Number(a.groupId !== "default") - Number(b.groupId !== "default") ||
        a.groupId.localeCompare(b.groupId) ||
        a.trophyId.localeCompare(b.trophyId, undefined, { numeric: true }),
    )
    .map((f) => {
      const tr = traducciones.get(`${gameId}:${f.trophyId}`);
      return {
        trophyId: f.trophyId,
        name: tr?.name ?? f.name,
        grade: f.grade,
        iconUrl: f.iconUrl,
        grupo: f.groupId === "default" ? null : (tr?.groupName ?? f.groupName ?? f.groupId),
      };
    });
}

async function sesionBasica(sessionId: string) {
  const [s] = await db.select().from(boostSessions).where(eq(boostSessions.id, sessionId)).limit(1);
  return s ?? null;
}

/** "Mario (@mario)", "@mario" o "Mario": quién es, sin ambigüedad, en los avisos. */
function quienEs(u: { name: string | null; handle: string | null } | undefined): string {
  const nombre = u?.name?.trim().split(/\s+/)[0];
  if (nombre && u?.handle) return `${nombre} (@${u.handle})`;
  return nombre || (u?.handle ? `@${u.handle}` : "Alguien");
}

/** Lo que ven los avisos: juego, consola y quién hay dentro. */
async function contextoAviso(s: { id: string; gameId: string; hostId: string }) {
  const [[juego], dentro] = await Promise.all([
    db.select({ titulo: games.title, deviceLabel: games.deviceLabel }).from(games).where(eq(games.id, s.gameId)).limit(1),
    db
      .select({ userId: users.id, name: users.name, handle: users.handle })
      .from(boostParticipants)
      .innerJoin(users, eq(users.id, boostParticipants.userId))
      .where(eq(boostParticipants.sessionId, s.id))
      .orderBy(asc(boostParticipants.joinedAt)),
  ]);
  return { juego: juego ? `${juego.titulo} (${juego.deviceLabel})` : "", dentro };
}

export async function apuntarse(userId: string, sessionId: string): Promise<void> {
  const s = await sesionBasica(sessionId);
  if (!s || s.cancelada || s.fechaHora.getTime() < Date.now()) throw new SesionError("Esa sesión ya no está abierta.");
  if (s.hostId === userId) throw new SesionError("Es tu propia sesión.");
  const [{ n }] = await db.select({ n: count() }).from(boostParticipants).where(eq(boostParticipants.sessionId, sessionId));
  if (Number(n) >= s.plazas) throw new SesionError("Ya no quedan plazas.");

  const insertadas = await db.insert(boostParticipants).values({ sessionId, userId }).onConflictDoNothing().returning({ userId: boostParticipants.userId });
  if (insertadas.length === 0) return;

  const [[yo], [host], ctx] = await Promise.all([
    db.select({ name: users.name, handle: users.handle }).from(users).where(eq(users.id, userId)).limit(1),
    db.select({ name: users.name, handle: users.handle }).from(users).where(eq(users.id, s.hostId)).limit(1),
    contextoAviso(s),
  ]);
  const quien = quienEs(yo);
  const total = s.plazas + 1;
  const ocupadas = ctx.dentro.length + 1;
  const libres = Math.max(0, total - ocupadas);
  const lista = [`${quienEs(host)} (organiza)`, ...ctx.dentro.map(quienEs)].join(", ");
  const texto =
    `${ctx.juego} · «${s.trofeo}»\n` +
    `${ocupadas}/${total} plazas ocupadas · ${libres === 0 ? "¡completa!" : libres === 1 ? "queda 1 libre" : `quedan ${libres} libres`}\n` +
    `Dentro: ${lista}`;
  const ruta = `/sesiones/${s.id}`;

  // A quien organiza y a los que ya estaban dentro (no a quien se acaba de unir).
  const destinatarios = [s.hostId, ...ctx.dentro.map((d) => d.userId).filter((id) => id !== userId)];
  await Promise.all(
    destinatarios.map((id) =>
      avisarUsuario(id, {
        titulo: id === s.hostId ? `🎮 ${quien} se ha unido a tu sesión` : `🎮 ${quien} se ha unido a la sesión`,
        texto,
        ruta,
      }, "social"),
    ),
  );
}

export async function salirse(userId: string, sessionId: string): Promise<void> {
  const borradas = await db
    .delete(boostParticipants)
    .where(and(eq(boostParticipants.sessionId, sessionId), eq(boostParticipants.userId, userId)))
    .returning({ userId: boostParticipants.userId });
  if (borradas.length === 0) return;
  const s = await sesionBasica(sessionId);
  if (!s || s.cancelada || s.fechaHora.getTime() < Date.now()) return;
  const [[yo], ctx] = await Promise.all([
    db.select({ name: users.name, handle: users.handle }).from(users).where(eq(users.id, userId)).limit(1),
    contextoAviso(s),
  ]);
  const total = s.plazas + 1;
  const ocupadas = ctx.dentro.length + 1;
  await avisarUsuario(s.hostId, {
    titulo: `👋 ${quienEs(yo)} se ha salido de tu sesión`,
    texto: `${ctx.juego} · «${s.trofeo}»\n${ocupadas}/${total} plazas ocupadas · ${total - ocupadas} libres`,
    ruta: `/sesiones/${s.id}`,
  }, "social");
}

export async function cancelarSesion(userId: string, sessionId: string): Promise<void> {
  const s = await sesionBasica(sessionId);
  if (!s || s.hostId !== userId) throw new SesionError("Solo quien la organiza puede cancelarla.");
  if (s.cancelada) return;
  await db.update(boostSessions).set({ cancelada: true }).where(eq(boostSessions.id, sessionId));
  const apuntados = await db.select({ userId: boostParticipants.userId }).from(boostParticipants).where(eq(boostParticipants.sessionId, sessionId));
  await Promise.all(
    apuntados.map((p) =>
      avisarUsuario(p.userId, { titulo: "❌ Sesión cancelada", texto: `Se ha cancelado la sesión de «${s.trofeo}».`, ruta: `/sesiones/${s.id}` }),
    ),
  );
}

/** Cron: recordatorio a anfitrión y apuntados de las sesiones que empiezan en la próxima hora. */
export async function recordarSesiones(hasta: number): Promise<number> {
  const ahora = new Date();
  const enUnaHora = new Date(ahora.getTime() + 60 * 60_000);
  const proximas = await db
    .select({ id: boostSessions.id, hostId: boostSessions.hostId, trofeo: boostSessions.trofeo, fechaHora: boostSessions.fechaHora, titulo: games.title })
    .from(boostSessions)
    .innerJoin(games, eq(games.id, boostSessions.gameId))
    .where(
      and(
        eq(boostSessions.cancelada, false),
        gt(boostSessions.fechaHora, ahora),
        sql`${boostSessions.fechaHora} <= ${enUnaHora.toISOString()}::timestamp`,
      ),
    );

  let enviados = 0;
  for (const s of proximas) {
    if (Date.now() > hasta) break;
    const apuntados = await db.select({ userId: boostParticipants.userId }).from(boostParticipants).where(eq(boostParticipants.sessionId, s.id));
    const minutos = Math.max(1, Math.round((s.fechaHora.getTime() - Date.now()) / 60_000));
    for (const userId of [s.hostId, ...apuntados.map((a) => a.userId)]) {
      const [nuevo] = await db
        .insert(notificationLog)
        .values({ userId, tipo: "sesion", clave: s.id })
        .onConflictDoNothing()
        .returning({ userId: notificationLog.userId });
      if (!nuevo) continue;
      await avisarUsuario(userId, {
        titulo: `⏰ Sesión en ${minutos} min: ${s.titulo}`,
        texto: `«${s.trofeo}» con ${apuntados.length + 1} personas.`,
        ruta: `/sesiones/${s.id}`,
      }, "social");
      enviados++;
    }
  }
  return enviados;
}
