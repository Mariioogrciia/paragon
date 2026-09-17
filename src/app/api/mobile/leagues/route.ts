import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { createLeague, listUserLeagues } from "@/lib/leagues";

/** Ligas propias del usuario — creadas por él o a las que le han añadido. */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const leagues = await listUserLeagues(userId);
  return NextResponse.json({ leagues });
}

/** Crea una liga — `{ "name": "..." }`. El creador entra como único miembro. */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";

  const league = await createLeague(userId, name);
  if (!league) {
    return NextResponse.json({ error: "Ponle un nombre a la liga." }, { status: 400 });
  }

  return NextResponse.json(league);
}
