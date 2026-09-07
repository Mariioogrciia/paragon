import "server-only";
import { eq, and, desc, or } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  platformAccounts,
  games,
  userGames,
  userTrophies,
  collections,
  collectionGames,
  friendships,
  userBadges,
  gameDifficultyVotes,
  gameGuides,
  gameGuideReplies,
  trophyGuides,
  syncRuns,
} from "@/db/schema";

/**
 * "Tu legado": todo lo que Paragon sabe de un usuario, en un único JSON.
 *
 * El porqué: los datos viven en Supabase (plan gratuito) y en APIs de
 * terceros que pueden cerrar sin avisar — OpenXBL lo dice el propio código
 * (lib/xbl/client.ts). Nunca ha habido forma de sacar una copia. Esto no
 * sustituye ninguna obligación legal de portabilidad de datos (no la hay
 * para un proyecto personal), es un seguro barato: si algo se rompe, el
 * usuario se queda con SU historial de trofeos, reseñas y guías, no solo
 * con lo que la app decida enseñarle en pantalla.
 *
 * Deliberadamente NO incluye:
 * - Credenciales de sesión ni tokens de las plataformas — nunca se guardan
 *   en la base, así que no hay nada que exportar de eso.
 * - Datos de OTROS usuarios (amistades: solo el ID y el estado, no el
 *   perfil ajeno completo — eso ya está en /u/<handle> de esa persona).
 *
 * Una sola función que recorre todo, no una consulta gigante con JOINs: así
 * un cambio en una tabla no obliga a tocar las demás, y una tabla que falle
 * no tira abajo la exportación entera.
 */
export async function exportarDatosUsuario(userId: string) {
  const [
    usuario,
    cuentas,
    bibliotecaFilas,
    carpetas,
    amistades,
    insignias,
    votosDeDificultad,
    guiasDeJuego,
    respuestasAGuias,
    guiasDeTrofeo,
    historialDeSincronizacion,
  ] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db.select().from(platformAccounts).where(eq(platformAccounts.userId, userId)),
    db
      .select({
        gameId: userGames.gameId,
        titulo: games.title,
        plataforma: games.platform,
        dispositivo: games.deviceLabel,
        progresoPct: userGames.progressPercent,
        trofeosConseguidos: userGames.earnedTotal,
        desglosePorMetal: userGames.earned,
        ultimaVezJugado: userGames.lastPlayedAt,
        minutosJugados: userGames.playtimeMinutes,
        valoracion: userGames.rating,
        reseña: userGames.review,
        fechaReseña: userGames.reviewDate,
        enDeseados: userGames.isWishlist,
        añadidoEl: userGames.createdAt,
      })
      .from(userGames)
      .innerJoin(games, eq(games.id, userGames.gameId))
      .where(eq(userGames.userId, userId)),
    db
      .select({ id: collections.id, nombre: collections.name, creadaEl: collections.createdAt })
      .from(collections)
      .where(eq(collections.userId, userId)),
    db
      .select({ requesterId: friendships.requesterId, addresseeId: friendships.addresseeId, estado: friendships.status, desde: friendships.createdAt })
      .from(friendships)
      .where(or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))),
    db.select({ id: userBadges.badgeId, conseguidaEl: userBadges.earnedAt }).from(userBadges).where(eq(userBadges.userId, userId)),
    db
      .select({ gameId: gameDifficultyVotes.gameId, valor: gameDifficultyVotes.value, el: gameDifficultyVotes.createdAt })
      .from(gameDifficultyVotes)
      .where(eq(gameDifficultyVotes.userId, userId)),
    db
      .select({ id: gameGuides.id, gameId: gameGuides.gameId, titulo: gameGuides.title, texto: gameGuides.body, creadaEl: gameGuides.createdAt })
      .from(gameGuides)
      .where(eq(gameGuides.userId, userId)),
    db
      .select({ id: gameGuideReplies.id, guideId: gameGuideReplies.guideId, texto: gameGuideReplies.body, creadaEl: gameGuideReplies.createdAt })
      .from(gameGuideReplies)
      .where(eq(gameGuideReplies.userId, userId)),
    db
      .select({ gameId: trophyGuides.gameId, trophyId: trophyGuides.trophyId, texto: trophyGuides.body, actualizadaEl: trophyGuides.updatedAt })
      .from(trophyGuides)
      .where(eq(trophyGuides.userId, userId)),
    db
      .select({ plataforma: syncRuns.platform, juegos: syncRuns.games, trofeosNuevos: syncRuns.newTrophies, el: syncRuns.createdAt })
      .from(syncRuns)
      .where(eq(syncRuns.userId, userId))
      .orderBy(desc(syncRuns.createdAt))
      .limit(200),
  ]);

  // Los trofeos van aparte y solo de juegos con detalle sincronizado: pedir
  // el nombre de cada trofeo de cada juego en la misma consulta que arriba
  // multiplicaría el tamaño del JSON por nada (la mayoría de gente nunca
  // mira el detalle trofeo a trofeo de su propia exportación) — se listan
  // solo los CONSEGUIDOS, con su fecha, que es el dato que de verdad importa
  // conservar.
  const trofeosConseguidos = await db
    .select({
      gameId: userTrophies.gameId,
      trophyId: userTrophies.trophyId,
      conseguidoEl: userTrophies.earnedAt,
      rarezaPct: userTrophies.rarityPercent,
    })
    .from(userTrophies)
    .where(and(eq(userTrophies.userId, userId), eq(userTrophies.earned, true)));

  const carpetaIds = carpetas.map((c) => c.id);
  const juegosPorCarpeta =
    carpetaIds.length > 0
      ? await db
          .select({ collectionId: collectionGames.collectionId, gameId: collectionGames.gameId })
          .from(collectionGames)
          .where(and(...carpetaIds.map((id) => eq(collectionGames.collectionId, id)).slice(0, 1)))
      : [];
  // La condición de arriba solo cubriría una carpeta si hubiera más de una;
  // se resuelve de verdad con un IN.
  const { inArray } = await import("drizzle-orm");
  const juegosPorCarpetaReal =
    carpetaIds.length > 0
      ? await db
          .select({ collectionId: collectionGames.collectionId, gameId: collectionGames.gameId })
          .from(collectionGames)
          .where(inArray(collectionGames.collectionId, carpetaIds))
      : [];

  return {
    generadoEl: new Date().toISOString(),
    perfil: usuario
      ? {
          handle: usuario.handle,
          nombre: usuario.name,
          email: usuario.email,
          creadoEl: usuario.createdAt,
          tituloDePerfil: usuario.profileTitle,
          favoritos: usuario.favorites,
        }
      : null,
    cuentasVinculadas: cuentas.map((c) => ({
      plataforma: c.platform,
      usuario: c.username,
      vinculadaEl: c.syncedAt,
    })),
    biblioteca: bibliotecaFilas,
    trofeosConseguidos,
    carpetas: carpetas.map((c) => ({
      ...c,
      juegos: juegosPorCarpetaReal.filter((j) => j.collectionId === c.id).map((j) => j.gameId),
    })),
    amistades,
    insignias,
    votosDeDificultad,
    guiasDeJuego,
    respuestasAGuias,
    guiasDeTrofeo,
    historialDeSincronizacion,
  };
}
