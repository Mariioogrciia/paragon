import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { toggleActivityReaction } from "@/lib/feed";

/**
 * Reacciona/quita la reacción a una publicación del Feed — mismo
 * `toggleActivityReactionAction` que la web. `reaction` en el body es
 * opcional (👏🔥🏆😂😮, ver lib/reacciones.ts): sin ella, o si no es una
 * clave válida, `toggleActivityReaction` cae en "aplauso" — así una app
 * Android vieja que todavía no mande el campo se sigue comportando igual
 * que antes del 30 sept 2026.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!(await limitar("reaccion", userId))) {
    return NextResponse.json({ error: "Demasiadas peticiones seguidas. Espera un momento." }, { status: 429 });
  }

  const { activityId } = await params;
  const body = await req.json().catch(() => null);
  const reaction = typeof body?.reaction === "string" ? body.reaction : undefined;
  const result = await toggleActivityReaction(userId, activityId, reaction);
  return NextResponse.json(result);
}
