import "server-only";

/**
 * Trofeos perdibles, vía PowerPyx (powerpyx.com) — guías de trofeos de
 * PlayStation escritas a mano por su equipo, con cada trofeo perdible
 * marcado literalmente "MISSABLE TROPHY" justo debajo de su nombre.
 *
 * Por qué esto y no una heurística sobre el texto del propio trofeo (lo que
 * había antes, en dos intentos distintos): la descripción que da PSN/Steam
 * de un trofeo NO avisa nunca de si es perdible — comprobado contra los
 * 15.574 trofeos reales de la base, 0 contienen la palabra "missable" y las
 * pocas coincidencias con patrones más amplios eran nombres de nivel que
 * casualmente sonaban a aviso ("Point of No Return" como título de misión).
 * PowerPyx sí tiene el dato real porque lo escribe una persona que se ha
 * pasado el juego, no un campo de la API.
 *
 * Riesgo asumido a propósito, mismo criterio que OpenXBL (lib/xbl/client.ts)
 * y el resto de scraping de este proyecto: es un sitio de terceros, puede
 * cambiar su HTML o bloquear en cualquier momento sin avisar. Si falla, la
 * ficha se sirve igual, sin el aviso de perdible — nunca se rompe por esto.
 *
 * Solo cubre juegos de PlayStation: PowerPyx no tiene guías de Steam (Garry's
 * Mod, por ejemplo, no tiene ningún resultado — comprobado a mano) ni de
 * Xbox. Para el resto de plataformas simplemente no se muestra nada.
 *
 * COBERTURA REAL MEDIDA, no solo teórica — probado contra 6 juegos reales
 * de una biblioteca real (Assassin's Creed Unity, los tres Uncharted
 * Remastered, The Last of Us Part II, Black Myth: Wukong): NINGUNO mostró
 * el aviso. Dos motivos, distintos y ambos esperables:
 * 1. La coincidencia de título exige ser EXACTA a propósito (ver
 *    `buscarGuia`) — 5 de los 6 no encontraron ese exacto por diferencias
 *    de puntuación/sufijo entre nuestro título y el de la guía de PowerPyx
 *    ("Remastered", posesivos con apóstrofe distinto, etc.).
 * 2. PowerPyx cambió de formato con los años: MGS4 (2008, probado y
 *    funcionando, 23 trofeos detectados) usa la tabla clásica con
 *    "MISSABLE TROPHY"; guías más nuevas (Black Myth: Wukong, y aparentemente
 *    Uncharted 4 pese a ser de 2016) usan otro maquetado — con el plugin
 *    TablePress o con prosa por capítulos remitiendo a "ver el Paso 1" — sin
 *    ningún marcador por trofeo que se pueda extraer de forma fiable.
 *
 * Es decir: el sistema es CORRECTO (nunca un falso positivo, comprobado) y
 * la fuente es real, pero la cobertura práctica hoy es baja. Subir esa
 * cobertura sin arriesgar precisión pasaría por relajar la coincidencia de
 * título (con cuidado: relajarla demasiado es lo que causó el caso real de
 * "The Witcher 3" emparejando con el DLC "Blood and Wine") o por sumar un
 * segundo parser para el formato TablePress — ninguna de las dos está
 * hecha. Mientras tanto, el aviso simplemente no sale para la mayoría de
 * juegos, que es preferible a arriesgar un falso "Perdible".
 */

const USER_AGENT = "Paragon/1.0 (+https://github.com/Mariioogrciia/paragon)";
const BASE = "https://www.powerpyx.com";

/** El HTML de WordPress escapa "&", comillas y demas como entidades — sin
 * decodificarlas antes de normalizar, "Trophy Guide &amp; Roadmap" no
 * coincide con el patron de sufijo "trophy guide & roadmap" (comprobado a
 * mano: fallaba justo por esto para Metal Gear Solid 4 y Black Myth: Wukong,
 * los dos con "&" en el titulo real de su guia). */
function decodificarEntidades(s: string): string {
  return s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&");
}

/** Minúsculas, sin tildes, sin puntuación ni sufijos de edición — para poder
 * comparar "Alan Wake Remastered" (nuestro título) contra "Alan Wake
 * Remastered Trophy Guide" (el título de PowerPyx) y que coincidan. */
/** Exportada para que quien consuma `trofeosPerdiblesDe` normalice el
 * nombre de SU trofeo exactamente igual antes de comparar contra el set. */
export function normalizar(titulo: string): string {
  return decodificarEntidades(titulo)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/(trophy guide( ?& ?roadmap)?|roadmap|walkthrough)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Busca la guía de un juego por título y devuelve su URL — solo si hay una
 * coincidencia EXACTA tras normalizar. Nunca "el primer resultado": buscando
 * "The Witcher 3" el primer resultado real es el DLC "Blood and Wine", no el
 * juego base — usar el primero a ciegas habría marcado trofeos al azar del
 * juego equivocado como perdibles. Sin coincidencia exacta, mejor no
 * enseñar nada que enseñar el aviso equivocado.
 */
async function buscarGuia(titulo: string): Promise<string | null> {
  const objetivo = normalizar(titulo);
  if (!objetivo) return null;

  // El buscador de PowerPyx (WordPress) devuelve "sin resultados" si la
  // consulta lleva el símbolo de marca registrada (™/®) que traen algunos
  // títulos de PSN/Steam tal cual — comprobado a mano: buscar "Uncharted 4:
  // A Thief's End™" no encuentra nada, buscar sin el "™" sí encuentra la
  // guía exacta. Se busca con el título limpio; la comparación de igualdad
  // sigue siendo con `normalizar()`, que ya ignora esto de todas formas.
  const consulta = titulo.replace(/[™®©]/g, "").trim();

  const res = await fetch(`${BASE}/?s=${encodeURIComponent(consulta)}`, {
    headers: { "User-Agent": USER_AGENT },
    // Un mes: quién tiene guía y quién no apenas cambia. Es una consulta de
    // catálogo, no de progreso de nadie.
    next: { revalidate: 30 * 86_400 },
  });
  if (!res.ok) return null;

  const html = await res.text();
  if (html.includes("search-no-results")) return null;

  const resultados = [...html.matchAll(/entry-title-link"[^>]*href="([^"]+)">([^<]+)</g)];
  for (const [, href, texto] of resultados) {
    if (normalizar(texto) === objetivo) return href;
  }
  return null;
}

/**
 * Nombres de trofeo (tal cual los escribe PowerPyx, normalizados) marcados
 * como perdibles en la guía de un juego.
 *
 * Estructura real de la página (comprobada a mano contra la guía de Metal
 * Gear Solid 4): una tabla con una fila por trofeo (nombre + descripción) y,
 * cuando es perdible, una fila extra justo después con "MISSABLE TROPHY" en
 * rojo. Se recorre el HTML en orden llevando "el último trofeo visto" y
 * marcándolo perdible en cuanto aparece el aviso.
 */
async function trofeosPerdibles(urlGuia: string): Promise<Set<string>> {
  const res = await fetch(urlGuia, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 30 * 86_400 },
  });
  if (!res.ok) return new Set();

  const html = await res.text();
  const perdibles = new Set<string>();
  let ultimo: string | null = null;

  for (const m of html.matchAll(/<td>([^<]{2,90})<br\s*\/?>|MISSABLE TROPHY/g)) {
    if (m[1]) {
      ultimo = normalizar(
        m[1]
          .replace(/&#8217;|&#39;/g, "'")
          .replace(/&amp;/g, "&")
          .trim(),
      );
    } else if (ultimo) {
      perdibles.add(ultimo);
    }
  }
  return perdibles;
}

/**
 * Punto de entrada: dado el título de un juego, los nombres normalizados de
 * sus trofeos perdibles según PowerPyx (vacío si no hay guía, si la
 * petición falla, o si algo no encaja). Nunca lanza — un fallo aquí no
 * puede tirar abajo la ficha de un juego.
 */
export async function trofeosPerdiblesDe(tituloJuego: string): Promise<Set<string>> {
  try {
    const guia = await buscarGuia(tituloJuego);
    if (!guia) return new Set();
    return await trofeosPerdibles(guia);
  } catch (error) {
    console.error("[powerpyx] trofeosPerdiblesDe", error);
    return new Set();
  }
}
