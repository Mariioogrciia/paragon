import "server-only";
import { db } from "@/db";
import { clans, clanMembers, clanInvites, games, gameTrophies, userTrophies, activities, users } from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { trophyScore } from "./trophyScore";
import { errorSiOfensivo } from "./contentFilter";
import { avatarUrlSql } from "./avatarSql";
import { listFriends } from "./profiles";
import { enviarPush } from "./webPush";
import { enviarPushFcm } from "./fcm";
import type { TrophyGrade } from "./types";

/**
 * Crea un clan nuevo y asigna al creador como 'owner'.
 */
export async function createClan(
  userId: string,
  name: string,
  tag: string,
  description: string
) {
  // Aquí asumo que ya se validó que el usuario es nivel 5 en la ruta de API/Action
  const nombreOfensivo = errorSiOfensivo(name);
  if (nombreOfensivo) throw new Error(nombreOfensivo);
  const tagOfensivo = errorSiOfensivo(tag);
  if (tagOfensivo) throw new Error(tagOfensivo);
  if (description) {
    const descOfensiva = errorSiOfensivo(description);
    if (descOfensiva) throw new Error(descOfensiva);
  }

  const tagUpper = tag.toUpperCase();
  const [newClan] = await db
    .insert(clans)
    .values({ name, tag: tagUpper, description, ownerId: userId })
    .returning();

  await db
    .insert(clanMembers)
    .values({ clanId: newClan.id, userId, role: "owner" });

  return newClan;
}

/**
 * Une un usuario a un clan. Falla silenciosamente (o con error de DB) si ya está en uno,
 * porque la clave primaria compuesta evita que esté dos veces.
 */
export async function joinClan(userId: string, clanId: string) {
  // Comprobar si ya está en otro clan. No es suficiente por sí solo (dos
  // clics casi simultáneos podrían pasar los dos esta comprobación): el
  // índice único en clan_members.userId (scripts/crear-tabla-clanes.mts) es
  // quien de verdad lo impide a nivel de base de datos; aquí solo se
  // convierte ese rechazo en un mensaje legible.
  const current = await getUserClan(userId);
  if (current) throw new Error("Ya estás en un clan");

  try {
    await db.insert(clanMembers).values({ clanId, userId, role: "member" });
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
      throw new Error("Ya estás en un clan");
    }
    throw err;
  }
}

export async function leaveClan(userId: string, clanId: string) {
  const membership = await db
    .select()
    .from(clanMembers)
    .where(and(eq(clanMembers.clanId, clanId), eq(clanMembers.userId, userId)))
    .limit(1);

  if (membership.length === 0) return;

  if (membership[0].role === "owner") {
    // Para simplificar: si el owner se va, borramos el clan entero.
    await db.delete(clans).where(eq(clans.id, clanId));
  } else {
    await db
      .delete(clanMembers)
      .where(and(eq(clanMembers.clanId, clanId), eq(clanMembers.userId, userId)));
  }
}

export async function getClanByTag(tag: string) {
  const [clan] = await db
    .select()
    .from(clans)
    .where(eq(clans.tag, tag.toUpperCase()))
    .limit(1);
  return clan || null;
}

export async function getUserClan(userId: string) {
  const [membership] = await db
    .select({
      clan: clans,
      role: clanMembers.role,
    })
    .from(clanMembers)
    .innerJoin(clans, eq(clanMembers.clanId, clans.id))
    .where(eq(clanMembers.userId, userId))
    .limit(1);

  return membership || null;
}

export async function getClanMembers(clanId: string) {
  return await db
    .select()
    .from(clanMembers)
    .where(eq(clanMembers.clanId, clanId));
}

export interface ClanLeaderboardEntry {
  userId: string;
  role: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  score: number;
  trofeos: number;
}

/**
 * Ranking interno del clan: cada miembro con su Paragon Score (trofeo a
 * trofeo, misma fórmula unificada entre plataformas de
 * `lib/paragonScore.ts`) y su recuento de trofeos, ordenado de mayor a
 * menor — "quién está carreando".
 *
 * La versión original de `getClanScore` (ahora sustituida) no compilaba:
 * leía columnas que no existen en el esquema (`userGames.earnedPlatinum` y
 * compañía — el desglose por metal vive en el jsonb `earned`, no en
 * columnas sueltas) y llamaba a `trophyScore()` con una forma de
 * argumentos que no es la suya (esa función puntúa UN trofeo, no un
 * resumen de juego).
 *
 * Una sola consulta a `user_trophy` para todo el clan, no una por miembro
 * (mismo antipatrón N+1 ya corregido antes en este proyecto — PEGI, horas
 * de PSN): se agrupa en memoria por `userId` en vez de una query aparte
 * por cada uno.
 */
export async function getClanLeaderboard(clanId: string): Promise<ClanLeaderboardEntry[]> {
  const members = await db
    .select({ userId: clanMembers.userId, role: clanMembers.role })
    .from(clanMembers)
    .where(eq(clanMembers.clanId, clanId));

  if (members.length === 0) return [];

  const memberIds = members.map((m) => m.userId);

  const [trophyRows, profiles] = await Promise.all([
    db
      .select({
        userId: userTrophies.userId,
        platform: games.platform,
        grade: gameTrophies.grade,
        xp: gameTrophies.xp,
        rarityPercent: userTrophies.rarityPercent,
      })
      .from(userTrophies)
      .innerJoin(games, eq(games.id, userTrophies.gameId))
      .innerJoin(
        gameTrophies,
        and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)),
      )
      .where(and(inArray(userTrophies.userId, memberIds), eq(userTrophies.earned, true))),
    db
      .select({
        id: users.id,
        handle: users.handle,
        name: users.name,
        image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
      })
      .from(users)
      .where(inArray(users.id, memberIds)),
  ]);

  const stats = new Map<string, { score: number; trofeos: number }>();
  for (const row of trophyRows) {
    const actual = stats.get(row.userId) ?? { score: 0, trofeos: 0 };
    actual.score += trophyScore({
      platform: row.platform,
      grade: row.grade as TrophyGrade | null,
      xp: row.xp,
      rarityPercent: row.rarityPercent,
    });
    actual.trofeos += 1;
    stats.set(row.userId, actual);
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return members
    .map((m) => {
      const p = profileMap.get(m.userId);
      const s = stats.get(m.userId) ?? { score: 0, trofeos: 0 };
      return {
        userId: m.userId,
        role: m.role,
        handle: p?.handle ?? null,
        name: p?.name ?? null,
        image: p?.image ?? null,
        score: s.score,
        trofeos: s.trofeos,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/** Puntuación total del clan — suma del ranking de arriba. */
export async function getClanScore(clanId: string): Promise<number> {
  const leaderboard = await getClanLeaderboard(clanId);
  return leaderboard.reduce((sum, m) => sum + m.score, 0);
}

/**
 * Últimas valoraciones/reseñas/platinos/favoritos/altas de juego de los
 * miembros del clan — mismo origen que el feed de amigos (`lib/feed.ts`,
 * tabla `activities`), pero filtrado por clan en vez de por amistad, y sin
 * reacciones/comentarios: es un escaparate de "el clan está vivo", no una
 * segunda red social dentro de la primera. Una sola consulta para todo el
 * clan (mismo motivo que `getClanScore`), no una por miembro.
 */
export async function getClanActivity(clanId: string, limite = 15) {
  const memberIds = await db
    .select({ userId: clanMembers.userId })
    .from(clanMembers)
    .where(eq(clanMembers.clanId, clanId));

  if (memberIds.length === 0) return [];

  return db
    .select({
      id: activities.id,
      type: activities.type,
      rating: activities.rating,
      createdAt: activities.createdAt,
      user: {
        handle: users.handle,
        name: users.name,
        image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
      },
      game: {
        id: games.id,
        title: games.title,
        iconUrl: games.iconUrl,
      },
    })
    .from(activities)
    .innerJoin(users, eq(activities.userId, users.id))
    .innerJoin(games, eq(activities.gameId, games.id))
    .where(inArray(activities.userId, memberIds.map((m) => m.userId)))
    .orderBy(desc(activities.createdAt))
    .limit(limite);
}

/* ------------------------------------------------------------------ *
 * Invitaciones                                                       *
 *                                                                    *
 * Solo el líder puede invitar, y solo a amigos suyos — "roles         *
 * expandidos" (sublíderes con permiso de invitar) queda pendiente,    *
 * de momento un solo dueño por clan mantiene esto simple. La          *
 * invitación se BORRA al resolverse (aceptada o rechazada), no se     *
 * guarda historial — es un buzón de pendientes, no un registro.       *
 * ------------------------------------------------------------------ */

/**
 * Amigos del usuario que se pueden invitar a ESTE clan ahora mismo: ni ya
 * están en un clan (el suyo o cualquier otro), ni ya tienen una invitación
 * pendiente a este mismo clan.
 */
export async function getInvitableFriends(userId: string, clanId: string) {
  const amigos = await listFriends(userId);
  if (amigos.length === 0) return [];

  const amigoIds = amigos.map((a) => a.userId);
  const [enAlgunClan, yaInvitados] = await Promise.all([
    db.select({ userId: clanMembers.userId }).from(clanMembers).where(inArray(clanMembers.userId, amigoIds)),
    db
      .select({ userId: clanInvites.invitedUserId })
      .from(clanInvites)
      .where(and(eq(clanInvites.clanId, clanId), inArray(clanInvites.invitedUserId, amigoIds))),
  ]);

  const excluidos = new Set([...enAlgunClan.map((m) => m.userId), ...yaInvitados.map((i) => i.userId)]);
  return amigos.filter((a) => !excluidos.has(a.userId));
}

export async function inviteToClan(clanId: string, invitedByUserId: string, invitedUserId: string) {
  const [clan] = await db.select().from(clans).where(eq(clans.id, clanId)).limit(1);
  if (!clan) throw new Error("Clan no encontrado");
  if (clan.ownerId !== invitedByUserId) throw new Error("Solo el líder del clan puede invitar");

  const yaEnClan = await getUserClan(invitedUserId);
  if (yaEnClan) throw new Error("Esa persona ya está en un clan");

  const amigos = await listFriends(invitedByUserId);
  if (!amigos.some((a) => a.userId === invitedUserId)) throw new Error("Solo puedes invitar a amigos tuyos");

  try {
    await db.insert(clanInvites).values({ clanId, invitedUserId, invitedByUserId });
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
      throw new Error("Ya le has invitado a este clan");
    }
    throw err;
  }

  const [remitente] = await db.select({ handle: users.handle, name: users.name }).from(users).where(eq(users.id, invitedByUserId)).limit(1);
  const nombreRemitente = remitente?.name ?? remitente?.handle ?? "Alguien";
  const aviso = {
    title: "Invitación a un clan",
    body: `${nombreRemitente} te invita a unirte a [${clan.tag}] ${clan.name}.`,
    url: "/clanes",
  };
  // Los dos canales a la vez, mismo patrón que las solicitudes de amistad
  // (lib/profiles.ts) — ninguno hace nada si el destinatario no tiene nada
  // registrado en ese canal.
  await Promise.all([enviarPush(invitedUserId, aviso), enviarPushFcm(invitedUserId, aviso)]);
}

/** Invitaciones pendientes de un usuario, en cualquier clan. */
export async function getPendingInvites(userId: string) {
  return db
    .select({
      clanId: clanInvites.clanId,
      clanName: clans.name,
      clanTag: clans.tag,
      invitedByName: users.name,
      invitedByHandle: users.handle,
      createdAt: clanInvites.createdAt,
    })
    .from(clanInvites)
    .innerJoin(clans, eq(clans.id, clanInvites.clanId))
    .innerJoin(users, eq(users.id, clanInvites.invitedByUserId))
    .where(eq(clanInvites.invitedUserId, userId))
    .orderBy(desc(clanInvites.createdAt));
}

export async function acceptClanInvite(userId: string, clanId: string) {
  const [invite] = await db
    .select()
    .from(clanInvites)
    .where(and(eq(clanInvites.clanId, clanId), eq(clanInvites.invitedUserId, userId)))
    .limit(1);
  if (!invite) throw new Error("Esa invitación ya no existe");

  // joinClan ya comprueba que no estés en otro clan (aplicado también a
  // nivel de base con el índice único de clan_members.userId).
  await joinClan(userId, clanId);
  await db.delete(clanInvites).where(and(eq(clanInvites.clanId, clanId), eq(clanInvites.invitedUserId, userId)));
}

export async function declineClanInvite(userId: string, clanId: string) {
  await db.delete(clanInvites).where(and(eq(clanInvites.clanId, clanId), eq(clanInvites.invitedUserId, userId)));
}
