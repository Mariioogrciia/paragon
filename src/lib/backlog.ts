import type { Game } from "@/lib/types";
import { esPlatinoEquivalente } from "@/lib/stats";

const DIA_MS = 86_400_000;

export interface PlatinoAlAlcance {
  gameId: string;
  titulo: string;
  iconUrl?: string;
  progressPercent: number;
  trofeosRestantes: number;
  ultimaVez: string;
  horasHltb?: number;
}

/**
 * Juegos con el platino (o el 100% en Steam) cerca pero abandonados: mucho
 * progreso hecho, y meses sin tocarlo. El caso real es "se me olvidó que
 * estaba a esto de terminarlo" — por eso se excluyen los que ya están
 * platinados (`esPlatinoEquivalente`, lib/stats.ts, el mismo criterio que
 * usa el resto de la app) y los que sí se han tocado hace poco: si lo has
 * jugado esta semana ya lo tienes controlado tú solo, no hace falta un
 * radar para eso.
 */
export function platinosAlAlcance(games: Game[], minProgreso = 75, mesesSinTocar = 2): PlatinoAlAlcance[] {
  const limite = Date.now() - mesesSinTocar * 30 * DIA_MS;

  return games
    .filter((g) => !g.isWishlist)
    .filter((g) => !esPlatinoEquivalente(g))
    .filter((g) => g.progressPercent >= minProgreso && g.progressPercent < 100)
    .filter((g) => g.lastPlayedAt && new Date(g.lastPlayedAt).getTime() < limite)
    .map((g) => ({
      gameId: g.id,
      titulo: g.title,
      iconUrl: g.iconUrl,
      progressPercent: g.progressPercent,
      trofeosRestantes: Math.max(0, g.definedTotal - g.earnedTotal),
      ultimaVez: g.lastPlayedAt!,
      horasHltb: g.hltb?.completionist ?? g.hltb?.mainExtra ?? g.hltb?.main,
    }))
    .sort((a, b) => b.progressPercent - a.progressPercent);
}

export interface JuegoSinEmpezar {
  gameId: string;
  titulo: string;
  iconUrl?: string;
  deviceLabel: string;
}

/**
 * "El Salón de la Vergüenza": juegos en la biblioteca (comprados/añadidos)
 * con 0 trofeos y 0% de progreso — ni se han tocado. No es una lista de
 * deseados (esos ya se excluyen con `isWishlist`): son juegos que sí están
 * en tu biblioteca de verdad, esperando.
 */
export function salonDeLaVerguenza(games: Game[]): JuegoSinEmpezar[] {
  return games
    .filter((g) => !g.isWishlist && g.earnedTotal === 0 && g.progressPercent === 0)
    .map((g) => ({ gameId: g.id, titulo: g.title, iconUrl: g.iconUrl, deviceLabel: g.deviceLabel }));
}

export interface CosteHora {
  gameId: string;
  titulo: string;
  iconUrl?: string;
  precio: number;
  horas: number;
  costeHora: number;
}

/**
 * €/hora jugada — solo para juegos con los dos datos que hacen falta y que
 * NADIE da por API: lo que pagaste (`pricePaid`, rellenado a mano en la
 * ficha del juego) y horas jugadas de verdad (`playtimeMinutes`, ese sí
 * real). Sin uno de los dos, ni se calcula ni se adivina.
 */
export function costePorHora(games: Game[]): CosteHora[] {
  return games
    .filter((g) => !g.isWishlist && g.pricePaid != null && g.playtimeMinutes && g.playtimeMinutes > 0)
    .map((g) => {
      const horas = g.playtimeMinutes! / 60;
      return { gameId: g.id, titulo: g.title, iconUrl: g.iconUrl, precio: g.pricePaid!, horas, costeHora: g.pricePaid! / horas };
    })
    .sort((a, b) => a.costeHora - b.costeHora);
}
