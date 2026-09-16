import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getLibrary, getProfileByHandle, getProfileByUserId } from "@/lib/profiles";
import { sharedGames, summarise } from "@/lib/stats";
import { paragonProgress } from "@/lib/level";

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
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { handle } = await params;

  const [mio, suyo] = await Promise.all([
    getProfileByUserId(userId),
    getProfileByHandle(handle),
  ]);

  if (!suyo) {
    return NextResponse.json({ error: "No existe ese usuario" }, { status: 404 });
  }
  if (!mio?.handle) {
    return NextResponse.json({ error: "Perfil sin terminar de configurar" }, { status: 409 });
  }
  if (suyo.accounts.length === 0) {
    return NextResponse.json({ error: `@${handle} todavía no ha vinculado ninguna cuenta.` }, { status: 409 });
  }

  const [libA, libB] = await Promise.all([getLibrary(mio), getLibrary(suyo)]);
  const statsA = summarise(libA.games);
  const statsB = summarise(libB.games);
  const nivelA = paragonProgress(libA.games);
  const nivelB = paragonProgress(libB.games);
  const comunes = sharedGames([libA, libB]);

  return NextResponse.json({
    me: {
      name: libA.player.name,
      level: nivelA.level,
      platinos: statsA.platinos,
      trofeos: statsA.trofeos,
      juegos: statsA.juegos,
    },
    them: {
      name: libB.player.name,
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
