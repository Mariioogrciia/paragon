import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { createCollection, CollectionNameError, listCollections } from "@/lib/collections";
import { jsonConEtag } from "@/lib/etag";

/** Carpetas de juegos (colecciones) del usuario. */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const collections = await listCollections(userId);
  return jsonConEtag(req, { collections }, userId);
}

/** Crea una carpeta — `{ "name": "..." }`. */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!(await limitar("perfil", userId))) {
    return NextResponse.json({ error: "Demasiadas peticiones seguidas. Espera un momento." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";

  try {
    const id = await createCollection(userId, name);
    return NextResponse.json({ id });
  } catch (error) {
    const message = error instanceof CollectionNameError ? error.message : "No se pudo crear la carpeta.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
