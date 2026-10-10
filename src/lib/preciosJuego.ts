import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { games } from "@/db/schema";
import { getGameDetails } from "@/lib/igdb/client";
import { comparativaPreciosSteam, extraerSteamAppId, type OfertaPrecio } from "@/lib/prices";
import { precioSteamEs, type PrecioSteam } from "@/lib/steamPrecio";
import { getAlertaPrecio } from "@/lib/priceAlerts";

/**
 * AppID de Steam de cualquier juego de la base: el suyo si es de Steam, y si
 * no (PSN, Xbox, a mano...) el que enlaza IGDB para su versión de PC — mismo
 * criterio que la ficha web (/juego/[id]). null si no tiene versión en Steam.
 */
export async function steamAppIdDeJuego(gameId: string): Promise<string | null> {
  const [juego] = await db
    .select({ platform: games.platform, nativeId: games.nativeId, igdbId: games.igdbId })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);
  if (!juego) return null;
  if (juego.platform === "steam" && /^\d+$/.test(juego.nativeId)) return juego.nativeId;
  if (!juego.igdbId) return null;
  const detalles = await getGameDetails(juego.igdbId).catch(() => null);
  return extraerSteamAppId(detalles?.websites);
}

export interface PreciosJuego {
  steamAppId: string;
  /** Steam España, en euros (el de las alertas). null si no está a la venta. */
  precio: PrecioSteam | null;
  /** CheapShark: tiendas de EE. UU., en dólares. */
  ofertas: OfertaPrecio[];
  minimoHistoricoUsd: number | null;
  /** Precio objetivo de tu alerta, si tienes una. */
  alerta: number | null;
}

/** Lo que enseña la tarjeta de precio de la ficha en la app. null sin versión de PC. */
export async function preciosDeJuego(gameId: string, userId: string): Promise<PreciosJuego | null> {
  const steamAppId = await steamAppIdDeJuego(gameId);
  if (!steamAppId) return null;
  const [precio, comparativa, alerta] = await Promise.all([
    precioSteamEs(steamAppId),
    comparativaPreciosSteam(steamAppId),
    getAlertaPrecio(userId, steamAppId).catch(() => null),
  ]);
  return {
    steamAppId,
    precio,
    ofertas: (comparativa?.ofertas ?? []).slice(0, 4),
    minimoHistoricoUsd: comparativa?.precioMasBajoHistorico ?? null,
    alerta: alerta?.precioObjetivo ?? null,
  };
}
