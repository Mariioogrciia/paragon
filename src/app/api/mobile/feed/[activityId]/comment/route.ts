import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { addActivityComment, ComentarioOfensivoError } from "@/lib/feed";
import { limitar } from "@/lib/rateLimit";

/** Añade un comentario a una publicación del Feed — mismo `addActivityCommentAction` que la web. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!(await limitar("comentario", userId))) {
    return NextResponse.json({ error: "Demasiados comentarios seguidos. Espera un momento." }, { status: 429 });
  }

  const { activityId } = await params;
  const { body } = await req.json().catch(() => ({ body: "" }));
  let comment;
  try {
    comment = await addActivityComment(userId, activityId, String(body ?? ""));
  } catch (error) {
    if (error instanceof ComentarioOfensivoError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
  if (!comment) {
    return NextResponse.json({ error: "Comentario vacío" }, { status: 400 });
  }

  return NextResponse.json(comment);
}
