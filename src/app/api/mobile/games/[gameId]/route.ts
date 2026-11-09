import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getGameDetail, getProfileByHandle, getProfileByUserId } from "@/lib/profiles";
import { idiomaDeCabecera } from "@/lib/idiomasTrofeo";
import { errorMovil } from "@/lib/mensajesApi";
import { gameProgress } from "@/lib/stats";
import { generarDiarioPlatino } from "@/lib/diarioPlatino";
import { planPlatino } from "@/lib/planPlatino";
import { platinosMasRapidos } from "@/lib/platinoRapido";
import { cantidadDelTexto } from "@/lib/coleccionablesReglas";
import { getRetirados, ocultosDelPerfil } from "@/lib/retirados";

/**
 * Ficha de un juego para GameDetailScreen (Android) — mismo `getGameDetail`
 * de la web (src/app/u/[handle]/[gameId]/page.tsx): puede lanzar un sync de
 * trofeos en segundo plano si estaban desactualizados, así que la primera
 * carga tras vincular una cuenta puede tardar algo más que las siguientes.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const propio = await getProfileByUserId(userId);
  if (!propio?.handle) {
    return errorMovil(req, "Perfil sin terminar de configurar", 409);
  }
  // `?de=<handle>`: la ficha de ese juego de OTRA persona (desde su perfil),
  // pública igual que /u/[handle]/[gameId] en la web.
  const de = new URL(req.url).searchParams.get("de");
  const profile = de && de !== propio.handle ? await getProfileByHandle(de) : propio;
  if (!profile) {
    return errorMovil(req, "Perfil no encontrado", 404);
  }

  const { gameId } = await params;
  // Un juego que su dueño ocultó de su perfil público no se abre para nadie más.
  if (profile !== propio && (await ocultosDelPerfil(profile.userId)).has(gameId)) {
    return errorMovil(req, "Juego no encontrado", 404);
  }
  const detail = await getGameDetail(profile, gameId, idiomaDeCabecera(req.headers.get("accept-language")));
  if (!detail) {
    return errorMovil(req, "Juego no encontrado", 404);
  }

  // "El Diario del Platino", como en la web: solo con el platino (o su
  // equivalente sin metales) conseguido y fechas de verdad; si no, null.
  const platinado = gameProgress(detail).platinumEarned;
  const diario = platinado ? generarDiarioPlatino(detail.trophies) : null;

  // Lo de la web del 5 nov 2026 también en la app (6 nov):
  // - el plan de platino (lib/planPlatino.ts), solo en tu ficha y sin platino;
  //   cada fase con los ids de lo que falta (la app ya tiene los trofeos);
  // - los platinos más rápidos del juego (todas sus versiones si hay igdbId);
  // - cuántos coleccionables pide cada trofeo (para la lista con casillas).
  const plan = profile === propio && !platinado ? planPlatino(detail.trophies) : null;
  const rapidos = await platinosMasRapidos(detail.igdbId ? String(detail.igdbId) : detail.id, 5).catch(() => []);
  const game = {
    ...detail,
    trophies: detail.trophies.map((t) => ({ ...t, coleccionables: cantidadDelTexto(t.name, t.detail) })),
  };
  const marcas = profile === propio ? await getRetirados(propio.userId) : null;
  return NextResponse.json({
    game,
    diario,
    // Tus marcas de este juego (8 nov 2026): instalado, oculto en tu perfil y la fecha objetivo del platino reservado.
    marcas: marcas
      ? { instalado: marcas.instalados.has(detail.id), ocultoPerfil: marcas.ocultosPerfil.has(detail.id), fechaObjetivo: marcas.fechaObjetivo }
      : null,
    plan:
      plan && plan.faltan > 0
        ? {
            actual: plan.actual,
            faltan: plan.faltan,
            fases: plan.fases.map((f) => ({ fase: f.fase, total: f.total, conseguidos: f.conseguidos, pendientes: f.pendientes.map((t) => t.id) })),
          }
        : null,
    rapidos: rapidos.map((r) => ({ handle: r.handle, nombre: r.nombre, avatarUrl: r.avatarUrl, platform: r.platform, duracionMs: r.duracionMs })),
  });
}
