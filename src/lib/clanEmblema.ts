/**
 * Escudo de un clan, al estilo Clash of Clans: forma + símbolo + color de
 * fondo + color del símbolo, elegidos de un catálogo fijo (sin subir fotos:
 * nada que moderar y se ve igual en la web y en la app).
 *
 * Se guarda en `clans.logoUrl` (columna que existía sin usarse) como texto:
 * `emblema:1:<forma>:<simbolo>:<fondo>:<color>`, con `fondo` y `color` como
 * índices de COLORES. La app tiene el MISMO catálogo, con las mismas claves
 * y en el mismo orden (kmp/.../ui/social/EscudoClan.kt): si se cambia aquí,
 * cambiarlo allí.
 */

export const FORMAS = ["escudo", "circulo", "hexagono", "estandarte", "rombo"] as const;
export type Forma = (typeof FORMAS)[number];

/** Trazado de cada forma en una caja de 100×100. */
export const TRAZADO_FORMA: Record<Forma, string> = {
  escudo: "M50 4 L90 16 V48 C90 72 72 88 50 96 C28 88 10 72 10 48 V16 Z",
  circulo: "M50 4 A46 46 0 1 1 49.99 4 Z",
  hexagono: "M50 4 L90 27 V73 L50 96 L10 73 V27 Z",
  estandarte: "M14 4 H86 V92 L50 76 L14 92 Z",
  rombo: "M50 3 L97 50 L50 97 L3 50 Z",
};

/** Símbolos: iconos de Material (react-icons/md en la web, material-icons-extended en la app). */
export const SIMBOLOS = [
  "copa", "rayo", "llama", "estrella", "medalla", "mando",
  "cohete", "garra", "castillo", "diamante", "ancla", "copo",
] as const;
export type Simbolo = (typeof SIMBOLOS)[number];

export const COLORES = [
  "#E53935", "#FB8C00", "#F2B632", "#2E9E5B", "#1FB5AD",
  "#2F6FDB", "#7B4CD8", "#D9468C", "#2A2F3A", "#EDE6D6",
] as const;

export interface Emblema {
  forma: Forma;
  simbolo: Simbolo;
  fondo: number;
  color: number;
}

/** El de un clan que aún no ha elegido: escudo azul con copa dorada. */
export const EMBLEMA_POR_DEFECTO: Emblema = { forma: "escudo", simbolo: "copa", fondo: 5, color: 2 };

export function emblemaATexto(e: Emblema): string {
  return `emblema:1:${e.forma}:${e.simbolo}:${e.fondo}:${e.color}`;
}

/** null si no es un emblema válido (p. ej. un logoUrl antiguo o vacío). */
export function textoAEmblema(texto: string | null | undefined): Emblema | null {
  const partes = texto?.split(":");
  if (!partes || partes.length !== 6 || partes[0] !== "emblema" || partes[1] !== "1") return null;
  const [, , forma, simbolo, fondo, color] = partes;
  const f = Number(fondo);
  const c = Number(color);
  if (!(FORMAS as readonly string[]).includes(forma) || !(SIMBOLOS as readonly string[]).includes(simbolo)) return null;
  if (!Number.isInteger(f) || !Number.isInteger(c) || f < 0 || c < 0 || f >= COLORES.length || c >= COLORES.length) return null;
  return { forma: forma as Forma, simbolo: simbolo as Simbolo, fondo: f, color: c };
}
