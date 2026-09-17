import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { toggleActivityReaction } from "@/lib/feed";

/** Reacciona/quita la reacción a una publicación del Feed — mismo `toggleActivityReactionAction` que la web. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { activityId } = await params;
  const result = await toggleActivityReaction(userId, activityId);
  return NextResponse.json(result);
}
