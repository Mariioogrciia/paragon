/**
 * Los trofeos de una persona por periodo, para la cabecera de Estadísticas
 * de la app (diseño v2, 15 oct 2026): Semana / Año / Siempre, cada uno con su
 * cifra, la comparación con el periodo anterior y las barras. Puro (sin base)
 * para poder probarlo: la consulta está en `periodosDeCaza` (lib/history.ts),
 * que agrupa por día en la zona horaria del usuario.
 */

export interface DiaConTrofeos {
  /** "2026-10-15", en la zona horaria del usuario. */
  dia: string;
  total: number;
}

export interface Periodos {
  /** Los 7 últimos días (hoy el último) y los 7 de antes. */
  semana: { total: number; anterior: number; barras: number[] };
  /** Este año por meses (enero → diciembre) y el mismo tramo del año pasado. */
  anio: { anio: number; total: number; anterior: number; barras: number[] };
  /** Por año, del primero con trofeos al actual. */
  siempre: { total: number; barras: { anio: number; total: number }[] };
}

const DIA_MS = 86_400_000;

function aUtc(dia: string): number {
  return Date.parse(`${dia}T00:00:00Z`);
}

/** `hoy`: la fecha de hoy en la zona del usuario ("YYYY-MM-DD"). */
export function calcularPeriodos(dias: DiaConTrofeos[], hoy: string): Periodos {
  const hoyMs = aUtc(hoy);
  const anioActual = Number(hoy.slice(0, 4));
  // Mismo día del año pasado (29 feb → 28 feb).
  const mismoDiaAnioPasado = `${anioActual - 1}${hoy.slice(4) === "-02-29" ? "-02-28" : hoy.slice(4)}`;

  const semana = new Array<number>(7).fill(0);
  let semanaAnterior = 0;
  const meses = new Array<number>(12).fill(0);
  let anioAnterior = 0;
  const porAnio = new Map<number, number>();
  let siempre = 0;

  for (const { dia, total } of dias) {
    if (total <= 0) continue;
    siempre += total;
    const anio = Number(dia.slice(0, 4));
    porAnio.set(anio, (porAnio.get(anio) ?? 0) + total);

    const hace = Math.round((hoyMs - aUtc(dia)) / DIA_MS);
    if (hace >= 0 && hace < 7) semana[6 - hace] += total;
    else if (hace >= 7 && hace < 14) semanaAnterior += total;

    if (anio === anioActual && hace >= 0) meses[Number(dia.slice(5, 7)) - 1] += total;
    if (anio === anioActual - 1 && dia <= mismoDiaAnioPasado) anioAnterior += total;
  }

  const primero = porAnio.size ? Math.min(...porAnio.keys()) : anioActual;
  const barrasAnios = [];
  for (let a = primero; a <= anioActual; a++) barrasAnios.push({ anio: a, total: porAnio.get(a) ?? 0 });

  return {
    semana: { total: semana.reduce((a, b) => a + b, 0), anterior: semanaAnterior, barras: semana },
    anio: { anio: anioActual, total: meses.reduce((a, b) => a + b, 0), anterior: anioAnterior, barras: meses },
    siempre: { total: siempre, barras: barrasAnios },
  };
}

/** La hora (0-23) con más trofeos, o null sin datos. */
export function horaFavorita(porHora: { hora: number; total: number }[]): number | null {
  let mejor: { hora: number; total: number } | null = null;
  for (const h of porHora) if (h.total > 0 && (!mejor || h.total > mejor.total)) mejor = h;
  return mejor?.hora ?? null;
}
