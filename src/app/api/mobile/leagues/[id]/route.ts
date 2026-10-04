import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getLeagueDetail, deleteLeague } from "@/lib/leagues";
import { errorMovil } from "@/lib/mensajesApi";

/** Clasificación de una liga (mes en curso) — 404 si no existe o si no eres miembro. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const { id } = await params;
  const league = await getLeagueDetail(id, userId);
  if (!league) {
    return errorMovil(req, "Liga no encontrada", 404);
  }

  return NextResponse.json({ ...league, isOwner: league.ownerId === userId });
}

/** Borra la liga entera — solo el dueño. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const { id } = await params;
  const ok = await deleteLeague(id, userId);
  if (!ok) {
    return errorMovil(req, "No se pudo borrar la liga.", 403);
  }

  return NextResponse.json({ ok: true });
}
