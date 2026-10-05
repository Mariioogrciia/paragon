import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { acceptFriendRequest, removeFriend } from "@/lib/profiles";
import { errorMovil } from "@/lib/mensajesApi";

type Ctx = { params: Promise<{ userId: string }> };

/** Aceptar la solicitud que te envió `userId`. */
export async function POST(req: Request, { params }: Ctx) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  const { userId: otro } = await params;
  await acceptFriendRequest(userId, otro);
  return NextResponse.json({ ok: true });
}

/** Rechazar su solicitud o dejar de ser amigos (la misma fila). */
export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  const { userId: otro } = await params;
  await removeFriend(userId, otro);
  return NextResponse.json({ ok: true });
}
