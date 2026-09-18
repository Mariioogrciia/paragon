import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getLibrary, getProfileByUserId, resolveAvatarUrl } from "@/lib/profiles";
import { summarise } from "@/lib/stats";
import { paragonProgress } from "@/lib/level";
import { rachas } from "@/lib/history";

/** Datos de la pantalla de Panel nativa (Android/Compose). Mismo cálculo que la portada web (`app/page.tsx`), reempaquetado en JSON. */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const profile = await getProfileByUserId(userId);
  if (!profile?.handle) {
    return NextResponse.json({ error: "Perfil sin terminar de configurar" }, { status: 409 });
  }

  const [{ games }, racha] = await Promise.all([getLibrary(profile), rachas(userId)]);
  const stats = summarise(games);
  const nivel = paragonProgress(games);
  const psn = profile.accounts.find((a) => a.platform === "psn");

  return NextResponse.json({
    profile: {
      handle: profile.handle,
      name: profile.displayName ?? profile.handle,
      level: nivel.level,
      psnId: psn?.username ?? psn?.accountId ?? null,
      // Misma foto que se ve en toda la web (resolveAvatarUrl: subida a
      // mano > PSN > cualquier otra cuenta > la del proveedor de login) —
      // así la app arranca ya "vinculada" con la de la web sin nada más.
      image: resolveAvatarUrl(profile) ?? null,
    },
    stats: {
      platinums: stats.platinos,
      trophies: stats.trofeos,
      games: stats.juegos,
      completionRate: stats.completadoMedio,
      // `summarise()` ya calculaba este desglose por metal (counts.gold/
      // silver/bronze) — solo faltaba devolverlo aquí. La app nativa
      // llevaba mostrando esto con datos de PRUEBA hardcodeados
      // (`PanelRepository.getMockTrophyCounts()`), aunque el dato real ya
      // se calculaba en el servidor desde el principio.
      gold: stats.counts.gold,
      silver: stats.counts.silver,
      bronze: stats.counts.bronze,
    },
    // Mismo cálculo que /api/mobile/stats (lib/history.ts) — se duplica
    // aquí a propósito solo el dato (no la función) para que el Panel
    // pueda pintar la racha en la cabecera sin pedir el endpoint entero
    // de Estadísticas de fondo cada vez que se abre la app.
    racha: {
      actual: racha.actual,
      mejor: racha.mejor,
    },
  });
}
