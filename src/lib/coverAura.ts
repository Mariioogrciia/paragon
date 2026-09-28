import { decode as decodificarJpeg } from "jpeg-js";
import { PNG } from "pngjs";
import { db } from "@/db";
import { games as gamesTable } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * "Game Aura": color dominante de la carátula de un juego, para teñir el
 * ambiente de una Hero Card (ver PinnedGameBanner.tsx) en vez de que todo
 * use el mismo azul de siempre — mismo concepto que ya usa la app Android
 * con `Palette` sobre el bitmap.
 *
 * Se calcula en el SERVIDOR, no en el navegador con
 * `<canvas>`: las carátulas vienen de dominios que no controlamos
 * (IGDB/PSN/Steam) y no hay garantía de que se sirvan con cabeceras CORS —
 * sin ellas, `canvas.getImageData()` lanza `SecurityError` en el cliente.
 * Pidiendo la imagen servidor-a-servidor (aquí, con `fetch`) ese problema
 * no existe: CORS es una restricción del navegador, no del servidor.
 *
 * Decodificado con `jpeg-js`/`pngjs` (JavaScript puro, <1 MB) y no con
 * `sharp` (auditoría, 25 sept 2026): `sharp` y sus binarios de libvips se
 * empaquetaban en TODAS las funciones de Vercel por estar instalado, y el
 * Functions Storage del plan Hobby estaba al 90% (9 GB / 10 GB). Las
 * carátulas son PNG (PSN) o JPEG (Steam y el resto); cualquier otro formato
 * se queda sin aura, igual que una portada rota.
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
    // Bug real en producción (23 sept 2026): sin timeout, un CDN lento o
    // colgado (PSN, Steam) bloqueaba TODA la carga del perfil — visto en
    // vivo con /u/[handle] tardando 28s+ ("application-code") y acabando
    // en "The destination stream closed early" (el cliente se rindió antes
    // de que el servidor terminara). Este `fetch` es la única llamada de
    // red sin límite de tiempo en todo el camino de esta función — falla
    // rápido y se cachea como "sin aura" igual que cualquier otro fallo
    // (checkedAt más abajo), no se reintenta en cada visita.
    const res = await fetch(url, { signal: AbortSignal.timeout(6_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const imagen = decodificar(buf);
    if (!imagen) return null;

    // Media de RGB sobre una rejilla de ~24×24 puntos (lo mismo que hacía el
    // `resize(24, 24)` de sharp antes, sin recorrer cada píxel). El canal
    // alfa se ignora, como el `removeAlpha()` de antes.
    const { width, height, data } = imagen;
    const pasoX = Math.max(1, Math.floor(width / 24));
    const pasoY = Math.max(1, Math.floor(height / 24));
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let y = 0; y < height; y += pasoY) {
      for (let x = 0; x < width; x += pasoX) {
        const i = (y * width + x) * 4;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n++;
      }
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

/** RGBA de 8 bits, 4 bytes por píxel — lo que devuelven jpeg-js y pngjs. */
function decodificar(buf: Buffer): { width: number; height: number; data: Uint8Array } | null {
  // Por firma, no por extensión de la URL: varias (Xbox) no llevan extensión.
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    // Tope de memoria: una carátula es de unos cientos de px; esto solo
    // corta una imagen absurda antes de reventar la función.
    return decodificarJpeg(buf, { useTArray: true, maxMemoryUsageInMB: 64 });
  }
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString("latin1") === "PNG") {
    return PNG.sync.read(buf);
  }
  return null;
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
