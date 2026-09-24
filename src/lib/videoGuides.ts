import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { gameTrophies } from "@/db/schema";

/**
 * Vídeo de guía en YouTube para un trofeo — extraído de `app/actions.ts`
 * (`searchTrophyGuideAction`/`rebuscarVideoGuiaAction`) para poder llamarlo
 * también desde `api/mobile/*` sin duplicar la lógica ni importar un módulo
 * "use server" desde una ruta API. `app/actions.ts` sigue siendo quien lo
 * expone a la web (Server Actions); esto es la implementación compartida.
 */

/**
 * Ids de vídeo de una búsqueda en YouTube, en el orden en que salen (sin
 * duplicados) — no solo el primero, para que `rebuscarVideoGuiaTrofeo`
 * pueda ofrecer "el siguiente" cuando el primero no era el correcto.
 */
export async function buscarCandidatosYouTube(query: string): Promise<string[]> {
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      // Sin esto YouTube a veces sirve una versión reducida de la página
      // sin los datos de vídeo incrustados — comprobado a mano.
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!res.ok) return [];
    const html = await res.text();
    // Los datos iniciales de YouTube traen ids de vídeo como "videoId":"XXXXXXXXXXX",
    // repetidos varias veces cada uno (aparecen en varios bloques de datos
    // de la misma página) — de ahí el Set, para no ofrecer "el siguiente"
    // y que sea el mismo vídeo de antes.
    return [...new Set([...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]))];
  } catch (error) {
    console.error("Error fetching guide from YouTube", error);
    return [];
  }
}

/**
 * Vídeo de YouTube de guía para un trofeo — cacheado en
 * `game_trophy.guideVideoId` (ver el comentario en schema.ts): la primera
 * persona que abre un trofeo dispara la búsqueda de verdad, todas las
 * siguientes (de cualquier usuario, web o móvil) leen lo ya guardado, sin
 * volver a pedirle nada a YouTube. `gameId`/`trophyId` son opcionales a
 * propósito (un juego manual sin `gameId` real, por ejemplo): sin ellos se
 * busca en vivo igual, solo que sin guardar el resultado para la próxima vez.
 */
export async function buscarVideoGuiaTrofeo(
  gameTitle: string,
  trophyName: string,
  gameId?: string,
  trophyId?: string,
): Promise<string | null> {
  if (gameId && trophyId) {
    const [fila] = await db
      .select({ guideVideoId: gameTrophies.guideVideoId })
      .from(gameTrophies)
      .where(and(eq(gameTrophies.gameId, gameId), eq(gameTrophies.trophyId, trophyId)))
      .limit(1);

    // "" = ya se buscó y no había nada — no repetir. `null`/fila ausente =
    // nunca se ha buscado, sigue abajo.
    if (fila?.guideVideoId === "") return null;
    if (fila?.guideVideoId) return fila.guideVideoId;
  }

  const candidatos = await buscarCandidatosYouTube(`${gameTitle} ${trophyName} trophy guide`);
  const videoId = candidatos[0] ?? null;

  if (gameId && trophyId) {
    await db
      .update(gameTrophies)
      .set({ guideVideoId: videoId ?? "" })
      .where(and(eq(gameTrophies.gameId, gameId), eq(gameTrophies.trophyId, trophyId)));
  }

  return videoId;
}

/**
 * "Buscar otro vídeo" — fuerza una búsqueda nueva y SOBRESCRIBE la caché de
 * `buscarVideoGuiaTrofeo`, en vez de leerla. Hace falta aparte porque, sin
 * esto, un vídeo que la primera búsqueda pilló irrelevante se queda mal
 * para SIEMPRE (nadie vuelve a preguntarle a YouTube una vez cacheado).
 *
 * No repite el mismo vídeo que ya había: coge el candidato que sigue al
 * actual en la lista de resultados (o el primero, si el actual ya no
 * aparece o no había ninguno todavía).
 *
 * Quien llame a esto debe comprobar sesión antes (`requireUserId()` en la
 * web, `getMobileUserId()` en móvil) — el dato en sí es compartido entre
 * todos, no privado de quien lo pide, pero disparar scraping de YouTube sin
 * límite si no hace falta.
 */
export async function rebuscarVideoGuiaTrofeo(
  gameId: string,
  trophyId: string,
  gameTitle: string,
  trophyName: string,
): Promise<string | null> {
  const [fila] = await db
    .select({ guideVideoId: gameTrophies.guideVideoId })
    .from(gameTrophies)
    .where(and(eq(gameTrophies.gameId, gameId), eq(gameTrophies.trophyId, trophyId)))
    .limit(1);

  const candidatos = await buscarCandidatosYouTube(`${gameTitle} ${trophyName} trophy guide`);
  const indiceActual = fila?.guideVideoId ? candidatos.indexOf(fila.guideVideoId) : -1;
  const siguiente = indiceActual === -1 ? candidatos[0] : candidatos[indiceActual + 1];
  const videoId = siguiente ?? null;

  await db
    .update(gameTrophies)
    .set({ guideVideoId: videoId ?? "" })
    .where(and(eq(gameTrophies.gameId, gameId), eq(gameTrophies.trophyId, trophyId)));

  return videoId;
}
