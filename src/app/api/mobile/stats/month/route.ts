import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { desgloseDelMes, esMesValido, trofeosDelMes } from "@/lib/history";
import { errorMovil } from "@/lib/mensajesApi";
import { listFriends } from "@/lib/profiles";

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

  // `?de=<handle>`: el mes de un AMIGO, para compararlo con el tuyo (Mes a mes).
  const de = new URL(req.url).searchParams.get("de");
  let quien = userId;
  if (de) {
    const amigo = (await listFriends(userId)).find((a) => a.handle?.toLowerCase() === de.toLowerCase());
    if (!amigo) return errorMovil(req, "Solo puedes compararte con tus amigos", 403);
    quien = amigo.userId;
  }

  const [desglose, trofeos] = await Promise.all([desgloseDelMes(quien, mes), trofeosDelMes(quien, mes)]);
  return NextResponse.json({ mes, total: desglose.total, porDia: desglose.porDia, porJuego: desglose.porJuego, trofeos });
}
