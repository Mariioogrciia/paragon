import "server-only";
import { and, asc, count, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { boostParticipants, boostSessions, games, notificationLog, userGames, users } from "@/db/schema";
import { avatarUrlSql } from "@/lib/avatarSql";
import { avisarUsuario } from "@/lib/avisos";
import { contieneLenguajeOfensivo } from "@/lib/contentFilter";

/**
 * Sesiones de trofeos online ("boosting"): muchos platinos exigen trofeos
 * multijugador y encontrar gente es lo más difícil. Alguien publica "necesito
 * 3 personas para X el sábado a las 21:00", otros se apuntan y a todos les
 * llega un recordatorio una hora antes (cron → `recordarSesiones`).
 */

export class SesionError extends Error {}

export const MAX_PLAZAS = 16;
const MAX_DIAS_ANTELACION = 60;

export interface SesionVista {
  id: string;
  trofeo: string;
  descripcion: string | null;
  fechaHora: Date;
  plazas: number;
  apuntados: number;
  juego: { id: string; titulo: string; iconUrl: string | null; platform: string; igdbId: number | null };
  anfitrion: { userId: string; handle: string | null; name: string | null; image: string | null };
  participantes: { userId: string; handle: string | null; name: string | null; image: string | null }[];
  soyAnfitrion: boolean;
  estoyApuntado: boolean;
  /** Si quien mira tiene ese juego en su biblioteca (mismo igdbId o mismo id). */
  loTengo: boolean;
}

export async function crearSesion(
  hostId: string,
  datos: { gameId: string; trofeo: string; descripcion: string; fechaHora: Date; plazas: number },
): Promise<string> {
  const trofeo = datos.trofeo.trim();
  const descripcion = datos.descripcion.trim();
  if (trofeo.length < 3 || trofeo.length > 120) throw new SesionError("Di qué trofeo o logro vais a por él (3-120 caracteres).");
  if (descripcion.length > 500) throw new SesionError("La descripción puede tener como mucho 500 caracteres.");
  if (contieneLenguajeOfensivo(trofeo) || contieneLenguajeOfensivo(descripcion)) {
    throw new SesionError("Ese texto contiene lenguaje ofensivo — cámbialo e inténtalo de nuevo.");
  }
  if (!Number.isInteger(datos.plazas) || datos.plazas < 1 || datos.plazas > MAX_PLAZAS) {
    throw new SesionError(`Entre 1 y ${MAX_PLAZAS} plazas.`);
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
    .values({ hostId, gameId: datos.gameId, trofeo, descripcion: descripcion || null, fechaHora: datos.fechaHora, plazas: datos.plazas })
    .returning({ id: boostSessions.id });
  return fila.id;
}

/** Próximas sesiones (y las que empezaron hace menos de 2 h), más cercanas primero. */
export async function listarSesiones(userId: string | null, soloId?: string): Promise<SesionVista[]> {
  const desde = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const filas = await db
    .select({
      id: boostSessions.id,
      trofeo: boostSessions.trofeo,
      descripcion: boostSessions.descripcion,
      fechaHora: boostSessions.fechaHora,
      plazas: boostSessions.plazas,
      hostId: boostSessions.hostId,
      gameId: games.id,
      titulo: games.title,
      iconUrl: games.iconUrl,
      platform: games.platform,
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
  const participantes = await db
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
    .orderBy(asc(boostParticipants.joinedAt));

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
    return {
      id: f.id,
      trofeo: f.trofeo,
      descripcion: f.descripcion,
      fechaHora: f.fechaHora,
      plazas: f.plazas,
      apuntados: suyos.length,
      juego: { id: f.gameId, titulo: f.titulo, iconUrl: f.iconUrl, platform: f.platform, igdbId: f.igdbId },
      anfitrion: { userId: f.hostId, handle: f.hostHandle, name: f.hostName, image: f.hostImage },
      participantes: suyos.map(({ sessionId: _s, ...p }) => p),
      soyAnfitrion: f.hostId === userId,
      estoyApuntado: suyos.some((p) => p.userId === userId),
      loTengo: misIds.has(f.gameId) || (f.igdbId !== null && misIgdb.has(f.igdbId)),
    };
  });
}

async function sesionBasica(sessionId: string) {
  const [s] = await db.select().from(boostSessions).where(eq(boostSessions.id, sessionId)).limit(1);
  return s ?? null;
}

export async function apuntarse(userId: string, sessionId: string): Promise<void> {
  const s = await sesionBasica(sessionId);
  if (!s || s.cancelada || s.fechaHora.getTime() < Date.now()) throw new SesionError("Esa sesión ya no está abierta.");
  if (s.hostId === userId) throw new SesionError("Es tu propia sesión.");
  const [{ n }] = await db.select({ n: count() }).from(boostParticipants).where(eq(boostParticipants.sessionId, sessionId));
  if (Number(n) >= s.plazas) throw new SesionError("Ya no quedan plazas.");

  const insertadas = await db.insert(boostParticipants).values({ sessionId, userId }).onConflictDoNothing().returning({ userId: boostParticipants.userId });
  if (insertadas.length === 0) return;

  const [yo] = await db.select({ name: users.name, handle: users.handle }).from(users).where(eq(users.id, userId)).limit(1);
  const nombre = yo?.name?.trim().split(/\s+/)[0] || (yo?.handle ? `@${yo.handle}` : "Alguien");
  await avisarUsuario(s.hostId, {
    titulo: `🎮 ${nombre} se apunta a tu sesión`,
    texto: `«${s.trofeo}» — ${Number(n) + 1} de ${s.plazas} plazas cubiertas.`,
    ruta: `/sesiones#${s.id}`,
  });
}

export async function salirse(userId: string, sessionId: string): Promise<void> {
  await db.delete(boostParticipants).where(and(eq(boostParticipants.sessionId, sessionId), eq(boostParticipants.userId, userId)));
}

export async function cancelarSesion(userId: string, sessionId: string): Promise<void> {
  const s = await sesionBasica(sessionId);
  if (!s || s.hostId !== userId) throw new SesionError("Solo quien la organiza puede cancelarla.");
  if (s.cancelada) return;
  await db.update(boostSessions).set({ cancelada: true }).where(eq(boostSessions.id, sessionId));
  const apuntados = await db.select({ userId: boostParticipants.userId }).from(boostParticipants).where(eq(boostParticipants.sessionId, sessionId));
  await Promise.all(
    apuntados.map((p) =>
      avisarUsuario(p.userId, { titulo: "❌ Sesión cancelada", texto: `Se ha cancelado la sesión de «${s.trofeo}».`, ruta: "/sesiones" }),
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
        ruta: `/sesiones#${s.id}`,
      });
      enviados++;
    }
  }
  return enviados;
}
