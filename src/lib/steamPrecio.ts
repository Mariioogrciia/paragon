import "server-only";

export interface PrecioSteam {
  /** Precio final en euros (con descuento aplicado). */
  final: number;
  /** Precio sin descuento, en euros. */
  inicial: number;
  descuento: number;
}

/**
 * Precio actual en la tienda de Steam ESPAÑA (`cc=es`, euros) — el que de
 * verdad paga un usuario de aquí. CheapShark (lib/prices.ts) solo da precios
 * de tiendas de EE. UU. en dólares, que no sirven para "avísame cuando baje
 * de 20 €". `null` si el juego es gratis, no está a la venta o Steam falla.
 */
export async function precioSteamEs(appId: string): Promise<PrecioSteam | null> {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appId)}&cc=es&filters=price_overview`,
      { signal: AbortSignal.timeout(10_000), next: { revalidate: 3_600 } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as Record<
      string,
      { success: boolean; data?: { price_overview?: { currency: string; initial: number; final: number; discount_percent: number } } }
    >;
    const precio = json[appId]?.data?.price_overview;
    if (!json[appId]?.success || !precio || precio.currency !== "EUR") return null;
    return { final: precio.final / 100, inicial: precio.initial / 100, descuento: precio.discount_percent };
  } catch (error) {
    console.error("[steam-precio]", appId, error instanceof Error ? error.message : error);
    return null;
  }
}
