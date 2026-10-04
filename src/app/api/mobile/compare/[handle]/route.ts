import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { getLibrary, getProfileByHandle, getProfileByUserId } from "@/lib/profiles";
import { sharedGames, summarise } from "@/lib/stats";
import { paragonProgress } from "@/lib/level";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Comparativa 1 a 1 — versión CURADA del `/comparar/[handle]` de la web:
 * mismos datos base (`sharedGames`), sin la carrera trofeo a trofeo
 * ("quién lo sacó antes", `sharedTrophyLeads`) — es la pieza más pesada de
 * la web y la que menos aporta en una pantalla pequeña.
 */
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

  const [mio, suyo] = await Promise.all([
    getProfileByUserId(userId),
    getProfileByHandle(handle),
  ]);

  if (!suyo) {
    return errorMovil(req, "No existe ese usuario", 404);
  }
  if (!mio?.handle) {
    return errorMovil(req, "Perfil sin terminar de configurar", 409);
  }
  if (suyo.accounts.length === 0) {
    return errorMovil(req, `@${handle} todavía no ha vinculado ninguna cuenta.`, 409);
  }

  const [libA, libB] = await Promise.all([getLibrary(mio), getLibrary(suyo)]);
  const statsA = summarise(libA.games);
  const statsB = summarise(libB.games);
  const nivelA = paragonProgress(libA.games, libA.xpMisiones);
  const nivelB = paragonProgress(libB.games, libB.xpMisiones);
  const comunes = sharedGames([libA, libB]);

  // Mismo criterio que la etiqueta "Vas ganando"/"Vas perdiendo"/"Empate"
  // de la web (comparar/[handle]/page.tsx) — se calcula aquí para que el
  // cliente móvil no tenga que repetir esta lógica.
  const platinoDif = statsA.platinos - statsB.platinos;
  const resultado: "gano" | "pierdo" | "empate" = platinoDif === 0 ? "empate" : platinoDif > 0 ? "gano" : "pierdo";

  return NextResponse.json({
    resultado,
    me: {
      name: libA.player.name,
      avatarUrl: libA.player.avatarUrl,
      level: nivelA.level,
      platinos: statsA.platinos,
      trofeos: statsA.trofeos,
      juegos: statsA.juegos,
    },
    them: {
      name: libB.player.name,
      avatarUrl: libB.player.avatarUrl,
      level: nivelB.level,
      platinos: statsB.platinos,
      trofeos: statsB.trofeos,
      juegos: statsB.juegos,
    },
    sharedGames: comunes.map((g) => ({
      id: g.id,
      title: g.title,
      iconUrl: g.iconUrl ?? null,
      myPercent: g.progress[0].percent,
      theirPercent: g.progress[1].percent,
      myHours: g.horas[0] ?? null,
      theirHours: g.horas[1] ?? null,
    })),
  });
}
