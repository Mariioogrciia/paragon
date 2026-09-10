import type { Game } from "@/lib/types";
import { esPlatinoEquivalente } from "@/lib/stats";

export interface SugerenciaTiempo {
  gameId: string;
  titulo: string;
  iconUrl?: string;
  motivo: string;
  trofeosRestantes: number;
}

/**
 * "Tengo X horas hoy" — dos bolsas, cada una con un dato real detrás, nada
 * inventado:
 *
 * 1. Victorias rápidas: juegos empezados con MUY pocos trofeos por sacar.
 *    El dato es real (`definedTotal - earnedTotal`), pero no hay ninguna
 *    fuente de "cuánto tarda CADA trofeo" — así que esta bolsa no depende
 *    de las horas disponibles, es "esto lo puedes cerrar hoy" siempre que
 *    tengas aunque sea un rato.
 * 2. Para profundizar: juegos empezados con horas de HowLongToBeat
 *    (`hltb.completionist`, la más completa) y horas ya jugadas real
 *    (`playtimeMinutes`) — la resta es lo que falta SEGÚN LA MEDIA de la
 *    comunidad, no una promesa. Solo entran si esa resta cabe en el tiempo
 *    disponible con margen.
 *
 * Sin HLTB para un juego, simplemente no entra en la bolsa 2 — no se
 * inventa una estimación con la barra de trofeos, que no tiene relación
 * fiable con el tiempo (un trofeo puede ser instantáneo o de 20 horas).
 */
export function sugerirPorTiempo(
  games: Game[],
  horasDisponibles: number,
): { victoriasRapidas: SugerenciaTiempo[]; paraProfundizar: SugerenciaTiempo[] } {
  const empezados = games.filter(
    (g) => !g.isWishlist && !esPlatinoEquivalente(g) && g.earnedTotal > 0 && g.definedTotal > g.earnedTotal,
  );

  const victoriasRapidas: SugerenciaTiempo[] = empezados
    .map((g) => ({ g, restantes: g.definedTotal - g.earnedTotal }))
    .filter((x) => x.restantes > 0 && x.restantes <= 3)
    .sort((a, b) => a.restantes - b.restantes)
    .slice(0, 6)
    .map(({ g, restantes }) => ({
      gameId: g.id,
      titulo: g.title,
      iconUrl: g.iconUrl,
      trofeosRestantes: restantes,
      motivo: `Solo te ${restantes === 1 ? "falta" : "faltan"} ${restantes} ${restantes === 1 ? "trofeo" : "trofeos"}`,
    }));

  const paraProfundizar: SugerenciaTiempo[] = empezados
    .filter((g) => g.hltb?.completionist)
    .map((g) => {
      const horasJugadas = (g.playtimeMinutes ?? 0) / 60;
      const horasRestantes = Math.max(0, g.hltb!.completionist! - horasJugadas);
      return { g, horasRestantes };
    })
    // Con margen del 30%: si dices "tengo 2h", una estimación de 2,3h sigue siendo razonable.
    .filter((x) => x.horasRestantes > 0 && x.horasRestantes <= horasDisponibles * 1.3)
    .sort((a, b) => a.horasRestantes - b.horasRestantes)
    .slice(0, 6)
    .map(({ g, horasRestantes }) => ({
      gameId: g.id,
      titulo: g.title,
      iconUrl: g.iconUrl,
      trofeosRestantes: g.definedTotal - g.earnedTotal,
      motivo: `~${horasRestantes < 1 ? "menos de 1" : Math.round(horasRestantes)}h para el 100% según HLTB`,
    }));

  return { victoriasRapidas, paraProfundizar };
}
