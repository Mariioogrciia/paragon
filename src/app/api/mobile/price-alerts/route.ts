import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { errorMovil } from "@/lib/mensajesApi";
import { limitar } from "@/lib/rateLimit";
import { borrarAlertaPrecio, getAlertasPrecio, guardarAlertaPrecio } from "@/lib/priceAlerts";
import { precioSteamEs } from "@/lib/steamPrecio";

/**
 * Alertas de precio desde la app — las mismas de la web (lib/priceAlerts.ts,
 * mismas reglas que `guardarAlertaPrecioAction`): las comprueba el cron y el
 * aviso llega por push (FCM en Android; en iOS, sin push, en la app).
 *
 * GET: tus alertas con el precio de ahora en Steam España.
 * POST { steamAppId, gameId, titulo, precioObjetivo }: crea o cambia.
 * DELETE ?steamAppId=: la quita.
 */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  const alertas = await getAlertasPrecio(userId);
  const precios: (Awaited<ReturnType<typeof precioSteamEs>>)[] = [];
  for (let i = 0; i < alertas.length; i += 4) {
    precios.push(...(await Promise.all(alertas.slice(i, i + 4).map((a) => precioSteamEs(a.steamAppId)))));
  }
  return NextResponse.json({
    alertas: alertas.map((a, i) => ({
      steamAppId: a.steamAppId,
      gameId: a.gameId,
      titulo: a.titulo,
      precioObjetivo: a.precioObjetivo,
      precio: precios[i],
      avisadoAt: a.avisadoAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  if (!(await limitar("perfil", userId))) return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);

  const body = await req.json().catch(() => null);
  const steamAppId = String(body?.steamAppId ?? "");
  const gameId = String(body?.gameId ?? "");
  const precio = Number(body?.precioObjetivo);
  if (!/^\d{1,10}$/.test(steamAppId) || !gameId || gameId.length > 100) return errorMovil(req, "Juego no válido.", 400);
  if (!Number.isFinite(precio) || precio < 0.01 || precio > 999) return errorMovil(req, "Pon un precio entre 0,01 y 999 €.", 400);

  await guardarAlertaPrecio(userId, {
    steamAppId,
    gameId,
    titulo: String(body?.titulo ?? "").trim().slice(0, 120) || "Tu juego",
    precioObjetivo: Math.round(precio * 100) / 100,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  const steamAppId = new URL(req.url).searchParams.get("steamAppId") ?? "";
  if (!/^\d{1,10}$/.test(steamAppId)) return errorMovil(req, "Juego no válido.", 400);
  await borrarAlertaPrecio(userId, steamAppId);
  return NextResponse.json({ ok: true });
}
