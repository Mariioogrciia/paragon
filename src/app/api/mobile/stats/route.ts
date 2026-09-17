import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { getParagonScore } from "@/lib/paragonScore";
import { calcularTrophyDna } from "@/lib/trophyDna";
import { rachas, resumenHistorico } from "@/lib/history";
import { resumenFinanciero, eficienciaPersonal, resumenEficiencia, deudaBacklog } from "@/lib/backlog";
import { horasTotales, hitosHistoricos } from "@/lib/profileStats";

/**
 * Estadísticas — versión CURADA para el móvil, no las ~15 piezas de
 * `EstadisticasCompletas.tsx` (heatmaps de calendario/horas, salón de la
 * vergüenza, comparador con amigos, gráficas...). Esas son mejores en
 * pantalla grande o ya se cubren en otro sitio de la app (recientes/a un
 * paso del platino ya están en /api/mobile/panel/highlights, amigos en
 * /api/mobile/social) — aquí solo lo que aporta algo NUEVO en un móvil.
 */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const profile = await getProfileByUserId(userId);
  if (!profile?.handle) {
    return NextResponse.json({ error: "Perfil sin terminar de configurar" }, { status: 409 });
  }

  const [{ games }, paragonScore, rachasUsuario, historico, horas, hitos] = await Promise.all([
    getLibrary(profile),
    getParagonScore(userId),
    rachas(userId),
    resumenHistorico(userId),
    horasTotales(userId),
    hitosHistoricos(userId),
  ]);

  const dna = calcularTrophyDna(games);
  const financiero = resumenFinanciero(games);
  const eficiencia = resumenEficiencia(eficienciaPersonal(games));
  const backlog = deudaBacklog(games);

  return NextResponse.json({
    paragonScore: { total: paragonScore.total, porPlataforma: paragonScore.porPlataforma },
    trophyDna: { ejes: dna.ejes, arquetipo: dna.arquetipo },
    rachas: rachasUsuario,
    historico,
    financiero,
    eficiencia,
    backlog,
    // `horasTotales()` (lib/profileStats.ts) ya devuelve HORAS, no minutos —
    // el nombre del campo lo dice para que quien lo consuma no tenga que ir
    // a mirar la función (un bug real de la app Android dividía esto entre
    // 60 otra vez creyendo que eran minutos, mostrando 238h en vez de las
    // ~14 280h/595 días reales que sí salen bien en PlaytimeComparison.tsx).
    horasTotales: horas,
    // Hitos de toda la carrera de trofeos (primer trofeo/platino, más raro,
    // "añejo", racha más larga) — misma fuente que la línea de tiempo de la
    // web (HistoricalTimeline.tsx), sin recortar nada: cada hito puede venir
    // `null` si todavía no aplica (p. ej. sin ningún platino).
    hitos,
  });
}
