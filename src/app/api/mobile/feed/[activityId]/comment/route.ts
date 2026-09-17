import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { addActivityComment } from "@/lib/feed";

/** Añade un comentario a una publicación del Feed — mismo `addActivityCommentAction` que la web. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { activityId } = await params;
  const { body } = await req.json().catch(() => ({ body: "" }));
  const comment = await addActivityComment(userId, activityId, String(body ?? ""));
  if (!comment) {
    return NextResponse.json({ error: "Comentario vacío" }, { status: 400 });
  }

  return NextResponse.json(comment);
}
