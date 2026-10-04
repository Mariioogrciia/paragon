import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { rachas } from "@/lib/history";
import { actividadPorDia } from "@/lib/profileStats";
import { jsonConEtag } from "@/lib/etag";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Detalle de la racha diaria, para la pantalla dedicada que se abre al
 * tocar el icono de fuego del Panel — no la Estadísticas completa (esa ya
 * tiene su propia tarjeta de rachas, pero es la pantalla entera, no un
 * detalle rápido). `dias` son los últimos 35 (5 semanas), suficiente para
 * una tira visual en una pantalla de móvil — el heatmap de 365 días de la
 * web (`actividadPorDia` en profileStats.ts) es de escritorio.
 */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const [racha, dias] = await Promise.all([rachas(userId), actividadPorDia(userId, 35)]);

  return jsonConEtag(req, {
    actual: racha.actual,
    mejor: racha.mejor,
    diasActivos: racha.diasActivos,
    dias: dias.map((d) => ({ dia: d.dia, trofeos: d.trofeos })),
  }, userId);
}
