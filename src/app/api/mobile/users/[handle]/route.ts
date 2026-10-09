import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { getFriendshipStatus, getLibrary, getProfileByHandle, resolveAvatarUrl } from "@/lib/profiles";
import { summarise } from "@/lib/stats";
import { paragonProgress } from "@/lib/level";
import { errorMovil } from "@/lib/mensajesApi";
import { rachas, resumenHistorico, trofeosPorMes, ultimosTrofeos } from "@/lib/history";
import { horasTotales } from "@/lib/profileStats";
import { getUserClan } from "@/lib/clans";
import { idiomaDeCabecera } from "@/lib/idiomasTrofeo";

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

  // El perfil completo de la app (9 oct 2026): además de la cabecera, lo
  // mismo que cuenta el perfil de la web — racha, año, meses, últimos
  // trofeos, horas y clan. Todo sale de lo ya guardado, sin llamar a PSN.
  const [{ games, xpMisiones }, amistad, racha, resumen, meses, ultimos, horas, clan] = await Promise.all([
    getLibrary(profile),
    // Para el botón de amistad del perfil (6 oct 2026): "yo" si es tu perfil.
    profile.userId === userId ? Promise.resolve("yo" as const) : getFriendshipStatus(userId, profile.userId),
    rachas(profile.userId),
    resumenHistorico(profile.userId),
    trofeosPorMes(profile.userId, 12),
    ultimosTrofeos(profile.userId, 8, idiomaDeCabecera(req.headers.get("accept-language"))),
    horasTotales(profile.userId),
    getUserClan(profile.userId),
  ]);
  const stats = summarise(games);
  const nivel = paragonProgress(games, xpMisiones);

  // Los últimos jugados de verdad (sin lista de deseos). getLibrary ordena con
  // `desc(lastPlayedAt)`, y en Postgres eso pone primero los juegos SIN fecha
  // (NULLS FIRST): salían juegos cualquiera en vez de los recientes (6 oct 2026).
  const recent = games
    .filter((g) => !g.isWishlist)
    .sort((a, b) => (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""))
    .slice(0, 6);

  return NextResponse.json({
    userId: profile.userId,
    name: profile.displayName ?? profile.handle,
    handle: profile.handle,
    image: resolveAvatarUrl(profile) ?? null,
    level: nivel.level,
    amistad,
    platinos: stats.platinos,
    trofeos: stats.trofeos,
    juegos: stats.juegos,
    oros: stats.counts.gold,
    platas: stats.counts.silver,
    bronces: stats.counts.bronze,
    completadoMedio: stats.completadoMedio,
    horas,
    racha: { actual: racha.actual, mejor: racha.mejor, diasActivos: racha.diasActivos },
    esteAnio: resumen.esteAnio,
    mejorMes: resumen.mejorMes,
    porMes: meses,
    clan: clan ? { tag: clan.clan.tag, name: clan.clan.name, logoUrl: clan.clan.logoUrl ?? null } : null,
    ultimosTrofeos: ultimos.map((t) => ({
      gameId: t.gameId,
      juego: t.juego,
      trophyId: t.trophyId,
      nombre: t.nombre,
      detalle: t.detalle,
      grade: t.grade,
      iconUrl: t.iconUrl,
      earnedAt: t.earnedAt,
      rarityPercent: t.rarityPercent,
    })),
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
