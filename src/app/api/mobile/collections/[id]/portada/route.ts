import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { portadaDeCarpeta, setPortadaCarpeta } from "@/lib/collections";
import { subirArchivoPerfil } from "@/lib/uploads";
import { limitar } from "@/lib/rateLimit";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Foto de una carpeta — `multipart/form-data`, campo `file`. Mismo
 * subidor endurecido que el avatar (lib/uploads.ts: formato real, 4 MB, y
 * borra la foto anterior de esta carpeta si era nuestra).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }
  if (!(await limitar("subida", userId))) {
    return errorMovil(req, "Demasiadas subidas seguidas. Prueba dentro de unos minutos.", 429);
  }

  const { id } = await params;
  const actual = await portadaDeCarpeta(userId, id);
  if (actual === undefined) {
    return errorMovil(req, "Carpeta no encontrada", 404);
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file") as File | null;
  if (!file) {
    return errorMovil(req, "No se envió ningún archivo", 400);
  }

  const resultado = await subirArchivoPerfil(userId, file, "carpeta", actual);
  if ("error" in resultado) {
    return errorMovil(req, resultado.error, resultado.status);
  }

  await setPortadaCarpeta(userId, id, resultado.url);
  return NextResponse.json({ url: resultado.url });
}

/** Quita la foto: la carpeta vuelve a enseñar las carátulas de sus juegos. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }
  const { id } = await params;
  if ((await portadaDeCarpeta(userId, id)) === undefined) {
    return errorMovil(req, "Carpeta no encontrada", 404);
  }
  await setPortadaCarpeta(userId, id, null);
  return NextResponse.json({ ok: true });
}
