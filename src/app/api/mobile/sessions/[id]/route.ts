import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { SesionError, apuntarse, cancelarSesion, listarSesiones, salirse } from "@/lib/sesiones";
import { sesionParaMovil } from "@/lib/sesionesMovil";
import { idiomaDeCabecera } from "@/lib/idiomasTrofeo";
import { errorMovil } from "@/lib/mensajesApi";

type Ctx = { params: Promise<{ id: string }> };

/** Ficha de una sesión, sea cual sea su estado (también cancelada o pasada). */
export async function GET(req: Request, { params }: Ctx) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  const { id } = await params;
  const [s] = await listarSesiones(userId, idiomaDeCabecera(req.headers.get("accept-language")), id);
  if (!s) return errorMovil(req, "Sesión no encontrada", 404);
  return NextResponse.json(sesionParaMovil(s));
}

/** `{ "accion": "unirse" | "salir" }`. Devuelve la ficha ya actualizada. */
export async function POST(req: Request, { params }: Ctx) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  if (!(await limitar("comentario", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  try {
    if (body?.accion === "unirse") await apuntarse(userId, id);
    else if (body?.accion === "salir") await salirse(userId, id);
    else return errorMovil(req, "Datos no válidos", 400);
  } catch (e) {
    if (e instanceof SesionError) return errorMovil(req, e.message, 409);
    throw e;
  }
  const [s] = await listarSesiones(userId, idiomaDeCabecera(req.headers.get("accept-language")), id);
  if (!s) return errorMovil(req, "Sesión no encontrada", 404);
  return NextResponse.json(sesionParaMovil(s));
}

/** Cancelarla (solo quien la organiza). Avisa a los apuntados. */
export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  const { id } = await params;
  try {
    await cancelarSesion(userId, id);
  } catch (e) {
    if (e instanceof SesionError) return errorMovil(req, e.message, 403);
    throw e;
  }
  return NextResponse.json({ ok: true });
}
