import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { addLeagueMember, NotFriendsError } from "@/lib/leagues";

/** Añade un amigo a la liga — `{ "userId": "..." }`, solo el dueño puede invitar, y solo a un amigo real. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const friendUserId = typeof body?.userId === "string" ? body.userId : "";
  if (!friendUserId) {
    return NextResponse.json({ error: "Falta el usuario a añadir" }, { status: 400 });
  }

  try {
    const ok = await addLeagueMember(id, userId, friendUserId);
    if (!ok) return NextResponse.json({ error: "Solo el dueño puede invitar." }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFriendsError) {
      return NextResponse.json({ error: "Solo puedes invitar a amigos." }, { status: 400 });
    }
    throw error;
  }
}
