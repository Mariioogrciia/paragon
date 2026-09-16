import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getLibrary, getProfileByHandle, resolveAvatarUrl } from "@/lib/profiles";
import { summarise } from "@/lib/stats";
import { paragonProgress } from "@/lib/level";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { handle } = await params;

  const profile = await getProfileByHandle(handle);

  if (!profile) {
    return NextResponse.json({ error: "No existe ese usuario" }, { status: 404 });
  }

  const { games } = await getLibrary(profile);
  const stats = summarise(games);
  const nivel = paragonProgress(games);

  // Tomamos los últimos jugados (sin wishlist)
  const recent = games.filter((g) => !g.isWishlist).slice(0, 3);

  return NextResponse.json({
    userId: profile.userId,
    name: profile.displayName ?? profile.handle,
    handle: profile.handle,
    image: resolveAvatarUrl(profile) ?? null,
    level: nivel.level,
    platinos: stats.platinos,
    trofeos: stats.trofeos,
    accounts: profile.accounts.map(acc => ({
      platform: acc.platform,
      username: acc.username
    })),
    recentGames: recent.map(g => ({
      id: g.id,
      title: g.title,
      coverUrl: g.iconUrl ?? "",
      percent: g.progressPercent
    }))
  });
}
