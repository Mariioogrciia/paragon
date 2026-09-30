import "server-only";
import { and, desc, eq, gte, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  boostParticipants,
  boostSessions,
  gameTrophies,
  games,
  trophyCaseAwards,
  userBadges,
  userTrophies,
  users,
} from "@/db/schema";
import { avatarUrlSql } from "@/lib/avatarSql";
import { listFriends } from "@/lib/profiles";

/**
 * Lo que hace que Comunidad no sea solo un muro de reseñas: hitos (insignias
 * y títulos de liga, que no son una `activity` porque no van ligados a un
 * juego) y los destacados de la semana. Siempre solo de perfiles públicos,
 * salvo lo propio.
 */

const HACE_7_DIAS = () => new Date(Date.now() - 7 * 86_400_000);
const HACE_30_DIAS = () => new Date(Date.now() - 30 * 86_400_000);

const autor = {
  id: users.id,
  handle: users.handle,
  name: users.name,
  image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
  titulo: users.tituloDesbloqueado,
};

export type Hito =
  | { tipo: "insignia"; id: string; createdAt: Date; user: HitoAutor; insigniaIds: string[] }
  | { tipo: "palmares"; id: string; createdAt: Date; user: HitoAutor; titulo: string; rank: number };

interface HitoAutor {
  id: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  titulo: string | null;
}

/** Insignias y palmarés de los últimos 30 días, tuyos y de tus amigos (o de todos con perfil público). */
export async function getHitos(userId: string, { global = false, limite = 30 }: { global?: boolean; limite?: number } = {}): Promise<Hito[]> {
  const ids = global ? null : [userId, ...(await listFriends(userId)).map((f) => f.userId)];
  const quien = (col: typeof userBadges.userId | typeof trophyCaseAwards.userId) =>
    ids ? inArray(col, ids) : or(eq(users.isPublicProfile, true), eq(col, userId));

  const [insignias, palmares] = await Promise.all([
    db
      .select({ userId: userBadges.userId, badgeId: userBadges.badgeId, earnedAt: userBadges.earnedAt, user: autor })
      .from(userBadges)
      .innerJoin(users, eq(users.id, userBadges.userId))
      // "Pionero" se la lleva todo el mundo al entrar: no es noticia.
      .where(and(quien(userBadges.userId), gte(userBadges.earnedAt, HACE_30_DIAS()), ne(userBadges.badgeId, "madrugador")))
      .orderBy(desc(userBadges.earnedAt))
      .limit(limite),
    db
      .select({ id: trophyCaseAwards.id, titulo: trophyCaseAwards.titulo, rank: trophyCaseAwards.rank, earnedAt: trophyCaseAwards.earnedAt, user: autor })
      .from(trophyCaseAwards)
      .innerJoin(users, eq(users.id, trophyCaseAwards.userId))
      .where(and(quien(trophyCaseAwards.userId), gte(trophyCaseAwards.earnedAt, HACE_30_DIAS())))
      .orderBy(desc(trophyCaseAwards.earnedAt))
      .limit(limite),
  ]);

  // Las de una misma persona el mismo día van en una sola tarjeta: al
  // sincronizar se otorgan varias de golpe y, sueltas, llenaban el muro.
  const porPersonaYDia = new Map<string, Extract<Hito, { tipo: "insignia" }>>();
  for (const i of insignias) {
    const clave = `${i.userId}-${i.earnedAt.toISOString().slice(0, 10)}`;
    const grupo = porPersonaYDia.get(clave);
    if (grupo) grupo.insigniaIds.push(i.badgeId);
    else porPersonaYDia.set(clave, { tipo: "insignia", id: `insignias-${clave}`, createdAt: i.earnedAt, user: i.user, insigniaIds: [i.badgeId] });
  }

  return [
    ...porPersonaYDia.values(),
    ...palmares.map((p) => ({ tipo: "palmares" as const, id: `palmares-${p.id}`, createdAt: p.earnedAt, user: p.user, titulo: p.titulo, rank: p.rank })),
  ];
}

export interface DestacadosSemana {
  platino: { user: HitoAutor; gameId: string; juego: string; iconUrl: string | null; rareza: number | null } | null;
  cazadores: { user: HitoAutor; trofeos: number }[];
  tendencias: { gameId: string; igdbId: number | null; juego: string; iconUrl: string | null; cazadores: number }[];
  sesiones: { id: string; juego: string; iconUrl: string | null; trofeo: string; fechaHora: Date; plazasLibres: number; host: string | null }[];
}

/** Barra lateral de Comunidad: lo mejor de los últimos 7 días (perfiles públicos) y las próximas sesiones. */
export async function getDestacadosSemana(): Promise<DestacadosSemana> {
  const desde = HACE_7_DIAS();
  const publicoYGanado = and(eq(users.isPublicProfile, true), eq(userTrophies.earned, true), gte(userTrophies.earnedAt, desde));

  const [platinos, cazadores, tendencias] = await Promise.all([
    db
      .select({ user: autor, gameId: games.id, juego: games.title, iconUrl: games.iconUrl, rareza: userTrophies.rarityPercent })
      .from(userTrophies)
      .innerJoin(gameTrophies, and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)))
      .innerJoin(users, eq(users.id, userTrophies.userId))
      .innerJoin(games, eq(games.id, userTrophies.gameId))
      .where(and(publicoYGanado, eq(gameTrophies.grade, "platinum")))
      .orderBy(sql`${userTrophies.rarityPercent} asc nulls last`)
      .limit(1),
    db
      .select({ user: autor, trofeos: sql<number>`count(*)` })
      .from(userTrophies)
      .innerJoin(users, eq(users.id, userTrophies.userId))
      .where(publicoYGanado)
      .groupBy(users.id, users.handle, users.name, users.image, users.avatarPersonalizado, users.tituloDesbloqueado)
      .orderBy(sql`count(*) desc`)
      .limit(5),
    db
      .select({ gameId: games.id, igdbId: games.igdbId, juego: games.title, iconUrl: games.iconUrl, cazadores: sql<number>`count(distinct ${userTrophies.userId})` })
      .from(userTrophies)
      .innerJoin(users, eq(users.id, userTrophies.userId))
      .innerJoin(games, eq(games.id, userTrophies.gameId))
      .where(publicoYGanado)
      .groupBy(games.id, games.igdbId, games.title, games.iconUrl)
      .orderBy(sql`count(distinct ${userTrophies.userId}) desc`, sql`count(*) desc`)
      .limit(5),
  ]);

  const sesiones = await db
    .select({
      id: boostSessions.id,
      juego: games.title,
      iconUrl: games.iconUrl,
      trofeo: boostSessions.trofeo,
      fechaHora: boostSessions.fechaHora,
      plazas: boostSessions.plazas,
      host: users.handle,
      apuntados: sql<number>`(select count(*) from ${boostParticipants} p where p."sessionId" = ${boostSessions.id})`,
    })
    .from(boostSessions)
    .innerJoin(games, eq(games.id, boostSessions.gameId))
    .innerJoin(users, eq(users.id, boostSessions.hostId))
    .where(and(eq(boostSessions.cancelada, false), gte(boostSessions.fechaHora, new Date())))
    .orderBy(boostSessions.fechaHora)
    .limit(3);

  return {
    platino: platinos[0]
      ? { ...platinos[0], rareza: platinos[0].rareza === null ? null : Number(platinos[0].rareza) }
      : null,
    cazadores: cazadores.map((c) => ({ user: c.user, trofeos: Number(c.trofeos) })),
    tendencias: tendencias.map((t) => ({ ...t, cazadores: Number(t.cazadores) })),
    sesiones: sesiones.map((s) => ({
      id: s.id,
      juego: s.juego,
      iconUrl: s.iconUrl,
      trofeo: s.trofeo,
      fechaHora: s.fechaHora,
      plazasLibres: Math.max(0, s.plazas - Number(s.apuntados)),
      host: s.host,
    })),
  };
}
