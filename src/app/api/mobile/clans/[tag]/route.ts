import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getClanByTag, getClanLeaderboard, getClanActivity, getInvitableFriends } from "@/lib/clans";

/**
 * Ficha de un clan — mismo dato que `/clanes/[tag]` (web): clan +
 * leaderboard (Paragon Score de cada miembro, ya ordenado) + actividad
 * reciente (sin reacciones/comentarios, ver `getClanActivity`) +
 * `amIMember`/`amIOwner` + `invitables` (amigos que el owner puede
 * invitar — solo se calcula si el que pregunta es el owner, igual que la
 * web: "nadie más lo va a ver").
 */
export async function GET(req: Request, { params }: { params: Promise<{ tag: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { tag } = await params;
  const clan = await getClanByTag(tag);
  if (!clan) {
    return NextResponse.json({ error: "Clan no encontrado" }, { status: 404 });
  }

  const [leaderboard, actividad] = await Promise.all([
    getClanLeaderboard(clan.id),
    getClanActivity(clan.id),
  ]);
  const score = leaderboard.reduce((sum, m) => sum + m.score, 0);

  const amIMember = leaderboard.some((m) => m.userId === userId);
  const amIOwner = clan.ownerId === userId;
  const invitables = amIOwner ? await getInvitableFriends(userId, clan.id) : [];

  return NextResponse.json({
    clan: { id: clan.id, tag: clan.tag, name: clan.name, description: clan.description },
    score,
    leaderboard,
    activity: actividad,
    amIMember,
    amIOwner,
    invitables,
  });
}
