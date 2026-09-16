import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
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

  const { id, gameId } = await params;
  const dentro = await toggleGameInCollection(userId, id, gameId);
  return NextResponse.json({ dentro });
}
