import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { errorMovil } from "@/lib/mensajesApi";
import { estadoTelegram, desvincularTelegram, telegramActivo } from "@/lib/telegram";
import { cambiarSuscripcion, correoActivo, estaSuscrito } from "@/lib/correo";

/**
 * Otros sitios donde recibir los avisos, para Ajustes → Avisos de la app
 * (6 nov 2026): Telegram (lib/telegram.ts) y el resumen semanal por correo
 * (lib/correo.ts). Cada uno solo sale si el servidor lo tiene montado.
 */
async function estado(userId: string) {
  const [telegram, suscrito] = await Promise.all([
    telegramActivo() ? estadoTelegram(userId) : Promise.resolve(null),
    correoActivo() ? estaSuscrito(userId).catch(() => false) : Promise.resolve(null),
  ]);
  return {
    telegram: telegram ? { vinculado: telegram.vinculado, enlace: telegram.enlace } : null,
    correoSemanal: suscrito,
  };
}

export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  return NextResponse.json(await estado(userId));
}

/** `{ correoSemanal?: boolean, desvincularTelegram?: true }` */
export async function PATCH(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  const cuerpo = (await req.json().catch(() => null)) as { correoSemanal?: unknown; desvincularTelegram?: unknown } | null;
  if (typeof cuerpo?.correoSemanal === "boolean" && correoActivo()) await cambiarSuscripcion(userId, cuerpo.correoSemanal);
  if (cuerpo?.desvincularTelegram === true) await desvincularTelegram(userId);
  return NextResponse.json(await estado(userId));
}
