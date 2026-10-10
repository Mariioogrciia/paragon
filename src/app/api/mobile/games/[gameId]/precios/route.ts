import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { errorMovil } from "@/lib/mensajesApi";
import { preciosDeJuego } from "@/lib/preciosJuego";

/**
 * Precio de un juego para la tarjeta de la ficha en la app: Steam España en
 * euros (el de las alertas), las mejores tiendas de CheapShark (dólares), el
 * mínimo histórico y tu alerta. `{ precios: null }` si no tiene versión de PC.
 */
export async function GET(req: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  const { gameId } = await params;
  const precios = await preciosDeJuego(gameId, userId).catch((error) => {
    console.error("[mobile-precios]", gameId, error);
    return null;
  });
  return NextResponse.json({ precios });
}
