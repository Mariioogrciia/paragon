import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { getParagonScore } from "@/lib/paragonScore";
import { calcularTrophyDna } from "@/lib/trophyDna";
import { rachas, resumenHistorico } from "@/lib/history";
import { resumenFinanciero, eficienciaPersonal, resumenEficiencia, deudaBacklog } from "@/lib/backlog";
import { horasTotales } from "@/lib/profileStats";

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

  const [{ games }, paragonScore, rachasUsuario, historico, horas] = await Promise.all([
    getLibrary(profile),
    getParagonScore(userId),
    rachas(userId),
    resumenHistorico(userId),
    horasTotales(userId),
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
    horasTotalesMinutos: horas,
  });
}
