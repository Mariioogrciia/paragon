import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { getLibrary, getProfileByHandle, resolveAvatarUrl } from "@/lib/profiles";
import { summarise } from "@/lib/stats";
import { paragonProgress } from "@/lib/level";
import { errorMovil } from "@/lib/mensajesApi";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }
  if (!(await limitar("perfil", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }

  const { handle } = await params;

  const profile = await getProfileByHandle(handle);

  if (!profile) {
    return errorMovil(req, "No existe ese usuario", 404);
  }

  const { games, xpMisiones } = await getLibrary(profile);
  const stats = summarise(games);
  const nivel = paragonProgress(games, xpMisiones);

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
