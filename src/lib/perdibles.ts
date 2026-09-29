/**
 * `games.missableTrophies` como lista de nombres, venga como venga.
 *
 * Fallo real (29 sept 2026): la fila de Black Myth: Wukong tenía el JSON
 * codificado DOS veces — un texto `"[\"urge unfulfilled\", ...]"` en vez de
 * la lista. `new Set(texto)` hacía un conjunto de letras sueltas, así que
 * ningún trofeo de ese juego salía marcado como perdible. Se lee con esto
 * en vez de fiarse del tipo de la columna.
 */
export function normalizarPerdibles(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.filter((v): v is string => typeof v === "string");
  if (typeof valor === "string") {
    try {
      return normalizarPerdibles(JSON.parse(valor));
    } catch {
      return [];
    }
  }
  return [];
}
