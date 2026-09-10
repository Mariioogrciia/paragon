import type { Trophy } from "@/lib/types";

const DIA_MS = 86_400_000;

export interface DiarioPlatino {
  primeraFecha: string;
  primerTrofeo: string;
  /** El hueco más largo (en días) entre dos trofeos consecutivos — tu "muro" real. */
  muroDias: number;
  /** El trofeo posterior a ese hueco — el que costó superarlo. */
  muroTrofeo: string;
  masRaro: { nombre: string; rarityPercent: number } | null;
  fechaPlatino: string;
  diasTotales: number;
}

/**
 * "El Diario del Platino": un resumen narrativo de tu partida, sacado
 * entero de `earnedAt`/`rarityPercent` — datos que ya se guardan por cada
 * trofeo, sin ninguna fuente nueva. Solo tiene sentido con el platino ya
 * conseguido (o el 100% equivalente de Steam) Y con fechas de verdad: si el
 * detalle del juego no se sincronizó hasta después de tenerlo casi todo, las
 * fechas de los primeros trofeos pueden faltar — en ese caso se devuelve
 * `null` en vez de un diario con huecos que parecerían un error.
 *
 * "El muro" es el mayor hueco en DÍAS entre dos trofeos CONSEGUIDOS
 * consecutivos (ordenados por fecha) — la mejor aproximación honesta a
 * "dónde te atascaste" que da el dato real: no sabemos POR QUÉ hubo un
 * hueco (pudo ser el jefe, pudo ser que dejaste el juego una temporada),
 * solo que lo hubo.
 */
export function generarDiarioPlatino(trophies: Trophy[]): DiarioPlatino | null {
  const conseguidos = trophies
    .filter((t) => t.earned && t.earnedAt)
    .map((t) => ({ ...t, fecha: new Date(t.earnedAt!) }))
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  // Con menos de 2 fechas no hay ni "primero" ni "hueco" que contar de verdad.
  if (conseguidos.length < 2) return null;

  const primero = conseguidos[0];
  const ultimo = conseguidos[conseguidos.length - 1];

  let muroDias = 0;
  let muroTrofeo = conseguidos[0].name;
  for (let i = 1; i < conseguidos.length; i++) {
    const gap = (conseguidos[i].fecha.getTime() - conseguidos[i - 1].fecha.getTime()) / DIA_MS;
    if (gap > muroDias) {
      muroDias = gap;
      muroTrofeo = conseguidos[i].name;
    }
  }

  const conRareza = conseguidos.filter((t) => t.rarityPercent !== undefined);
  const masRaro = conRareza.length > 0
    ? conRareza.reduce((a, b) => (b.rarityPercent! < a.rarityPercent! ? b : a))
    : null;

  return {
    primeraFecha: primero.fecha.toISOString(),
    primerTrofeo: primero.name,
    muroDias: Math.round(muroDias),
    muroTrofeo,
    masRaro: masRaro ? { nombre: masRaro.name, rarityPercent: masRaro.rarityPercent! } : null,
    fechaPlatino: ultimo.fecha.toISOString(),
    diasTotales: Math.max(1, Math.round((ultimo.fecha.getTime() - primero.fecha.getTime()) / DIA_MS)),
  };
}
