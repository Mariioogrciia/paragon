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

export interface RescateBacklog {
  gameId: string;
  titulo: string;
  iconUrl?: string;
  horasHltb: number;
  acquisitionFormat?: Game["acquisitionFormat"];
}

/**
 * "Descubre en tu propio desván": el mejor juego para jugar hoy puede que
 * ya lo tengas comprado (o incluido en una suscripción) y olvidado al 0% —
 * mismo punto de partida que `salonDeLaVerguenza`, pero ordenado para
 * sugerir uno concreto, no solo para dar vergüenza.
 *
 * A propósito SIN un umbral de "nota alta" (la idea original pedía
 * Metacritic > 85): no hay ninguna nota de Metacritic guardada en el
 * proyecto, solo la valoración personal de cada usuario
 * (`Game.rating`), que un juego a 0% casi nunca tiene puesta todavía —
 * inventar el corte con un dato que no existe sería peor que no ponerlo.
 * Se ordena por duración (más corto primero) y prioriza lo que ya pagas
 * vía suscripción (`acquisitionFormat` ps_plus/game_pass) sobre lo
 * comprado aparte — ahí es donde de verdad se "regala" la cuota si no se
 * toca.
 */
export function rescateBiblioteca(games: Game[], maxHoras = 15): RescateBacklog[] {
  return games
    .filter((g) => !g.isWishlist && g.progressPercent === 0)
    .filter((g) => g.hltb?.completionist != null && g.hltb.completionist <= maxHoras)
    .map((g) => ({
      gameId: g.id,
      titulo: g.title,
      iconUrl: g.iconUrl,
      horasHltb: g.hltb!.completionist!,
      acquisitionFormat: g.acquisitionFormat,
    }))
    .sort((a, b) => {
      const esSuscripcion = (f?: Game["acquisitionFormat"]) => (f === "ps_plus" || f === "game_pass" ? 0 : 1);
      const diff = esSuscripcion(a.acquisitionFormat) - esSuscripcion(b.acquisitionFormat);
      return diff !== 0 ? diff : a.horasHltb - b.horasHltb;
    });
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

export interface ResumenFinanciero {
  totalGastado: number;
  totalHoras: number;
  costeHoraMedio: number | null;
  juegosConDatos: number;
}

/**
 * El panel financiero de conjunto: cuánto has invertido en total y qué
 * €/hora te ha salido de media — solo cuenta con juegos que tienen los dos
 * datos puestos (precio Y horas), igual que `costePorHora`. Si nadie ha
 * rellenado nada todavía, `costeHoraMedio` es `null` en vez de un 0 o un
 * Infinity que no significan nada.
 */
export function resumenFinanciero(games: Game[]): ResumenFinanciero {
  const conDatos = games.filter((g) => !g.isWishlist && g.pricePaid != null && g.playtimeMinutes && g.playtimeMinutes > 0);

  const totalGastado = conDatos.reduce((acc, g) => acc + g.pricePaid!, 0);
  const totalHoras = conDatos.reduce((acc, g) => acc + g.playtimeMinutes! / 60, 0);

  return {
    totalGastado,
    totalHoras,
    costeHoraMedio: totalHoras > 0 ? totalGastado / totalHoras : null,
    juegosConDatos: conDatos.length,
  };
}

export interface EficienciaJuego {
  gameId: string;
  titulo: string;
  iconUrl?: string;
  horasReales: number;
  horasHltb: number;
  /** Positivo = más rápido que HLTB (buen cazador); negativo = te lo tomaste con más calma. */
  diferenciaPct: number;
}

export interface ResumenEficiencia {
  /** Media de `diferenciaPct` de todos los juegos con dato — tu ritmo general frente a HLTB. */
  ritmoMedioPct: number | null;
  juegosConDatos: number;
}

/**
 * Tu ritmo real de caza frente a lo que HowLongToBeat estima para el
 * completista — solo con juegos que YA tienes platinados/100%
 * (`esPlatinoEquivalente`, mismo criterio de siempre) y que tienen los dos
 * datos que hacen falta: `hltb.completionist` (estimación de la
 * comunidad) y `playtimeMinutes` (tus horas reales, las que da la propia
 * plataforma — no las metes tú a mano, a diferencia de `pricePaid`).
 *
 * `diferenciaPct` positivo = fuiste más rápido que la media (menos horas
 * de las que estima HLTB); negativo = te lo tomaste con calma/exploraste
 * más. Nada de "bueno" o "malo" en la propia función — eso lo decide la
 * UI, aquí solo se calcula el número real.
 */
export function eficienciaPersonal(games: Game[]): EficienciaJuego[] {
  return games
    .filter((g) => !g.isWishlist && esPlatinoEquivalente(g))
    .filter((g) => g.hltb?.completionist != null && g.hltb.completionist > 0 && g.playtimeMinutes && g.playtimeMinutes > 0)
    .map((g) => {
      const horasReales = g.playtimeMinutes! / 60;
      const horasHltb = g.hltb!.completionist!;
      return {
        gameId: g.id,
        titulo: g.title,
        iconUrl: g.iconUrl,
        horasReales,
        horasHltb,
        diferenciaPct: Math.round(((horasHltb - horasReales) / horasHltb) * 100),
      };
    })
    .sort((a, b) => b.diferenciaPct - a.diferenciaPct);
}

export function resumenEficiencia(eficiencia: EficienciaJuego[]): ResumenEficiencia {
  if (eficiencia.length === 0) return { ritmoMedioPct: null, juegosConDatos: 0 };
  const media = eficiencia.reduce((acc, e) => acc + e.diferenciaPct, 0) / eficiencia.length;
  return { ritmoMedioPct: Math.round(media), juegosConDatos: eficiencia.length };
}

export interface DeudaBacklog {
  juegosContados: number;
  /** Horas de HLTB "main" (ver los créditos) que faltan en lo ya empezado — solo cuenta juegos con ese dato. */
  horasHistoriaRestantes: number;
  /** Horas de HLTB "completionist" (100%/platino) que faltan en lo ya empezado. */
  horasPlatinoRestantes: number;
}

/**
 * "Deuda de backlog", en horas reales, no en número de juegos — 40 juegos
 * pendientes no dice nada por sí solo (pueden ser 100h de indies o 4000h
 * de RPGs). Solo cuenta juegos EMPEZADOS (progreso entre 1% y 99%, ni
 * "vergüenza" sin tocar ni ya terminados) y solo con HLTB guardado —
 * sin ese dato, el juego simplemente no suma, no se inventa una media.
 *
 * A propósito SIN una "fecha de liquidación": no hay ningún histórico de
 * horas jugadas en el tiempo en este proyecto (`playtimeMinutes` es una
 * foto del total actual, no una serie), así que no hay con qué calcular
 * un ritmo real en horas/semana — solo un ritmo en TROFEOS/semana
 * (`lib/history.ts`), que mezclado con horas de HLTB daría una fecha
 * inventada con apariencia de dato real. Mejor decir "te faltan X horas"
 * de verdad que "acabarás el 14 de diciembre" de mentira.
 */
export function deudaBacklog(games: Game[]): DeudaBacklog {
  const empezados = games.filter((g) => !g.isWishlist && g.progressPercent > 0 && g.progressPercent < 100);

  let horasHistoriaRestantes = 0;
  let horasPlatinoRestantes = 0;
  let juegosContados = 0;

  for (const g of empezados) {
    const jugadas = (g.playtimeMinutes ?? 0) / 60;
    let contó = false;

    const historiaEstimada = g.hltb?.main ?? g.hltb?.mainExtra;
    if (historiaEstimada != null) {
      horasHistoriaRestantes += Math.max(0, historiaEstimada - jugadas);
      contó = true;
    }
    if (g.hltb?.completionist != null) {
      horasPlatinoRestantes += Math.max(0, g.hltb.completionist - jugadas);
      contó = true;
    }
    if (contó) juegosContados++;
  }

  return {
    juegosContados,
    horasHistoriaRestantes: Math.round(horasHistoriaRestantes),
    horasPlatinoRestantes: Math.round(horasPlatinoRestantes),
  };
}
