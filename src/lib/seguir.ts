import "server-only";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { follows, users } from "@/db/schema";
import { avisarUsuario } from "@/lib/avisos";

/**
 * Seguir a otros cazadores (tabla `follow`, 5 nov 2026). Hasta que exista la
 * tabla (scripts/migraciones/crear-tablas-noviembre-2026.mts), todo esto
 * responde como si no siguieras a nadie, sin romper el perfil ni el feed.
 */
const tablaFalta = (error: unknown) => (error as { cause?: { code?: string } })?.cause?.code === "42P01";

export interface EstadoSeguir {
  sigo: boolean;
  seguidores: number;
  siguiendo: number;
}

export async function estadoSeguir(viewerId: string | null, userId: string): Promise<EstadoSeguir> {
  try {
    const [[seguidores], [siguiendo], sigo] = await Promise.all([
      db.select({ n: count() }).from(follows).where(eq(follows.followedId, userId)),
      db.select({ n: count() }).from(follows).where(eq(follows.followerId, userId)),
      viewerId
        ? db
            .select({ id: follows.followedId })
            .from(follows)
            .where(and(eq(follows.followerId, viewerId), eq(follows.followedId, userId)))
            .limit(1)
            .then((f) => f.length > 0)
        : Promise.resolve(false),
    ]);
    return { sigo, seguidores: Number(seguidores?.n ?? 0), siguiendo: Number(siguiendo?.n ?? 0) };
  } catch (error) {
    if (tablaFalta(error)) return { sigo: false, seguidores: 0, siguiendo: 0 };
    throw error;
  }
}

export class SeguirError extends Error {}

/** Empieza a seguir (o deja de seguir) a alguien. Solo perfiles públicos y nunca a uno mismo. */
export async function cambiarSeguir(followerId: string, followedId: string, seguir: boolean): Promise<void> {
  if (followerId === followedId) throw new SeguirError("No puedes seguirte a ti mismo.");
  if (!seguir) {
    await db.delete(follows).where(and(eq(follows.followerId, followerId), eq(follows.followedId, followedId)));
    return;
  }
  const [objetivo] = await db.select({ publico: users.isPublicProfile }).from(users).where(eq(users.id, followedId)).limit(1);
  if (!objetivo) throw new SeguirError("No existe ese perfil.");
  if (objetivo.publico === false) throw new SeguirError("Ese perfil es privado.");
  const nuevas = await db.insert(follows).values({ followerId, followedId }).onConflictDoNothing().returning({ id: follows.followedId });
  if (nuevas.length > 0) {
    const [yo] = await db.select({ handle: users.handle, name: users.name }).from(users).where(eq(users.id, followerId)).limit(1);
    await avisarUsuario(
      followedId,
      { titulo: "👀 Tienes un seguidor nuevo", texto: `${yo?.name ?? (yo?.handle ? `@${yo.handle}` : "Alguien")} te sigue en Paragon.`, ruta: yo?.handle ? `/u/${yo.handle}` : undefined },
      "amigos",
    );
  }
}

/** Ids de la gente que sigue `userId` (para el feed). */
export async function idsQueSigo(userId: string): Promise<string[]> {
  try {
    const filas = await db.select({ id: follows.followedId }).from(follows).where(eq(follows.followerId, userId));
    return filas.map((f) => f.id);
  } catch (error) {
    if (tablaFalta(error)) return [];
    throw error;
  }
}
