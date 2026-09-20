import "server-only";
import { unstable_cache } from "next/cache";

/**
 * Catálogo COMPLETO de Xbox Game Pass — distinto de `xboxGamePass.ts` (que
 * solo mira "la última tanda anunciada" en el feed de noticias). Aquí se lee
 * directamente la API del propio catálogo de Microsoft
 * (`catalog.gamepass.com` + `displaycatalog.mp.microsoft.com`), la misma que
 * usa xbox.com/xbox-game-pass/games — sin scraping ni clave, documentada de
 * forma no oficial por varios proyectos en GitHub (buscar "gamepass sigls").
 *
 * IMPORTANTE — por qué esto es "Consola" / "PC" y no "Standard" / "Ultimate":
 * Microsoft no publica un catálogo separado por esos dos planes. La
 * diferencia real entre Standard y Ultimate es sobre todo día de lanzamiento
 * (Ultimate tiene los estrenos el día 1; Standard los recibe semanas o meses
 * después, hasta 12) y el acceso a PC/nube/EA Play — no una lista de títulos
 * distinta y estable que se pueda consultar. Con el tiempo, casi todo lo de
 * Standard acaba siendo el mismo catálogo de consola completo, solo con
 * retraso variable por juego y sin fuente pública que diga cuál está en ese
 * periodo de espera ahora mismo. Prometer "esto es lo de Ultimate y esto lo
 * de Standard" sería inventar un dato que no existe — así que se separa por
 * lo que la propia API SÍ distingue de verdad: la plataforma (consola vs PC).
 * EA Play (el extra exclusivo de Ultimate) tiene su propio catálogo aparte,
 * sin usar aquí a propósito — no se ha pedido.
 */

export interface GamePassCatalogGame {
  id: string;
  title: string;
  iconUrl?: string;
  storeUrl: string;
}

const SIGL_IDS = {
  consola: "f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e",
  pc: "fdd9e2a7-0fee-49f6-ad69-4354098401ff",
} as const;

export type GamePassPlataforma = keyof typeof SIGL_IDS;

const MARKET = "ES";
const LANGUAGE = "es-es";
// Mismo límite que usan las herramientas de referencia para esta API: mantener
// la URL de `bigIds` bajo el tope que imponen proxies/CDN de por medio (esto
// es un límite de LA URL, no de caché — ver el aviso grande más abajo sobre
// por qué ya no hace falta bajarlo para esquivar el tope de Next).
const TAMANO_LOTE = 200;
const CACHE_SEGUNDOS = 86_400; // el catálogo cambia unas pocas veces al mes, no hace falta pedirlo más a menudo.

async function idsDelCatalogo(plataforma: GamePassPlataforma): Promise<string[]> {
  // `cache: "no-store"` a propósito: el catálogo ENTERO ya se cachea una
  // sola vez, ya parseado y pequeño, con `unstable_cache` al final de este
  // archivo — cachear también esta llamada cruda por separado sería cachear
  // dos veces lo mismo sin necesidad.
  const res = await fetch(
    `https://catalog.gamepass.com/sigls/v2?id=${SIGL_IDS[plataforma]}&language=${LANGUAGE}&market=${MARKET}`,
    { cache: "no-store" },
  );
  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  // La primera fila es metadata del propio catálogo (título/descripción), no
  // un juego — se descarta filtrando por quién SÍ trae `id`.
  return data.filter((entry) => typeof entry?.id === "string").map((entry) => entry.id as string);
}

function slugDeTitulo(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function urlAbsoluta(uri: string): string {
  return uri.startsWith("https:") ? uri : `https:${uri}`;
}

interface ProductoDisplayCatalog {
  ProductId?: string;
  LocalizedProperties?: Array<{
    ProductTitle?: string;
    Images?: Array<{ ImagePurpose?: string; Uri?: string }>;
  }>;
}

async function detallesDelLote(ids: string[]): Promise<GamePassCatalogGame[]> {
  // Mismo motivo que arriba: sin caché de Next por fetch — algunos lotes de
  // Microsoft (LocalizedProperties enteras, varias imágenes por producto)
  // llegaban a pesar hasta 17MB, muy por encima del tope de 2MB por entrada
  // que impone la data cache de Next. Antes se esquivaba bajando el tamaño
  // de lote a 10 (más peticiones, más lento) — ahora ninguna respuesta
  // cruda pasa por la caché de Next en absoluto, así que el tamaño de lote
  // vuelve a poder ser el de siempre (200, el límite real es la URL).
  const res = await fetch(
    `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${ids.join(",")}&market=${MARKET}&languages=${LANGUAGE}`,
    { cache: "no-store" },
  );
  if (!res.ok) return [];

  const data: { Products?: ProductoDisplayCatalog[] } = await res.json();
  const juegos: GamePassCatalogGame[] = [];

  for (const producto of data.Products ?? []) {
    const props = producto.LocalizedProperties?.[0];
    const title = props?.ProductTitle;
    const id = producto.ProductId;
    if (!title || !id) continue;

    const poster = props?.Images?.find((img) => img.ImagePurpose === "Poster")?.Uri;

    juegos.push({
      id,
      title,
      iconUrl: poster ? urlAbsoluta(poster) : undefined,
      storeUrl: `https://www.xbox.com/es-es/games/store/${slugDeTitulo(title)}/${id}`,
    });
  }

  return juegos;
}

/**
 * Catálogo entero de una de las dos plataformas, ordenado por título.
 * Nunca lanza — un fallo de red devuelve una lista vacía, igual que el resto
 * de integraciones externas de esta app (PowerPyx, HLTB, PS Plus...).
 *
 * Cacheada aquí, UNA VEZ, con `unstable_cache` — el resultado ya parseado
 * (solo id/título/imagen/URL) pesa una fracción de las respuestas crudas de
 * Microsoft, así que el límite de 2MB de la data cache de Next deja de ser
 * un problema real pase lo que pase con el tamaño del catálogo. Antes se
 * dejaba que Next cacheara cada respuesta CRUDA por separado (`fetch` con
 * `next: { revalidate }`), y esas sí podían pasarse de 2MB con facilidad.
 */
export const getXboxGamePassCatalog = unstable_cache(
  async (plataforma: GamePassPlataforma): Promise<GamePassCatalogGame[]> => {
    try {
      const ids = await idsDelCatalogo(plataforma);
      if (ids.length === 0) return [];

      const lotes: string[][] = [];
      for (let i = 0; i < ids.length; i += TAMANO_LOTE) {
        lotes.push(ids.slice(i, i + TAMANO_LOTE));
      }

      const resultados = await Promise.all(lotes.map(detallesDelLote));
      return resultados.flat().sort((a, b) => a.title.localeCompare(b.title, "es"));
    } catch (error) {
      console.error(`[xboxGamePassCatalog] no se pudo cargar el catálogo de ${plataforma}`, error);
      return [];
    }
  },
  ["xbox-gamepass-catalog"],
  { revalidate: CACHE_SEGUNDOS },
);
