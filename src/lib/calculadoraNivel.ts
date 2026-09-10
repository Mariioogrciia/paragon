import { XP_POR_GRADO } from "@/lib/level";

function xpParaNivel(level: number): number {
  return level <= 1 ? 0 : (500 * ((level - 1) * level)) / 2;
}

export interface ObjetivoNivel {
  /** Si el nivel pedido ya está conseguido o es inválido. */
  yaConseguido: boolean;
  xpFaltante: number;
  /** Equivalencias orientativas — NO una predicción de qué vas a sacar, solo "esto es lo que pesaría si fuera todo de un tipo". */
  equivalencias: { label: string; cantidad: number }[];
}

/**
 * "Quiero llegar al nivel X" — pura aritmética sobre la misma fórmula de
 * `paragonLevelFromXp` (lib/level.ts): el XP para un nivel es un dato
 * exacto, no una estimación. Las "equivalencias" (X platinos, X trofeos de
 * oro…) SÍ son orientativas a propósito — nadie saca solo platinos o solo
 * oros, es para dar una idea de la magnitud, no una lista de la compra.
 */
export function calcularObjetivoNivel(xpActual: number, nivelObjetivo: number): ObjetivoNivel {
  const xpNecesario = xpParaNivel(nivelObjetivo);
  const xpFaltante = xpNecesario - xpActual;

  if (xpFaltante <= 0) {
    return { yaConseguido: true, xpFaltante: 0, equivalencias: [] };
  }

  return {
    yaConseguido: false,
    xpFaltante,
    equivalencias: [
      { label: "platinos", cantidad: Math.ceil(xpFaltante / XP_POR_GRADO.platinum) },
      { label: "trofeos de oro", cantidad: Math.ceil(xpFaltante / XP_POR_GRADO.gold) },
      { label: "trofeos de plata", cantidad: Math.ceil(xpFaltante / XP_POR_GRADO.silver) },
      { label: "trofeos de bronce", cantidad: Math.ceil(xpFaltante / XP_POR_GRADO.bronze) },
    ],
  };
}
