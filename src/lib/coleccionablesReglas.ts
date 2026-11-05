/**
 * Lista de coleccionables de un trofeo (5 nov 2026, lib/coleccionables.ts):
 * reglas puras, `tests/coleccionables.test.ts`.
 *
 * Ninguna plataforma da QUÉ coleccionables te faltan (vive en la partida
 * guardada, docs/HANDOFF.md). Lo que sí se puede: sacar cuántos son del
 * texto del trofeo ("Find all 16 singing crickets") y dejar pegar la lista
 * de una guía para ir marcándolos.
 */

/** Como mucho, para que nadie pegue una novela. */
export const MAX_COLECCIONABLES = 400;
const MAX_NOMBRE = 120;

/**
 * Cuántos coleccionables pide el trofeo, si el texto lo dice: "all 16",
 * "los 16", "16 grillos", "(0/16)". `null` si no hay un número claro.
 */
export function cantidadDelTexto(nombre: string, detalle: string): number | null {
  const texto = `${nombre} ${detalle}`;
  const patrones = [
    /\(\s*\d+\s*\/\s*(\d{1,3})\s*\)/, // (0/16)
    /\b(?:all|every|todos?\s+(?:los|las)|todas\s+las|los|las|tous\s+les|toutes\s+les|alle|tutti\s+i|tutte\s+le|todos\s+os|todas\s+as)\s+(\d{1,3})\b/i,
    /\b(?:collect|find|locate|obtain|gather|recoge|encuentra|consigue|colecciona|reúne|trouve|collecte|finde|sammle|trova|raccogli|encontra|recolhe)\w*\s+(\d{1,3})\b/i,
    /\b(\d{1,3})\s+(?:collectibles?|coleccionables?|objetos|items?|pieces|piezas|fragments?|fragmentos?|feathers?|plumas?|cards?|cartas?|records?|documents?|documentos?)\b/i,
  ];
  for (const p of patrones) {
    const m = p.exec(texto);
    const n = m ? Number(m[1]) : NaN;
    if (Number.isInteger(n) && n >= 2 && n <= MAX_COLECCIONABLES) return n;
  }
  return null;
}

/**
 * Una lista pegada de una guía a nombres limpios: una por línea, sin viñetas,
 * números de orden, casillas de Markdown ni repetidos.
 */
export function leerLista(texto: string): string[] {
  const vistos = new Set<string>();
  const nombres: string[] = [];
  for (const linea of texto.split(/\r?\n/)) {
    const limpio = linea
      .replace(/^\s*(?:[-*•·▪◦]|\[[ xX]\]|#?\d{1,3}[.):\-–]|\d{1,3}\s*[-–])\s*/, "")
      .replace(/^\s*(?:\[[ xX]\])\s*/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_NOMBRE);
    const clave = limpio.toLowerCase();
    if (!limpio || vistos.has(clave)) continue;
    vistos.add(clave);
    nombres.push(limpio);
    if (nombres.length >= MAX_COLECCIONABLES) break;
  }
  return nombres;
}

/** Índices marcados válidos para una lista de `total`: enteros, dentro de rango, sin repetir, en orden. */
export function marcadosValidos(marcados: unknown, total: number): number[] {
  if (!Array.isArray(marcados)) return [];
  return [...new Set(marcados.filter((i): i is number => Number.isInteger(i) && i >= 0 && i < total))].sort((a, b) => a - b);
}
