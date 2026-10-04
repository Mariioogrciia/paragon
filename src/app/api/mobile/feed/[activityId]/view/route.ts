import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { registerActivityView } from "@/lib/feed";
import { errorMovil } from "@/lib/mensajesApi";

/** Registra una visualización de una publicación del Feed — idempotente, ver activity_view en db/schema.ts. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const { activityId } = await params;
  const result = await registerActivityView(userId, activityId);
  return NextResponse.json(result);
}
