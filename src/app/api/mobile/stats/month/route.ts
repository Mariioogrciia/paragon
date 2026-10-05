import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { desgloseDelMes, esMesValido, trofeosDelMes } from "@/lib/history";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Desglose de un mes (`?mes=YYYY-MM`, por defecto el actual en UTC), como
 * /ritmo en la web: trofeos por día (los días a cero incluidos), por juego y
 * la lista de cada trofeo conseguido, del más reciente al más antiguo.
 */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);

  const hoy = new Date();
  const actual = `${hoy.getUTCFullYear()}-${String(hoy.getUTCMonth() + 1).padStart(2, "0")}`;
  const pedido = new URL(req.url).searchParams.get("mes");
  const mes = pedido && esMesValido(pedido) ? pedido : actual;

  const [desglose, trofeos] = await Promise.all([desgloseDelMes(userId, mes), trofeosDelMes(userId, mes)]);
  return NextResponse.json({ mes, total: desglose.total, porDia: desglose.porDia, porJuego: desglose.porJuego, trofeos });
}
