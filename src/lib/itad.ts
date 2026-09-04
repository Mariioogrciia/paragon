import "server-only";

/**
 * Histórico de precios vía IsThereAnyDeal (ITAD). A diferencia de CheapShark
 * (lib/prices.ts, que solo da el precio ACTUAL por tienda y un único
 * "mínimo histórico" sin fecha), ITAD guarda un registro real de cambios de
 * precio en el tiempo — es la única fuente pública que permite un gráfico de
 * verdad, no un dato inventado.
 *
 * Necesita `ITAD_API_KEY` (gratis, registrando una app en
 * https://isthereanydeal.com/apps/my/). Sin la clave, todo esto devuelve
 * `null`/`[]` en silencio — igual que el resto de integraciones opcionales
 * del proyecto (IGDB, PSN) cuando falta su credencial.
 *
 * Solo cubre Steam, por el mismo motivo que `comparativaPreciosSteam`: ITAD
 * cruza tiendas de PC, no hay AppID equivalente para PSN.
 */

const API_BASE = "https://api.isthereanydeal.com";

async function itadFetch<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const key = process.env.ITAD_API_KEY;
  if (!key) return null;

  const qs = new URLSearchParams({ key, ...params });
  try {
    const res = await fetch(`${API_BASE}${path}?${qs.toString()}`, {
      next: { revalidate: 21_600 }, // 6h, igual que CheapShark: no hace falta más fresco.
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (error) {
    console.error("[itad]", error);
    return null;
  }
}

/**
 * Steam AppID → id interno de ITAD (un UUID). Hace falta como paso previo:
 * el histórico se pide por ese id, no por AppID directamente.
 */
async function lookupItadId(steamAppId: string): Promise<string | null> {
  const data = await itadFetch<{ found: boolean; game?: { id: string } }>("/games/lookup/v1", {
    appid: steamAppId,
  });
  return data?.found && data.game ? data.game.id : null;
}

export interface PuntoPrecio {
  fecha: string; // ISO, tal cual lo da ITAD
  precio: number;
  precioOriginal: number;
  tienda: string;
}

/**
 * Histórico de precios de un juego de Steam, ordenado por fecha ascendente.
 * `desdeAnios` limita cuánto atrás se pide (ITAD por defecto solo da los
 * últimos 3 meses si no se especifica `since`). 5 años por defecto: el
 * gráfico (PriceHistoryChart) tiene un selector de rango tipo cripto
 * (7D/1M/3M/1A/Todo) — para que "1A" y "Todo" digan algo de verdad hace
 * falta pedir más de lo que se va a enseñar por defecto, no solo 2 años.
 */
export async function historicoPreciosSteam(appId: string, desdeAnios = 5): Promise<PuntoPrecio[]> {
  const itadId = await lookupItadId(appId);
  if (!itadId) return [];

  const desde = new Date();
  desde.setFullYear(desde.getFullYear() - desdeAnios);
  // ITAD rechaza el ISO estándar de JS (milisegundos + "Z") con 400 "Invalid
  // 'since' format" — comprobado a mano contra la API real. Quiere segundos
  // enteros y un offset explícito (+00:00), no "Z".
  const desdeIso = desde.toISOString().replace(/\.\d+Z$/, "+00:00");

  const entradas = await itadFetch<
    {
      timestamp: string;
      shop: { id: number; name: string };
      deal: {
        price: { amount: number };
        regular: { amount: number };
      };
    }[]
  >(`/games/history/v2`, {
    id: itadId,
    country: "ES",
    since: desdeIso,
  });

  if (!entradas || entradas.length === 0) return [];

  return entradas
    .map((e) => ({
      fecha: e.timestamp,
      precio: e.deal.price.amount,
      precioOriginal: e.deal.regular.amount,
      tienda: e.shop.name,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
