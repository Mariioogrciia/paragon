import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { games, gameTrophies, gameTrophyI18n, trophyGuideVideos } from "@/db/schema";
import { BUSQUEDA_VIDEO, type Idioma } from "@/lib/idiomasTrofeo";

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
export async function buscarCandidatosYouTube(query: string, idioma?: Idioma): Promise<string[]> {
  try {
    // `hl`/`gl` (idioma y región de la página de resultados): sin ellos los
    // vídeos salen en el idioma del servidor, no en el de quien busca.
    const region = idioma ? `&hl=${BUSQUEDA_VIDEO[idioma].hl}&gl=${BUSQUEDA_VIDEO[idioma].gl}` : "";
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}${region}`, {
      signal: AbortSignal.timeout(10_000),
      // Sin esto YouTube a veces sirve una versión reducida de la página
      // sin los datos de vídeo incrustados — comprobado a mano.
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ...(idioma ? { "Accept-Language": `${BUSQUEDA_VIDEO[idioma].hl}-${BUSQUEDA_VIDEO[idioma].gl},${BUSQUEDA_VIDEO[idioma].hl};q=0.9` } : {}),
      },
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
  // Con ids, el texto de la búsqueda sale SIEMPRE de la base, no de lo que
  // mande quien llama: `searchTrophyGuideAction` no exige sesión (la modal
  // también la abren visitantes de perfiles públicos), y fiarse de su
  // `gameTitle`/`trophyName` dejaba a cualquiera elegir qué vídeo se
  // guardaba para todos en un trofeo aún sin buscar (auditoría, 25 sept 2026).
  let guardado = false;
  if (gameId && trophyId) {
    const [fila] = await db
      .select({ guideVideoId: gameTrophies.guideVideoId, trophyName: gameTrophies.name, gameTitle: games.title })
      .from(gameTrophies)
      .innerJoin(games, eq(games.id, gameTrophies.gameId))
      .where(and(eq(gameTrophies.gameId, gameId), eq(gameTrophies.trophyId, trophyId)))
      .limit(1);

    // "" = ya se buscó y no había nada — no repetir. `null` = nunca se ha
    // buscado, sigue abajo.
    if (fila?.guideVideoId === "") return null;
    if (fila?.guideVideoId) return fila.guideVideoId;
    if (fila) {
      gameTitle = fila.gameTitle;
      trophyName = fila.trophyName;
      guardado = true;
    }
  }

  const candidatos = await buscarCandidatosYouTube(`${gameTitle} ${trophyName} trophy guide`);
  const videoId = candidatos[0] ?? null;

  if (guardado && gameId && trophyId) {
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
): Promise<string | null> {
  const [fila] = await db
    .select({ guideVideoId: gameTrophies.guideVideoId, trophyName: gameTrophies.name, gameTitle: games.title })
    .from(gameTrophies)
    .innerJoin(games, eq(games.id, gameTrophies.gameId))
    .where(and(eq(gameTrophies.gameId, gameId), eq(gameTrophies.trophyId, trophyId)))
    .limit(1);
  // Mismo motivo que en `buscarVideoGuiaTrofeo`: el texto sale de la base.
  // Sin fila no hay nada que actualizar.
  if (!fila) return null;

  const candidatos = await buscarCandidatosYouTube(`${fila.gameTitle} ${fila.trophyName} trophy guide`);
  const indiceActual = fila?.guideVideoId ? candidatos.indexOf(fila.guideVideoId) : -1;
  const siguiente = indiceActual === -1 ? candidatos[0] : candidatos[indiceActual + 1];
  const videoId = siguiente ?? null;

  await db
    .update(gameTrophies)
    .set({ guideVideoId: videoId ?? "" })
    .where(and(eq(gameTrophies.gameId, gameId), eq(gameTrophies.trophyId, trophyId)));

  return videoId;
}


/* ----------------- Vídeos en el idioma de la interfaz (1 oct 2026) ---------------- */

const DIA = 86_400_000;
const MAX_VIDEOS = 8;
export const MAX_TEXTO_BUSQUEDA = 80;

/**
 * Qué se busca, siempre sacado de la base (nunca del cliente, por el mismo
 * motivo que en `buscarVideoGuiaTrofeo`): título del juego y nombre del
 * trofeo en el idioma pedido si hay traducción guardada
 * (lib/trofeosIdioma.ts), y si no, el original.
 */
async function textoDeBusqueda(gameId: string, trophyId: string, idioma: Idioma): Promise<{ juego: string; trofeo: string } | null> {
  const [fila] = await db
    .select({ trophyName: gameTrophies.name, gameTitle: games.title })
    .from(gameTrophies)
    .innerJoin(games, eq(games.id, gameTrophies.gameId))
    .where(and(eq(gameTrophies.gameId, gameId), eq(gameTrophies.trophyId, trophyId)))
    .limit(1);
  if (!fila) return null;
  const [tr] = await db
    .select({ name: gameTrophyI18n.name })
    .from(gameTrophyI18n)
    .where(and(eq(gameTrophyI18n.gameId, gameId), eq(gameTrophyI18n.trophyId, trophyId), eq(gameTrophyI18n.lang, idioma)))
    .limit(1);
  return { juego: fila.gameTitle, trofeo: tr?.name ?? fila.trophyName };
}

/**
 * Hasta 8 vídeos de guía para un trofeo, buscados en el idioma pedido y
 * cacheados por (juego, trofeo, idioma): la primera persona que lo abre en
 * ese idioma dispara la búsqueda, las demás leen lo guardado. Con
 * resultados dura 90 días; sin ninguno, 2 días (para reintentar pronto).
 */
export async function videosGuiaTrofeo(gameId: string, trophyId: string, idioma: Idioma): Promise<string[]> {
  const [guardado] = await db
    .select()
    .from(trophyGuideVideos)
    .where(and(eq(trophyGuideVideos.gameId, gameId), eq(trophyGuideVideos.trophyId, trophyId), eq(trophyGuideVideos.lang, idioma)))
    .limit(1);
  if (guardado) {
    const edad = Date.now() - guardado.checkedAt.getTime();
    if (guardado.videoIds.length > 0 ? edad < 90 * DIA : edad < 2 * DIA) return guardado.videoIds;
  }

  const texto = await textoDeBusqueda(gameId, trophyId, idioma);
  if (!texto) return [];

  let ids = (await buscarCandidatosYouTube(`${texto.juego} ${texto.trofeo} ${BUSQUEDA_VIDEO[idioma].guia}`, idioma)).slice(0, MAX_VIDEOS);

  // El vídeo único que ya estaba guardado de antes se conserva como primera
  // opción en inglés (era una búsqueda "trophy guide", justo ese idioma).
  if (idioma === "en") {
    const [antiguo] = await db.select({ id: gameTrophies.guideVideoId }).from(gameTrophies).where(and(eq(gameTrophies.gameId, gameId), eq(gameTrophies.trophyId, trophyId))).limit(1);
    if (antiguo?.id && !ids.includes(antiguo.id)) ids = [antiguo.id, ...ids].slice(0, MAX_VIDEOS);
  }

  await db
    .insert(trophyGuideVideos)
    .values({ gameId, trophyId, lang: idioma, videoIds: ids, checkedAt: new Date() })
    .onConflictDoUpdate({
      target: [trophyGuideVideos.gameId, trophyGuideVideos.trophyId, trophyGuideVideos.lang],
      set: { videoIds: ids, checkedAt: new Date() },
    });
  return ids;
}

/**
 * "¿Qué te falta?": la misma búsqueda más lo que escribe la persona ("la
 * última reliquia, zona nevada"). NO se guarda: el texto es de quien lo
 * escribe y cachearlo dejaría a cualquiera decidir qué vídeo ven los demás
 * (el mismo agujero que se cerró en la auditoría del 25 sept 2026). El
 * texto ya debe venir validado (longitud, lenguaje) de quien llama.
 */
export async function videosGuiaConTexto(gameId: string, trophyId: string, textoLibre: string, idioma: Idioma): Promise<string[]> {
  const extra = textoLibre.replace(/[ -]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_TEXTO_BUSQUEDA);
  if (!extra) return [];
  const texto = await textoDeBusqueda(gameId, trophyId, idioma);
  if (!texto) return [];
  return (await buscarCandidatosYouTube(`${texto.juego} ${texto.trofeo} ${extra} ${BUSQUEDA_VIDEO[idioma].guia}`, idioma)).slice(0, MAX_VIDEOS);
}
