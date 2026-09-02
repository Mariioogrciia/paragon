import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { collectionGames, collections } from "@/db/schema";

/**
 * Carpetas del usuario.
 *
 * Son la respuesta a que PSN no diga quién edita cada juego: si no se puede
 * agrupar solo, que al menos se pueda agrupar a mano. Cada carpeta pertenece a
 * un usuario y puede contener juegos de cualquier plataforma.
 */

export interface Collection {
  id: string;
  name: string;
  gameIds: string[];
}

const MAX_NAME = 40;

export class CollectionNameError extends Error {}

function cleanName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ");

  if (name.length === 0) throw new CollectionNameError("Ponle un nombre a la carpeta.");
  if (name.length > MAX_NAME)
    throw new CollectionNameError(`Como mucho ${MAX_NAME} caracteres.`);

  return name;
}

/** Todas las carpetas de un usuario, con los juegos que hay en cada una. */
export async function listCollections(userId: string): Promise<Collection[]> {
  const rows = await db
    .select({
      id: collections.id,
      name: collections.name,
      gameId: collectionGames.gameId,
    })
    .from(collections)
    .leftJoin(collectionGames, eq(collectionGames.collectionId, collections.id))
    .where(eq(collections.userId, userId))
    .orderBy(asc(collections.createdAt));

  const byId = new Map<string, Collection>();

  for (const row of rows) {
    const carpeta = byId.get(row.id) ?? { id: row.id, name: row.name, gameIds: [] };
    if (row.gameId) carpeta.gameIds.push(row.gameId);
    byId.set(row.id, carpeta);
  }

  return [...byId.values()];
}

export async function createCollection(userId: string, name: string): Promise<string> {
  const limpio = cleanName(name);

  const [existente] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.userId, userId), eq(collections.name, limpio)))
    .limit(1);

  if (existente) throw new CollectionNameError("Ya tienes una carpeta con ese nombre.");

  const [fila] = await db
    .insert(collections)
    .values({ userId, name: limpio })
    .returning({ id: collections.id });

  return fila.id;
}

export async function renameCollection(userId: string, id: string, name: string) {
  await db
    .update(collections)
    .set({ name: cleanName(name) })
    .where(and(eq(collections.id, id), eq(collections.userId, userId)));
}

export async function deleteCollection(userId: string, id: string) {
  await db
    .delete(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)));
}

/**
 * Mete o saca un juego de una carpeta.
 *
 * La comprobación de propietario va en el propio borrado/inserción: sin ella,
 * cualquiera podría tocar las carpetas de otro pasando su id.
 */
export async function toggleGameInCollection(
  userId: string,
  collectionId: string,
  gameId: string,
): Promise<boolean> {
  const [carpeta] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .limit(1);

  if (!carpeta) return false;

  const [dentro] = await db
    .select({ gameId: collectionGames.gameId })
    .from(collectionGames)
    .where(
      and(
        eq(collectionGames.collectionId, collectionId),
        eq(collectionGames.gameId, gameId),
      ),
    )
    .limit(1);

  if (dentro) {
    await db
      .delete(collectionGames)
      .where(
        and(
          eq(collectionGames.collectionId, collectionId),
          eq(collectionGames.gameId, gameId),
        ),
      );
    return false;
  }

  await db.insert(collectionGames).values({ collectionId, gameId });
  return true;
}
