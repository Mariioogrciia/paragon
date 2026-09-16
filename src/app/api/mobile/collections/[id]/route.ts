import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { CollectionNameError, deleteCollection, renameCollection } from "@/lib/collections";

/** Renombra una carpeta — `{ "name": "..." }`. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";

  try {
    await renameCollection(userId, id, name);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof CollectionNameError ? error.message : "No se pudo renombrar la carpeta.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  await deleteCollection(userId, id);
  return NextResponse.json({ ok: true });
}
