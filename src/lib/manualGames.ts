import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { activities, games, userGames } from "@/db/schema";
import { gameKey } from "@/lib/types";

export interface ManualGameInput {
  igdbId: number;
  title: string;
  coverUrl?: string;
  genres?: string[];
  developer?: string;
  publisher?: string;
  /** Libre: "Switch", "PS1", "Game Boy"... No hay API que lo imponga. */
  deviceLabel: string;
  completed: boolean;
}

/** Para que "Switch" y "switch " no acaben en dos filas distintas. */
function slugDevice(deviceLabel: string): string {
  return (
    deviceLabel
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "otro"
  );
}

/**
 * Añade (o vuelve a añadir) un juego manual a la biblioteca de un usuario.
 *
 * El mismo título de IGDB en dos dispositivos distintos son DOS filas de
 * `games`, igual que Steam y PSN nunca comparten fila aunque sea el mismo
 * juego: aquí tampoco hay un set de logros común entre "Tetris en Game Boy" y
 * "Tetris en NES", así que el progreso no se puede mezclar. El mismo
 * dispositivo para el mismo IGDB id sí es una fila compartida, como el resto
 * del catálogo: si otro usuario ya añadió "Celeste" en Switch, esta reutiliza
 * esa fila y solo crea el progreso de este usuario.
 */
export async function addManualGame(userId: string, input: ManualGameInput): Promise<string> {
  const db = getDb();
  const id = gameKey("manual", `${input.igdbId}:${slugDevice(input.deviceLabel)}`);

  await db
    .insert(games)
    .values({
      id,
      platform: "manual",
      nativeId: `${input.igdbId}:${slugDevice(input.deviceLabel)}`,
      title: input.title,
      deviceLabel: input.deviceLabel,
      iconUrl: input.coverUrl,
      definedTotal: 1,
      developer: input.developer,
      publisher: input.publisher,
      genres: input.genres ?? null,
      metadataSyncedAt: new Date(),
    })
    .onConflictDoNothing({ target: games.id });

  const progressPercent = input.completed ? 100 : 0;
  const earnedTotal = input.completed ? 1 : 0;

  await db
    .insert(userGames)
    .values({
      userId,
      gameId: id,
      progressPercent,
      earnedTotal,
      lastPlayedAt: new Date(),
      trophiesSyncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userGames.userId, userGames.gameId],
      set: { progressPercent, earnedTotal, lastPlayedAt: new Date() },
    });

  await db.insert(activities).values({
    id: crypto.randomUUID(),
    userId,
    type: "new_game",
    gameId: id,
  });

  return id;
}

/**
 * Cambia el estado completado/no de un juego manual ya en la biblioteca.
 *
 * Solo tiene sentido para `platform: "manual"`: en el resto el progreso lo
 * manda la plataforma, no un botón. No se comprueba aquí — lo hace quien
 * llama, que es quien tiene el `Game` completo a mano.
 */
export async function setManualGameCompleted(
  userId: string,
  gameId: string,
  completed: boolean,
): Promise<void> {
  const db = getDb();
  await db
    .update(userGames)
    .set({
      progressPercent: completed ? 100 : 0,
      earnedTotal: completed ? 1 : 0,
    })
    .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)));
}
