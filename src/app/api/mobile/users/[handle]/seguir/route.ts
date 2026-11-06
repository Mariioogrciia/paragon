import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { errorMovil } from "@/lib/mensajesApi";
import { getProfileByHandle } from "@/lib/profiles";
import { cambiarSeguir, estadoSeguir, SeguirError } from "@/lib/seguir";

/** Seguir (POST) o dejar de seguir (DELETE) a alguien desde la app (lib/seguir.ts). Devuelve el estado nuevo. */
async function cambiar(req: Request, params: Promise<{ handle: string }>, seguir: boolean) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  if (!(await limitar("perfil", userId))) return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  const { handle } = await params;
  const perfil = await getProfileByHandle(handle);
  if (!perfil) return errorMovil(req, "No existe ese usuario", 404);
  try {
    await cambiarSeguir(userId, perfil.userId, seguir);
  } catch (error) {
    if (error instanceof SeguirError) return errorMovil(req, error.message, 400);
    throw error;
  }
  return NextResponse.json(await estadoSeguir(userId, perfil.userId));
}

export async function POST(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  return cambiar(req, params, true);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  return cambiar(req, params, false);
}
