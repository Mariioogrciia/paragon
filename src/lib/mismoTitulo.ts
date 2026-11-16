/**
 * ¿Dos títulos son el mismo juego? (16 nov 2026). El emparejamiento con IGDB
 * se hace por título y a veces se lleva otro juego (el primer resultado de
 * la búsqueda); el fondo del perfil enseñaba entonces el arte de un juego
 * que no era el elegido. Aquí se compara sin mayúsculas, acentos, símbolos
 * ni coletillas de plataforma o edición. Ante la duda dice que no.
 *
 * Módulo puro: tests/mismoTitulo.test.ts.
 */

const COLETILLAS = new Set([
  "the", "of", "a", "an", "and", "edition", "trophies", "trophy", "ps3", "ps4", "ps5", "vita", "psvita",
  "playstation", "remastered", "remaster", "definitive", "goty", "year", "complete", "deluxe", "standard", "pc",
  "director", "directors", "cut", "s",
]);

function palabras(titulo: string): string[] {
  return titulo
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((p) => p && !COLETILLAS.has(p));
}

export function mismoTitulo(a: string, b: string): boolean {
  const pa = palabras(a);
  const pb = palabras(b);
  if (pa.length === 0 || pb.length === 0) return false;
  if (pa.join(" ") === pb.join(" ")) return true;
  // Casi iguales (una palabra de más en un título largo), no «uno dentro del
  // otro»: «Stray» y «Stray Souls» son juegos distintos. Ante la duda, no:
  // mejor la carátula del juego bueno que el arte nítido de otro.
  const sa = new Set(pa);
  const sb = new Set(pb);
  const comunes = [...sa].filter((p) => sb.has(p)).length;
  return comunes / new Set([...sa, ...sb]).size >= 0.75;
}
