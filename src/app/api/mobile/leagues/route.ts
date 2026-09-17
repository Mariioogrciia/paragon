import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { createLeague, listUserLeagues, type LeagueDurationUnit } from "@/lib/leagues";

const UNIDADES_DURACION: LeagueDurationUnit[] = ["dias", "semanas", "meses", "anios"];

/** Ligas propias del usuario — creadas por él o a las que le han añadido y ya aceptó (ver GET .../invites para las pendientes). */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const leagues = await listUserLeagues(userId);
  return NextResponse.json({ leagues });
}

/** Crea una liga — `{ "name": "...", "durationValue"?: number, "durationUnit"?: "dias"|"semanas"|"meses"|"anios" }`. El creador entra como único miembro. */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";
  const durationValue = Number(body?.durationValue);
  const durationUnit = UNIDADES_DURACION.includes(body?.durationUnit) ? (body.durationUnit as LeagueDurationUnit) : null;
  const duration = durationValue > 0 && durationUnit ? { value: durationValue, unit: durationUnit } : undefined;

  const league = await createLeague(userId, name, duration);
  if (!league) {
    return NextResponse.json({ error: "Ponle un nombre a la liga." }, { status: 400 });
  }

  return NextResponse.json(league);
}
