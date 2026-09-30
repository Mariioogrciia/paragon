/**
 * Librea de "escudería" para Ligas y Clanes: un par de colores fijo sacado del
 * id (usuario o etiqueta de clan), así cada uno lleva siempre los mismos en
 * todas las clasificaciones. Sin base de datos: lo usan servidor y cliente.
 */
export interface Librea {
  /** Color de la placa. */
  fondo: string;
  /** Color del número/letras encima: elegido para que se lea sobre `fondo`. */
  tinta: string;
}

const LIBREAS: Librea[] = [
  { fondo: "#ff6a00", tinta: "#111111" },
  { fondo: "#e8ff3a", tinta: "#111111" },
  { fondo: "#00b8ff", tinta: "#04121f" },
  { fondo: "#ff2d55", tinta: "#ffffff" },
  { fondo: "#35e36b", tinta: "#062010" },
  { fondo: "#b46bff", tinta: "#ffffff" },
  { fondo: "#ffd60a", tinta: "#111111" },
  { fondo: "#f4f6fa", tinta: "#111111" },
  { fondo: "#7cc4e4", tinta: "#0c1220" },
  { fondo: "#ff3b30", tinta: "#ffffff" },
];

export function libreaDe(id: string): Librea {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return LIBREAS[(h >>> 0) % LIBREAS.length];
}
