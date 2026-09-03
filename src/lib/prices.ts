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

const TIENDAS: Record<string, string> = {
  "1": "Steam",
  "2": "GamersGate",
  "3": "GreenManGaming",
  "7": "GOG",
  "8": "Origin",
  "11": "Humble Store",
  "13": "Uplay+",
  "15": "Fanatical",
  "21": "WinGameStore",
  "23": "GamesPlanet",
  "25": "Epic Games Store",
  "27": "Gamesload",
  "28": "IndieGala",
  "30": "Voidu",
  "31": "Xbox Store",
  "33": "PlayStation Store",
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
