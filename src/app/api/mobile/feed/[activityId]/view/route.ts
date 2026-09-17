import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { registerActivityView } from "@/lib/feed";

/** Registra una visualización de una publicación del Feed — idempotente, ver activity_view en db/schema.ts. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { activityId } = await params;
  const result = await registerActivityView(userId, activityId);
  return NextResponse.json(result);
}
