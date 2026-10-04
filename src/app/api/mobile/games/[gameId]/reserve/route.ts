import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
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
  if (!(await limitar("perfil", userId))) {
    return NextResponse.json({ error: "Demasiadas peticiones seguidas. Espera un momento." }, { status: 429 });
  }

  const { gameId } = await params;
  const result = await toggleReservedMilestone(userId, gameId);
  return NextResponse.json(result);
}
