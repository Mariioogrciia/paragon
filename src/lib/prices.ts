import "server-only";

/**
 * Comparador de precios en distintas tiendas, vía la API pública de
 * CheapShark (gratis, sin clave, pero exige un User-Agent que identifique
 * quién llama). Solo funciona para juegos de Steam: la API cruza tiendas por
 * su AppID de Steam, que es justo el `nativeId` que ya guardamos para esa
 * plataforma (ver gameKey en lib/types). Para PSN o juegos manuales no hay
 * una fuente pública equivalente que cubra varias tiendas a la vez — se
 * avisa de esto en la pantalla en vez de fingir que el precio existe.
 *
 * Dos llamadas, no una: `/games?steamAppID=` solo da un resumen (precio más
 * barato, sin desglosar tienda a tienda); el desglose real —lo que hace
 * falta para "comparar"— sale de `/games?id=`, con el id interno de
 * CheapShark que la primera llamada devuelve. Se comprobó a mano contra la
 * API real antes de escribir esto: la primera respuesta NO trae `deals`,
 * aunque su forma se parezca.
 */

const USER_AGENT = "Paragon/1.0 (+https://github.com/Mariioogrciia/paragon)";

/**
 * AppID de Steam a partir del enlace oficial que trae IGDB (categoría 13 de
 * `websites`, ver lib/igdb/client.ts) — para juegos de PC que nadie ha
 * vinculado todavía en Paragon (así que `games.nativeId` no tiene fila de
 * Steam propia) pero que sí están en Steam de verdad. Sin esto, el
 * comparador de precios solo funcionaba para los ~juegos que alguien ya
 * había sincronizado, aunque el resto también tuviera tienda.
 */
export function extraerSteamAppId(websites: { label: string; url: string }[] | undefined): string | null {
  for (const w of websites ?? []) {
    if (w.label !== "Steam") continue;
    const m = /\/app\/(\d+)/.exec(w.url);
    if (m) return m[1];
  }
  return null;
}

/**
 * Ids de tienda de CheapShark → nombre. Estaban mal desde hacía tiempo: el
 * id de cada tienda en su API no es estable en el sentido que uno
 * esperaría (comprobado contra `GET /stores` el 4 de septiembre de 2026),
 * así que varias entradas señalaban a la tienda equivocada — 23 mostraba
 * "GamesPlanet" cuando en realidad es GameBillet, 27 "Gamesload" cuando es
 * Gamesplanet, 28 "IndieGala" cuando es Gamesload, 30 "Voidu" cuando es
 * IndieGala. Peor todavía: había un "PlayStation Store" (33) y un "Xbox
 * Store" (31) que **nunca han existido** en CheapShark — no rastrea tiendas
 * de consola, solo PC. El 33 real es DLGamer (inactiva); el 31, Blizzard
 * Shop. No debería haber roto nada visible todavía (esos ids casi nunca
 * salen en un `/games?steamAppID=`), pero de haber salido alguno habría
 * enseñado una tienda que no es — y "PlayStation Store" habría hecho creer
 * que aquí hay precios de PSN, que no los hay en ningún sitio público.
 */
const TIENDAS: Record<string, string> = {
  "1": "Steam",
  "2": "GamersGate",
  "3": "GreenManGaming",
  "7": "GOG",
  "8": "Origin",
  "11": "Humble Store",
  "13": "Uplay",
  "15": "Fanatical",
  "21": "WinGameStore",
  "23": "GameBillet",
  "25": "Epic Games Store",
  "27": "Gamesplanet",
  "28": "Gamesload",
  "30": "IndieGala",
  "35": "DreamGame",
};

export interface OfertaPrecio {
  tienda: string;
  precio: number;
  precioOriginal: number;
  ahorro: number;
  url: string;
}

export interface ComparativaPrecios {
  ofertas: OfertaPrecio[];
  precioMasBajoHistorico: number | null;
}

async function cheapShark<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`https://www.cheapshark.com/api/1.0/${path}`, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 21_600 }, // 6h: los precios no cambian minuto a minuto.
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (error) {
    console.error("[prices] CheapShark", error);
    return null;
  }
}

export async function comparativaPreciosSteam(appId: string): Promise<ComparativaPrecios | null> {
  const resumenes = await cheapShark<{ gameID: string }[]>(`games?steamAppID=${encodeURIComponent(appId)}`);
  const gameId = resumenes?.[0]?.gameID;
  if (!gameId) return null;

  const detalle = await cheapShark<{
    cheapestPriceEver?: { price: string };
    deals: { storeID: string; price: string; retailPrice: string; dealID: string; savings: string }[];
  }>(`games?id=${gameId}`);

  if (!detalle?.deals || detalle.deals.length === 0) return null;

  const ofertas = detalle.deals
    .filter((d) => TIENDAS[d.storeID])
    .map((d) => ({
      tienda: TIENDAS[d.storeID],
      precio: Number(d.price),
      precioOriginal: Number(d.retailPrice),
      ahorro: Math.round(Number(d.savings)),
      url: `https://www.cheapshark.com/redirect?dealID=${d.dealID}`,
    }))
    .sort((a, b) => a.precio - b.precio);

  if (ofertas.length === 0) return null;

  return {
    ofertas,
    precioMasBajoHistorico: detalle.cheapestPriceEver ? Number(detalle.cheapestPriceEver.price) : null,
  };
}

export interface OfertaDestacada {
  titulo: string;
  precio: number;
  precioOriginal: number;
  ahorro: number;
  caratula: string;
  url: string;
}

/**
 * Las mejores ofertas de Steam ahora mismo — a diferencia de
 * `comparativaPreciosSteam`, que compara UN juego concreto, esto es un
 * escaparate general para Descubrir: "qué está de oferta", no "cuánto
 * cuesta lo que ya tengo en la lista". Mismo endpoint de CheapShark, sin
 * clave, mismo `User-Agent` obligatorio.
 */
export async function ofertasSteam(limit = 12): Promise<OfertaDestacada[]> {
  const deals = await cheapShark<
    {
      title: string;
      salePrice: string;
      normalPrice: string;
      savings: string;
      thumb: string;
      dealID: string;
    }[]
  >(`deals?storeID=1&pageSize=${limit}&sortBy=Deal%20Rating&onSale=true`);

  if (!deals) return [];

  return deals.map((d) => ({
    titulo: d.title,
    precio: Number(d.salePrice),
    precioOriginal: Number(d.normalPrice),
    ahorro: Math.round(Number(d.savings)),
    caratula: d.thumb,
    url: `https://www.cheapshark.com/redirect?dealID=${d.dealID}`,
  }));
}
