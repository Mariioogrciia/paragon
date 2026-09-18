import sharp from "sharp";
import { db } from "@/db";
import { games as gamesTable } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * "Game Aura": color dominante de la carátula de un juego, para teñir el
 * ambiente de una Hero Card (ver PinnedGameBanner.tsx) en vez de que todo
 * use el mismo azul de siempre — mismo concepto que ya usa la app Android
 * con `Palette` sobre el bitmap.
 *
 * Se calcula en el SERVIDOR con `sharp`, no en el navegador con
 * `<canvas>`: las carátulas vienen de dominios que no controlamos
 * (IGDB/PSN/Steam) y no hay garantía de que se sirvan con cabeceras CORS —
 * sin ellas, `canvas.getImageData()` lanza `SecurityError` en el cliente.
 * Pidiendo la imagen servidor-a-servidor (aquí, con `fetch`) ese problema
 * no existe: CORS es una restricción del navegador, no del servidor.
 *
 * Cacheado en `games.auraColor` (una fila por juego, no por usuario) —
 * una carátula no cambia de color nunca, así que se calcula una sola vez
 * por juego en toda la vida de la app, igual que `missableTrophies` en
 * `lib/profiles.ts`. `checkedAt` sin `auraColor` significa "se intentó y
 * no se pudo" (portada rota, red caída ese día) — no se reintenta en cada
 * carga, solo se sirve sin aura hasta que alguien lo fuerce a mano.
 */
export async function getOrComputeAuraColor(gameId: string, coverUrl: string | undefined | null): Promise<string | null> {
  if (!coverUrl) return null;

  const [row] = await db
    .select({ auraColor: gamesTable.auraColor, checkedAt: gamesTable.auraColorCheckedAt })
    .from(gamesTable)
    .where(eq(gamesTable.id, gameId))
    .limit(1);

  if (row?.auraColor) return row.auraColor;
  if (row?.checkedAt) return null;

  const color = await calcularColorDominante(coverUrl);
  // Se marca `checkedAt` aunque `color` salga null — así una portada rota
  // no se reintenta en cada visita de cada usuario, solo cuando cambie de
  // verdad (lo que no pasa nunca hoy) o alguien limpie la columna a mano.
  await db.update(gamesTable).set({ auraColor: color, auraColorCheckedAt: new Date() }).where(eq(gamesTable.id, gameId));
  return color;
}

async function calcularColorDominante(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // 24x24 basta para un color medio — no hace falta la imagen entera.
    const { data, info } = await sharp(buf)
      .resize(24, 24, { fit: "inside" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
    if (n === 0) return null;
    r /= n;
    g /= n;
    b /= n;

    // El promedio crudo de una carátula suele salir gris apagado (mezcla
    // de fondo oscuro + logo + personaje). Se sube a saturación/luz mínima
    // en HSL para que siempre sea un color reconocible, no un gris sin
    // personalidad — mismo espíritu que "aclarar mezclando con blanco" en
    // la versión Android, hecho en el espacio de color correcto para esto.
    const [h, s, l] = rgbToHsl(r, g, b);
    const [r2, g2, b2] = hslToRgb(h, Math.max(s, 0.4), Math.min(Math.max(l, 0.32), 0.62));

    const hex = (v: number) => Math.round(v).toString(16).padStart(2, "0");
    return `#${hex(r2)}${hex(g2)}${hex(b2)}`;
  } catch {
    return null;
  }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t0: number) => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
}
