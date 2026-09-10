import "server-only";
import Parser from "rss-parser";
import { searchGames } from "@/lib/igdb/client";

/**
 * Juegos del mes de PlayStation Plus, vía el blog oficial de PlayStation —
 * EN ESPAÑOL (`blog.es.playstation.com`), no el de EE.UU.
 * (`blog.playstation.com`). Error real de una sesión anterior: se usaba el
 * feed en inglés, cuyo tag `ps-plus` llevaba meses sin publicar nada nuevo
 * (última entrada: marzo) — y de ahí se concluyó que Sony no había
 * anunciado nada más reciente, cuando el blog en español SÍ tenía el
 * anuncio de septiembre publicado ese mismo día. Comprobado a mano el 10
 * de septiembre de 2026 contra la fuente real.
 *
 * Tampoco vale cualquier tag: `/tag/ps-plus/feed` (con guion) es una
 * categoría distinta y menos usada de la que parece — el tag de verdad,
 * el que SÍ lleva el anuncio mensual siempre, es `/tag/playstation-plus/`
 * (comprobado mirando los tags reales del post de septiembre en su propio
 * HTML, no adivinando por el nombre "parecido").
 *
 * No hay una API pública de Sony para el catálogo de PS Plus en sí, así
 * que el título del propio post es la única lista de verdad que hay. Ojo:
 * el título HA CAMBIADO DE FORMATO más de una vez con los meses —
 * "Juegos mensuales de PlayStation Plus de <mes>: ..." antes,
 * "Catálogo de juegos de PlayStation Plus de/para <mes>: ..." después —
 * así que el patrón de abajo no ancla a una frase fija completa, solo a
 * "PlayStation Plus" seguido de una palabra (el mes) y los dos puntos.
 * Cada nombre se busca en IGDB (mismo buscador que ya usa
 * `AddManualGameModal`) para sacarle carátula e igdbId y poder enseñarlo
 * como una tarjeta de verdad, no solo un enlace al artículo.
 *
 * IMPORTANTE — no volver a poner una lista a mano aquí: hubo una versión
 * con los nombres de un mes concreto escritos a fuego ("el feed está
 * devolviendo el mes viejo, forzamos estos mientras tanto") que se quedó
 * así de una sesión a otra y acabó enseñando un mes que ya no era el
 * actual, siendo indistinguible en pantalla de un dato real. Si el feed de
 * verdad no ha publicado el mes en curso todavía, lo honesto es enseñar el
 * último real (con su fecha) hasta que Sony publique el siguiente — nunca
 * inventar los nombres.
 */

export interface PsPlusJuego {
  igdbId: number;
  title: string;
  iconUrl?: string;
}

export interface PsPlusMensual {
  titulo: string;
  /** El mes del anuncio, tal cual lo escribe Sony — el blog en español ya viene en español, sin traducir nada. */
  mes: string | null;
  link: string;
  fecha: string | null;
  juegos: PsPlusJuego[];
}

/**
 * Precio de cada nivel, tarifas de 1 y de 12 meses (España) — curado a
 * mano, NO en vivo. Se probó a sacarlo de
 * `playstation.com/es-es/ps-plus/whats-new` (el precio real SÍ está
 * embebido ahí, comprobado), pero una petición sin sesión (curl a pelo,
 * sin cookies ni JS) dio una cifra de Essential distinta a la que se ve
 * navegando de verdad — con el navegador real, comprobado dos veces
 * seguidas en sesiones separadas, los números SÍ salieron idénticos las
 * dos veces. Aun así, mejor no fiarse de un scraping en un fetch de
 * servidor sin esa sesión real detrás: un valor puesto a mano, con la
 * fecha de cuándo se comprobó bien visible, es más honesto.
 *
 * ACTUALIZAR A MANO si Sony sube el precio — última comprobación abajo.
 */
export const PRECIO_PSPLUS_EUR = {
  essential: { mes: 9.99, anual: 71.99 },
  extra: { mes: 15.99, anual: 125.99 },
  premium: { mes: 18.99, anual: 151.99 },
  comprobadoEl: "2026-09-10",
} as const;

const FEED_URL = "https://blog.es.playstation.com/tag/playstation-plus/feed/";
const USER_AGENT = "Paragon/1.0 (+https://github.com/Mariioogrciia/paragon)";

const parser = new Parser();

/**
 * Ancla solo a "PlayStation Plus" + una palabra (el mes) + ":" — a
 * propósito, no a una frase de arranque fija completa. El título de Sony
 * ha cambiado de formato más de una vez ("Juegos mensuales de..." →
 * "Catálogo de juegos de..."), y anclar a una sola frase exacta es
 * exactamente lo que rompió esto la vez anterior: el código seguía
 * "funcionando" (sin error) pero dejaba de encontrar el anuncio nuevo en
 * silencio, indistinguible de "Sony no ha publicado nada".
 */
const PATRON_TITULO = /playstation plus (?:de|para)?\s*([a-záéíóúñ]+):\s*(.+)$/i;

/**
 * "Catálogo de juegos de PlayStation Plus de septiembre: A, B, C" → ["A", "B", "C"].
 * Se corta por el PRIMER ":" que encuentra el patrón — algún juego trae su
 * propio ":" en el nombre (p. ej. "The Elder Scrolls Online Collection:
 * Gold Road"), y no hay que confundirlo con el separador del título.
 */
// Cuando hay más juegos de los que caben en el título, Sony remata la
// lista con una coletilla en vez de un nombre más — "entre otros", "y
// más", "y mucho más". Sin filtrarlas, acaban tratadas como si fueran un
// juego más y se le busca portada en IGDB (que con suerte no encuentra
// nada, pero con mala suerte encajaría con cualquier cosa por búsqueda
// difusa — mejor no arriesgarse).
const COLETILLAS = new Set(["entre otros", "y más", "y mucho más", "mucho más", "más"]);

function juegosDelTitulo(titulo: string): string[] {
  const match = PATRON_TITULO.exec(titulo);
  if (!match) return [];

  // "A, B, C y D" → "A, B, C, D" — el español conecta el ÚLTIMO elemento de
  // la lista con "y" en vez de coma (a diferencia del inglés, que ya venía
  // así). El lookahead negativo asegura que es la ÚLTIMA "y" del título
  // (la conjunción de la lista), no una que apareciera antes por casualidad.
  const normalizado = match[2].replace(/,?\s+y\s+(?!.*\sy\s)/i, ", ");

  return normalizado
    .split(",")
    .map((s) => s.replace(/\.+$/, "").trim())
    .filter((s) => s && !COLETILLAS.has(s.toLowerCase()));
}

function mesDelTitulo(titulo: string): string | null {
  const match = PATRON_TITULO.exec(titulo);
  return match ? match[1].trim() : null;
}

export async function getPsPlusMensual(): Promise<PsPlusMensual | null> {
  try {
    const res = await fetch(FEED_URL, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 21_600 }, // 6h, como el resto de feeds — esto cambia una vez al mes.
    });
    if (!res.ok) return null;

    const xml = await res.text();
    const feed = await parser.parseString(xml);

    // El tag trae de todo (subidas de precio, noticias de catálogo...); el
    // anuncio mensual es el primero cuyo título encaja con PATRON_TITULO —
    // no se asume que sea siempre el primer item del feed sin más.
    const anuncio = (feed.items ?? []).find((item) => PATRON_TITULO.test(item.title ?? ""));
    if (!anuncio?.title) return null;

    const nombres = juegosDelTitulo(anuncio.title);

    // Una búsqueda de IGDB por nombre, en paralelo. `search` es difuso
    // (mismo motivo que ya evita el emparejador de PEGI), pero aquí el
    // coste de acertar con la edición equivocada de un mismo juego es
    // bajo — es una carátula promocional, no un dato que se guarde.
    const juegos = (
      await Promise.all(
        nombres.map(async (nombre): Promise<PsPlusJuego | null> => {
          try {
            const [resultado] = await searchGames(nombre, 1);
            if (!resultado) return null;
            return { igdbId: resultado.igdbId, title: resultado.title, iconUrl: resultado.coverUrl };
          } catch {
            return null;
          }
        }),
      )
    ).filter((g): g is PsPlusJuego => g !== null);

    return {
      titulo: anuncio.title,
      mes: mesDelTitulo(anuncio.title),
      link: anuncio.link ?? FEED_URL,
      fecha: anuncio.pubDate ?? null,
      juegos,
    };
  } catch (error) {
    console.error("[psPlus] no se pudo leer el feed", error);
    return null;
  }
}
