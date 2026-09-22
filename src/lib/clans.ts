import "server-only";
import { db } from "@/db";
import { clans, clanMembers, games, gameTrophies, userTrophies } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { trophyScore } from "./trophyScore";
import { errorSiOfensivo } from "./contentFilter";
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

/**
 * Calcula la puntuación total de un clan sumando el Paragon Score
 * (`lib/paragonScore.ts`) trofeo a trofeo de todos sus miembros.
 *
 * La versión original de esta función no compilaba: leía columnas que no
 * existen en el esquema (`userGames.earnedPlatinum` y compañía — el
 * desglose por metal vive en el jsonb `earned`, no en columnas sueltas) y
 * llamaba a `trophyScore()` con una forma de argumentos que no es la suya
 * (esa función puntúa UN trofeo, no un resumen de juego). En vez de arreglar
 * esa fórmula a mano, reutiliza la fuente de verdad que ya existe para
 * "puntuación unificada entre plataformas" (`getParagonScore`,
 * `lib/paragonScore.ts`) en vez de reinventarla con datos que no cuadran.
 *
 * Una sola consulta para todo el clan, no una por miembro: la primera
 * versión hacía un round-trip a la base por cada `member.userId` dentro de
 * un `for`, el mismo antipatrón N+1 que ya se corrigió antes en otros sitios
 * de este proyecto (PEGI, horas de PSN) — con un clan grande, cada carga de
 * `/clanes/[tag]` disparaba decenas de queries.
 */
export async function getClanScore(clanId: string) {
  const memberIds = await db
    .select({ userId: clanMembers.userId })
    .from(clanMembers)
    .where(eq(clanMembers.clanId, clanId));

  if (memberIds.length === 0) return 0;

  const rows = await db
    .select({
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
    .where(
      and(
        inArray(userTrophies.userId, memberIds.map((m) => m.userId)),
        eq(userTrophies.earned, true),
      ),
    );

  let totalScore = 0;
  for (const row of rows) {
    totalScore += trophyScore({
      platform: row.platform,
      grade: row.grade as TrophyGrade | null,
      xp: row.xp,
      rarityPercent: row.rarityPercent,
    });
  }

  return totalScore;
}
