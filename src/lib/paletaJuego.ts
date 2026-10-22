/**
 * Paleta "desde tu juego" (Ajustes → Apariencia): toda la app teñida con el
 * color dominante de la carátula de un juego (`games.auraColor`, ver
 * lib/coverAura.ts).
 *
 * Una carátula no garantiza nada: hay colores casi negros, casi blancos o
 * grises. El color se corrige siempre aquí, no en CSS: el acento se aclara
 * (en oscuro) o se oscurece (en claro) hasta tener contraste de texto con su
 * fondo, y el fondo es el mismo tono casi sin luz. Sin `server-only`: la usa
 * el cliente al elegir y el guardado de la cuenta al cargar.
 */

export interface PaletaJuego {
  /** Acento en modo oscuro, canal RGB suelto ("r g b"), como `--accent-rgb`. */
  rgb: string;
  /** Acento en modo claro (más oscuro). */
  rgbClaro: string;
  /** Extremo claro del degradado de marca (`--accent-2`). */
  c2: string;
  /** Suelo en modo oscuro: fondo, superficie, superficie 2 y borde. */
  bg: string;
  surface: string;
  surface2: string;
  border: string;
}

type Rgb = [number, number, number];

function hexARgb(hex: string): Rgb | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

function rgbAHsl([r, g, b]: Rgb): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function hslARgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function luminancia([r, g, b]: Rgb): number {
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Relación de contraste WCAG entre dos colores (1 a 21). */
export function contraste(a: Rgb, b: Rgb): number {
  const [la, lb] = [luminancia(a), luminancia(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const canal = (c: Rgb) => c.join(" ");
const hex = (c: Rgb) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;

/** Contraste mínimo del acento contra su fondo (texto normal, WCAG AA holgado). */
export const CONTRASTE_MINIMO = 5;
const BLANCO: Rgb = [255, 255, 255];

export function paletaDesdeColor(color: string): PaletaJuego | null {
  const base = hexARgb(color);
  if (!base) return null;
  const [h, sOriginal] = rgbAHsl(base);
  // Un gris se queda gris (es el color de verdad de esa carátula); un color
  // apagado se aviva un poco para que el acento se lea como acento.
  const s = sOriginal < 0.12 ? sOriginal : Math.max(sOriginal, 0.55);

  const satSuelo = Math.min(s, 0.5) * 0.6;
  const bg = hslARgb(h, satSuelo, 0.055);
  const surface = hslARgb(h, satSuelo, 0.085);
  const surface2 = hslARgb(h, satSuelo, 0.13);
  const border = hslARgb(h, satSuelo * 0.9, 0.19);

  // Oscuro: se sube la luz hasta que el acento se lea sobre la superficie
  // (la más clara de las dos donde va texto). Claro: se baja hasta leerse
  // sobre blanco.
  let lOscuro = Math.max(rgbAHsl(base)[2], 0.55);
  while (contraste(hslARgb(h, s, lOscuro), surface) < CONTRASTE_MINIMO && lOscuro < 0.95) lOscuro += 0.01;
  let lClaro = Math.min(rgbAHsl(base)[2], 0.45);
  while (contraste(hslARgb(h, s, lClaro), BLANCO) < CONTRASTE_MINIMO && lClaro > 0.05) lClaro -= 0.01;

  return {
    rgb: canal(hslARgb(h, s, lOscuro)),
    rgbClaro: canal(hslARgb(h, s, lClaro)),
    c2: hex(hslARgb(h, s * 0.8, Math.max(lOscuro, 0.86))),
    bg: hex(bg),
    surface: hex(surface),
    surface2: hex(surface2),
    border: hex(border),
  };
}

/** Variables CSS que lee `.accent-juego` en globals.css. */
export function variablesPaleta(p: PaletaJuego): Record<string, string> {
  return {
    "--juego-rgb": p.rgb,
    "--juego-rgb-claro": p.rgbClaro,
    "--juego-2": p.c2,
    "--juego-bg": p.bg,
    "--juego-surface": p.surface,
    "--juego-surface-2": p.surface2,
    "--juego-border": p.border,
  };
}

/**
 * "Color de fondo" libre (Ajustes → Apariencia, 22 oct 2026): del color que
 * elige la persona salen el fondo, las dos superficies, el borde y el color
 * del texto. El texto se elige por contraste (claro sobre fondos oscuros,
 * oscuro sobre claros), así que cualquier color se puede leer; el fondo se
 * respeta tal cual.
 */
export interface SueloLibre {
  claro: boolean;
  vars: Record<string, string>;
}

const TEXTO_CLARO: Rgb = [233, 238, 247];
const TEXTO_OSCURO: Rgb = [16, 21, 31];
const NEGRO: Rgb = [0, 0, 0];

function mezclar(a: Rgb, b: Rgb, t: number): Rgb {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as Rgb;
}

export function sueloDesdeFondo(color: string): SueloLibre | null {
  const bg = hexARgb(color);
  if (!bg) return null;
  const claro = contraste(TEXTO_OSCURO, bg) > contraste(TEXTO_CLARO, bg);
  const texto = claro ? TEXTO_OSCURO : TEXTO_CLARO;
  const [surface, surface2, border] = claro
    ? [mezclar(bg, BLANCO, 0.55), mezclar(bg, NEGRO, 0.05), mezclar(bg, NEGRO, 0.16)]
    : [mezclar(bg, BLANCO, 0.04), mezclar(bg, BLANCO, 0.09), mezclar(bg, BLANCO, 0.14)];
  // Texto secundario: el principal fundido con el fondo, pero sin bajar de un
  // contraste legible (con fondos de tono medio hay que fundirlo menos).
  let mezcla = 0.35;
  let muted = mezclar(texto, bg, mezcla);
  while (mezcla > 0 && Math.min(contraste(muted, bg), contraste(muted, surface)) < 3.5) {
    mezcla = Math.max(0, mezcla - 0.05);
    muted = mezclar(texto, bg, mezcla);
  }
  return {
    claro,
    vars: {
      "--background": hex(bg),
      "--surface": hex(surface),
      "--surface-2": hex(surface2),
      "--border": hex(border),
      "--foreground": hex(texto),
      "--muted": hex(muted),
    },
  };
}

/** Contraste entre dos colores en hex (`null` si alguno no vale). */
export function contrasteHex(a: string, b: string): number | null {
  const [x, y] = [hexARgb(a), hexARgb(b)];
  return x && y ? contraste(x, y) : null;
}
