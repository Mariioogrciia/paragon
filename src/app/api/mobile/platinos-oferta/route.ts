import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { errorMovil } from "@/lib/mensajesApi";
import { platinosDeOferta } from "@/lib/platinosOferta";

/**
 * "Platinos de oferta" (lib/platinosOferta.ts): juegos de Steam rebajados con
 * un 100 % asequible, sin los que ya tienes en Steam.
 */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  const ofertas = await platinosDeOferta(userId, 15).catch((error) => {
    console.error("[mobile-platinos-oferta]", error);
    return [];
  });
  return NextResponse.json({ ofertas });
}
