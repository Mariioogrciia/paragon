import type { Game } from "@/lib/types";
import { esPlatinoEquivalente } from "@/lib/stats";
import { CATEGORIAS_GENERO, type CategoriaDna } from "@/lib/trophyDna";

export interface SugerenciaTiempo {
  gameId: string;
  titulo: string;
  iconUrl?: string;
  motivo: string;
  trofeosRestantes: number;
}

function mezclar<T>(arr: T[]): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * De entre los más relevantes (los primeros `entrePrimeros`, ya ordenados
 * por lo bien que encajan), sortea cuáles se enseñan — así "victorias
 * rápidas" no es SIEMPRE la misma lista exacta cada vez que se mira, sin
 * dejar de ser de verdad relevante (nunca sale un candidato flojo solo por
 * variedad, se sortea dentro de los buenos, no entre todos).
 */
function elegirConVariedad<T>(candidatos: T[], cuantos: number, entrePrimeros = 12): T[] {
  return mezclar(candidatos.slice(0, entrePrimeros)).slice(0, cuantos);
}

/**
 * "Tengo X horas hoy" — dos bolsas, cada una con un dato real detrás, nada
 * inventado:
 *
 * 1. Victorias rápidas: juegos empezados con pocos trofeos por sacar. El
 *    dato es real (`definedTotal - earnedTotal`), pero no hay ninguna
 *    fuente de "cuánto tarda CADA trofeo" — así que el CORTE de "pocos" se
 *    escala con las horas que digas (más tiempo, más margen para que
 *    cuente como "rápido"), no un tiempo estimado inventado por trofeo.
 *    Antes el corte era fijo (≤3, siempre) y la lista no cambiaba nunca al
 *    tocar el selector de horas — parecía roto aunque no lo estuviera.
 * 2. Para profundizar: juegos empezados con horas de HowLongToBeat
 *    (`hltb.completionist`, la más completa) y horas ya jugadas real
 *    (`playtimeMinutes`) — la resta es lo que falta SEGÚN LA MEDIA de la
 *    comunidad, no una promesa. Solo entran si esa resta cabe en el tiempo
 *    disponible con margen.
 *
 * Sin HLTB para un juego, simplemente no entra en la bolsa 2 — no se
 * inventa una estimación con la barra de trofeos, que no tiene relación
 * fiable con el tiempo (un trofeo puede ser instantáneo o de 20 horas).
 *
 * `genero` (opcional): filtra el backlog empezado a UNA categoría de
 * Trophy DNA (lib/trophyDna.ts, mismo mapeo de géneros de IGDB) antes de
 * repartir en las dos bolsas — "hoy me apetece un RPG", no solo "lo que
 * menos me queda".
 */
export function sugerirPorTiempo(
  games: Game[],
  horasDisponibles: number,
  genero?: CategoriaDna,
): { victoriasRapidas: SugerenciaTiempo[]; paraProfundizar: SugerenciaTiempo[] } {
  const generosDelFiltro = genero ? CATEGORIAS_GENERO.find((c) => c.key === genero)?.generos : undefined;

  const empezados = games
    .filter((g) => !g.isWishlist && !esPlatinoEquivalente(g) && g.earnedTotal > 0 && g.definedTotal > g.earnedTotal)
    .filter((g) => !generosDelFiltro || generosDelFiltro.some((gen) => g.genres?.includes(gen)));

  // 30min→2 trofeos de corte, 1h→3, 1h30→4, 2h→5, 3h+→8 — más tiempo
  // disponible, más margen para que un puñado de trofeos siga contando
  // como "rápido". Tope en 10 para que "rápidas" no acabe siendo cualquier
  // cosa con 3h+.
  const corteRapidas = Math.min(10, Math.max(2, Math.round(horasDisponibles * 2.5)));

  const candidatosRapidas = empezados
    .map((g) => ({ g, restantes: g.definedTotal - g.earnedTotal }))
    .filter((x) => x.restantes > 0 && x.restantes <= corteRapidas)
    .sort((a, b) => a.restantes - b.restantes);

  const victoriasRapidas: SugerenciaTiempo[] = elegirConVariedad(candidatosRapidas, 6).map(({ g, restantes }) => ({
    gameId: g.id,
    titulo: g.title,
    iconUrl: g.iconUrl,
    trofeosRestantes: restantes,
    motivo: `Solo te ${restantes === 1 ? "falta" : "faltan"} ${restantes} ${restantes === 1 ? "trofeo" : "trofeos"}`,
  }));

  const candidatosProfundizar = empezados
    .filter((g) => g.hltb?.completionist)
    .map((g) => {
      const horasJugadas = (g.playtimeMinutes ?? 0) / 60;
      const horasRestantes = Math.max(0, g.hltb!.completionist! - horasJugadas);
      return { g, horasRestantes };
    })
    // Con margen del 30%: si dices "tengo 2h", una estimación de 2,3h sigue siendo razonable.
    .filter((x) => x.horasRestantes > 0 && x.horasRestantes <= horasDisponibles * 1.3)
    .sort((a, b) => a.horasRestantes - b.horasRestantes);

  const paraProfundizar: SugerenciaTiempo[] = elegirConVariedad(candidatosProfundizar, 6).map(({ g, horasRestantes }) => ({
    gameId: g.id,
    titulo: g.title,
    iconUrl: g.iconUrl,
    trofeosRestantes: g.definedTotal - g.earnedTotal,
    motivo: `~${horasRestantes < 1 ? "menos de 1" : Math.round(horasRestantes)}h para el 100% según HLTB`,
  }));

  return { victoriasRapidas, paraProfundizar };
}
