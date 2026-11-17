/**
 * ¿Dos títulos son el mismo juego? (16 nov 2026). El emparejamiento con IGDB
 * se hace por título y a veces se lleva otro juego (el primer resultado de
 * la búsqueda); el fondo del perfil enseñaba entonces el arte de un juego
 * que no era el elegido. Aquí se compara sin mayúsculas, acentos, símbolos
 * ni coletillas de plataforma o edición. Ante la duda dice que no.
 *
 * Lo usan igual el emparejamiento (lib/igdb/client.ts) y la revisión del
 * despliegue (scripts/migraciones/revisar-igdb.mts): con reglas distintas,
 * lo que uno empareja el otro lo deshace en cada despliegue.
 *
 * Módulo puro (sin "server-only" ni alias): tests/mismoTitulo.test.ts.
 */

/** Palabras sueltas que no distinguen un juego de otro. */
const COLETILLAS = new Set([
  "the", "of", "a", "an", "and", "edition", "trophies", "trophy", "ps3", "ps4", "ps5", "vita", "psvita",
  "playstation", "remastered", "remaster", "definitive", "goty", "deluxe", "standard", "pc",
  "director", "directors", "cut", "s",
]);

/**
 * Coletillas de VARIAS palabras, que se quitan enteras (17 nov 2026): como
 * palabras sueltas, «complete» o «game» igualaban «LEGO Star Wars: The
 * Complete Saga» con «The Skywalker Saga».
 */
const FRASES = [
  /\b(game of the year|complete|classic|ultimate|gold|digital deluxe|enhanced)\s+edition\b/g,
  /\btrophy\s+set\b/g,
  /\bfor\s+playstation\b/g,
  // «PlayStation®4 Edition», «PS5™», «PS Vita»: la consola no es parte del
  // nombre (y se quita antes de separar letras de números, o «ps4» dejaría un «4»).
  /playstation\s*[345]\b/g,
  /\bps\s*([345]|vita)\b/g,
  // El año entre paréntesis: «Oblivion GOTY Edition (2009)».
  /\(\s*(19|20)\d\d\s*\)/g,
];

function palabras(titulo: string): string[] {
  let t = titulo
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[®™©]/g, "")
    .replace(/&/g, " and ");
  for (const f of FRASES) t = t.replace(f, " ");
  return (
    t
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      // «DIRT5» y «Dirt 5» son el mismo juego (como `normalizar` en lib/igdb/client.ts).
      .replace(/(\p{L})(\d)/gu, "$1 $2")
      .split(" ")
      .filter((p) => p && !COLETILLAS.has(p))
  );
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

/**
 * ¿Algún nombre de IGDB (el principal o los alternativos) es nuestro juego?
 * Además del título entero, vale el título sin un subtítulo de UNA palabra
 * de edición («Hollow Knight: Voidheart Edition» es «Hollow Knight»), pero
 * no uno más largo: «Call of Duty: Modern Warfare II - Open Beta» no es
 * «Call of Duty», ni «Batman: Arkham Knight» es «Batman».
 */
export function esElMismoJuego(nombresIgdb: string[], titulo: string): boolean {
  const candidatos = [titulo];
  const corte = titulo.search(/:| - /);
  if (corte > 0) {
    const subtitulo = palabras(titulo.slice(corte));
    if (subtitulo.length <= 1) candidatos.push(titulo.slice(0, corte));
  }
  return nombresIgdb.some((n) => candidatos.some((c) => mismoTitulo(n, c)));
}

/**
 * Familias de plataforma de IGDB (`platforms.abbreviation`) por plataforma
 * de Paragon, para desempatar juegos que se llaman igual («God of War» de
 * 2005 y de 2018) y para no aceptar uno que no salió donde lo tienes.
 */
export const PLATAFORMAS_IGDB: Record<string, string[]> = {
  psn: ["PS3", "PS4", "PS5", "Vita", "PSV", "PS Vita", "PSVR", "PSVR2"],
  steam: ["PC", "Win", "Mac", "Linux"],
  epic: ["PC", "Win", "Mac"],
  xbox: ["X360", "XONE", "Series X|S", "Series X", "XBOX", "PC", "Win"],
};

/** ¿Salió en esa familia? Sin datos de plataforma en IGDB, se da por bueno. */
export function salioEn(plataformasIgdb: string[] | undefined, plataforma: string): boolean {
  const familia = PLATAFORMAS_IGDB[plataforma];
  if (!familia || !plataformasIgdb || plataformasIgdb.length === 0) return true;
  return plataformasIgdb.some((p) => familia.includes(p));
}
