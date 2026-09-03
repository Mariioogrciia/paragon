import type { Trophy } from "@/lib/types";

/**
 * Fecha estimada de platino/100%, a partir de TU ritmo real reciente.
 *
 * La barra de progreso dice dónde estás, pero no cuándo vas a terminar. Aquí
 * se calcula con los últimos `VENTANA_DIAS` de `earnedAt` (que ya se guarda
 * por cada trofeo, ver getGameDetail): cuántos trofeos has sacado por día en
 * ese tramo, y a ese ritmo cuánto falta para los que quedan.
 *
 * A propósito NO se usa todo el histórico del juego: alguien que jugó un mes
 * a tope hace dos años y lo dejó tendría un ritmo medio que no dice nada de
 * si lo va a terminar. Sin actividad reciente, no hay ETA — es más honesto
 * no dar fecha que dar una que no significa nada.
 */

const VENTANA_DIAS = 30;
/** Sin al menos esto en la ventana, el ritmo no es fiable — podría ser una
 *  sola sesión suelta, no un ritmo. */
const MINIMO_PARA_ESTIMAR = 3;
const DIA_MS = 86_400_000;

export interface EtaPlatino {
  fecha: Date;
  diasRestantes: number;
  /** Trofeos por día en la ventana reciente, para mostrar el ritmo. */
  ritmoDiario: number;
}

export function estimarEta(trophies: Trophy[], faltan: number): EtaPlatino | null {
  if (faltan <= 0) return null;

  const ahora = Date.now();
  const desde = ahora - VENTANA_DIAS * DIA_MS;

  const recientes = trophies
    .filter((t) => t.earned && t.earnedAt)
    .map((t) => new Date(t.earnedAt!).getTime())
    .filter((ts) => ts >= desde && ts <= ahora);

  if (recientes.length < MINIMO_PARA_ESTIMAR) return null;

  // El tramo real de actividad dentro de la ventana, no la ventana entera:
  // si todo pasó en 5 días, el ritmo es "por esos 5 días", no por 30 — si no,
  // se subestima el ritmo de quien juega en sesiones concentradas.
  const primero = Math.min(...recientes);
  const ultimo = Math.max(...recientes);
  const tramoDias = Math.max(1, (ultimo - primero) / DIA_MS);

  const ritmoDiario = recientes.length / tramoDias;
  if (ritmoDiario <= 0) return null;

  const diasRestantes = Math.ceil(faltan / ritmoDiario);
  const fecha = new Date(ahora + diasRestantes * DIA_MS);

  return { fecha, diasRestantes, ritmoDiario };
}
