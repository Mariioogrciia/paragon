import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { addActivityComment, ComentarioOfensivoError } from "@/lib/feed";
import { limitar } from "@/lib/rateLimit";
import { errorMovil } from "@/lib/mensajesApi";

/** Añade un comentario a una publicación del Feed — mismo `addActivityCommentAction` que la web. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }
  if (!(await limitar("comentario", userId))) {
    return errorMovil(req, "Demasiados comentarios seguidos. Espera un momento.", 429);
  }

  const { activityId } = await params;
  const { body } = await req.json().catch(() => ({ body: "" }));
  let comment;
  try {
    comment = await addActivityComment(userId, activityId, String(body ?? ""));
  } catch (error) {
    if (error instanceof ComentarioOfensivoError) {
      return errorMovil(req, error.message, 400);
    }
    throw error;
  }
  if (!comment) {
    return errorMovil(req, "Comentario vacío", 400);
  }

  return NextResponse.json(comment);
}
