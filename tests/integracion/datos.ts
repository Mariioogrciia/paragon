import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { games, gameTrophies, users, userGames, userTrophies } from "@/db/schema";
import type { Platform } from "@/lib/types";

/** Ayudas para crear datos de prueba con ids únicos (cada prueba, los suyos). */
export async function crearUsuario(extra: Partial<typeof users.$inferInsert> = {}) {
  const id = randomUUID();
  const handle = `t${id.slice(0, 8)}`;
  await db.insert(users).values({ id, handle, name: `Prueba ${handle}`, email: `${handle}@prueba.test`, ...extra });
  return { id, handle };
}

export async function crearJuego(platform: Platform, extra: Partial<typeof games.$inferInsert> = {}) {
  const nativo = randomUUID().slice(0, 12);
  const id = `${platform}-${nativo}`;
  await db.insert(games).values({ id, platform, nativeId: nativo, title: `Juego ${nativo}`, deviceLabel: platform.toUpperCase(), ...extra });
  return id;
}

export async function darJuego(userId: string, gameId: string, extra: Partial<typeof userGames.$inferInsert> = {}) {
  await db.insert(userGames).values({ userId, gameId, ...extra });
}

/** Trofeos del juego y cuáles tiene la persona, con su fecha. */
export async function trofeos(gameId: string, userId: string, lista: { id: string; grade?: "bronze" | "silver" | "gold" | "platinum"; earnedAt?: string }[]) {
  await db
    .insert(gameTrophies)
    .values(lista.map((t) => ({ gameId, trophyId: t.id, name: `Trofeo ${t.id}`, grade: t.grade ?? null })))
    .onConflictDoNothing();
  await db.insert(userTrophies).values(
    lista.map((t) => ({ userId, gameId, trophyId: t.id, earned: Boolean(t.earnedAt), earnedAt: t.earnedAt ? new Date(t.earnedAt) : null })),
  );
}
