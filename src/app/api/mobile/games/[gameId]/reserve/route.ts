import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { toggleReservedMilestone } from "@/lib/milestones";

/** Reserva/quita la reserva de este juego para el próximo hito redondo (#25, #50...) — mismo `toggleReservarHitoAction` que la web. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { gameId } = await params;
  const result = await toggleReservedMilestone(userId, gameId);
  return NextResponse.json(result);
}
