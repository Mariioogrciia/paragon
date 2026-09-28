/**
 * Cálculo de un objetivo con fecha ("platinar X antes del 31 de octubre")
 * del Planificador. Puro y sin servidor: lo usa el componente de cliente y
 * se prueba en tests/objetivos.test.ts. Los datos viven en lib/goals.ts.
 */

export interface PlanObjetivo {
  /** Días que quedan, contando hoy. 0 o menos: la fecha ya pasó. */
  dias: number;
  /** Trofeos al día que hacen falta para llegar. */
  porDia: number;
  /** Comparado con tu ritmo real; `null` si no hay ritmo con el que comparar. */
  alcanzable: boolean | null;
  vencido: boolean;
}

/** `fecha` en formato ISO de día (`2026-10-31`). `ritmo` = trofeos/día recientes. */
export function planObjetivo(faltan: number, fecha: string, hoy: Date, ritmo: number | null): PlanObjetivo {
  const [a, m, d] = fecha.split("-").map(Number);
  const fin = Date.UTC(a, m - 1, d);
  const inicio = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const dias = Math.round((fin - inicio) / 86_400_000) + 1;
  const vencido = dias <= 0;
  const porDia = vencido ? faltan : faltan / dias;
  const alcanzable = faltan === 0 ? true : vencido ? false : ritmo === null || ritmo <= 0 ? null : ritmo >= porDia;
  return { dias, porDia, alcanzable, vencido };
}
