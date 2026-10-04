import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { toggleGameInCollection } from "@/lib/collections";

/** Mete/saca este juego de la carpeta. `dentro: false` si la carpeta no es tuya (o no existe). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; gameId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!(await limitar("perfil", userId))) {
    return NextResponse.json({ error: "Demasiadas peticiones seguidas. Espera un momento." }, { status: 429 });
  }

  const { id, gameId } = await params;
  const dentro = await toggleGameInCollection(userId, id, gameId);
  return NextResponse.json({ dentro });
}
