import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { listFriends } from "@/lib/profiles";
import { clasificacionAmigos } from "@/lib/rankings";
import { getLigaMensual } from "@/lib/ligas";

/**
 * Datos de SocialScreen (Android): las dos pestañas del plan, "Amigos" y
 * "Ligas", son conceptos DISTINTOS en el backend — no la misma lista con
 * otro orden:
 *  - `amigos`: solo tú + tus amigos reales (clasificacionAmigos), con tus
 *    platinos/trofeos/nivel de siempre.
 *  - `liga`: la liga mensual GLOBAL (src/lib/ligas.ts) — todo el mundo,
 *    puntuada solo por trofeos conseguidos ESTE mes (platino=100,
 *    oro=50, plata=25, bronce/sin metal=10), se reinicia cada mes.
 */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const friends = await listFriends(userId);
  const friendIds = [userId, ...friends.map((f) => f.userId)];

  const [amigos, liga] = await Promise.all([
    clasificacionAmigos(friendIds),
    getLigaMensual(),
  ]);

  return NextResponse.json({ amigos, liga });
}
