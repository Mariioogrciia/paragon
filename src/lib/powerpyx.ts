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
 * COBERTURA REAL MEDIDA, no solo teórica — probado contra 6 juegos reales de
 * una biblioteca real (Assassin's Creed Unity, los tres Uncharted
 * Remastered, The Last of Us Part II, Black Myth: Wukong): NINGUNO mostró el
 * aviso en su momento. Investigado a fondo (7 sept 2026, ver `trofeosPerdibles`
 * para el detalle): NO era un problema de formato de tabla como se pensaba
 * al principio — Black Myth: Wukong usa la MISMA tabla clásica que MGS4, solo
 * con dos diferencias reales, las dos ya arregladas:
 * 1. El nombre del trofeo lleva un ancla de salto (`<a id="...">`) antes del
 *    `<br>` en las guías modernas, que rompía la extracción del nombre y
 *    desplazaba el aviso al trofeo anterior — arreglado (`buscarGuia` no
 *    cambia, es solo el parser de la tabla).
 * 2. El aviso en sí pasó de "MISSABLE TROPHY" a solo "MISSABLE —" (sin la
 *    palabra "TROPHY") en las guías más recientes — arreglado ampliando el
 *    patrón a la palabra suelta en mayúsculas.
 *
 * Se suma `resumenPerdibles` (7 sept 2026): además del aviso suelto en la
 * tabla, las guías modernas listan TODOS los perdibles de golpe en un
 * resumen antes de la tabla — es lo que subió Black Myth: Wukong de 2/7 a
 * 7/7 nombres detectados. Ver su comentario para el detalle real.
 *
 * Otro bug real encontrado y arreglado el mismo día, más grave que la falta
 * de formato: `normalizar()` llevaba dos bytes de control (`\x08`, backspace)
 * colados dentro de su regex de sufijos — invisibles en cualquier editor —
 * que impedían que el sufijo "Trophy Guide & Roadmap" se recortara NUNCA.
 * Como casi todas las guías de PowerPyx terminan así, esto rompía la
 * coincidencia de título para la inmensa mayoría de juegos, no solo para
 * los 5 "casos raros" que este documento culpaba antes. Ya estaba en el
 * commit anterior a esta sesión, no lo introdujo ningún cambio de hoy.
 *
 * Lo que SIGUE limitando la cobertura, sin arreglar: la coincidencia de
 * título sigue exigiendo ser EXACTA a propósito (ver `buscarGuia`) —
 * diferencias reales de puntuación/subtítulo entre nuestro título y el de
 * PowerPyx ("Metal Gear Solid 4: Guns of the Patriots" en la base vs "Metal
 * Gear Solid 4" en la guía) siguen sin encontrar coincidencia. Relajarla
 * mejoraría la cobertura pero con cuidado: relajarla demasiado es lo que
 * causó el caso real de "The Witcher 3" emparejando con el DLC "Blood and
 * Wine". Y algunos juegos (Silent Hill 2 Remake: "20, prácticamente todos
 * los trofeos no automáticos") solo explican sus perdibles en prosa, sin
 * nombrarlos uno a uno en ningún sitio — ahí no hay nada que extraer sea
 * cual sea el parser. El sistema sigue siendo CORRECTO (nunca un falso
 * positivo, comprobado) antes que exhaustivo.
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
    .replace(/(trophy guide( ?& ?roadmap)?|roadmap|walkthrough)/g, "")
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
 * Gear Solid 4 —formato clásico— y Black Myth: Wukong —formato nuevo—): una
 * tabla con una fila por trofeo (nombre + descripción) y, cuando es
 * perdible, una fila extra justo después con el aviso en rojo — "MISSABLE
 * TROPHY" en las guías clásicas, solo "MISSABLE –" en las más recientes (sin
 * "TROPHY"). Se recorre el HTML en orden llevando "el último trofeo visto" y
 * marcándolo perdible en cuanto aparece el aviso.
 *
 * Dos trampas reales encontradas al comprobar esto contra HTML real, las dos
 * causaban ATRIBUCIÓN A UN TROFEO EQUIVOCADO (peor que no detectar nada):
 *
 * 1. Bastantes celdas de nombre llevan un ancla de salto justo antes del
 *    `<br>` para los enlaces "ir a este trofeo" del resumen de arriba —
 *    `<td>Urge Unfulfilled<a id="urge-unfulfilled"></a><br />...`. El
 *    patrón anterior (`<td>([^<]{2,90})<br`) no cruza esa `<a>` y se saltaba
 *    el nombre entero, así que el aviso de "Urge Unfulfilled" quedaba mal
 *    colgado del trofeo anterior. Comprobado contra MGS4 real: el patrón
 *    viejo daba "Hands up!" y "SUNLIGHT!" DOS VECES como perdibles (mal);
 *    con el ancla opcional salen "Flashback Mania" y "Sounds of the
 *    Battlefield" (los nombres reales que llevan el aviso al lado).
 * 2. El marcador en sí cambió de "MISSABLE TROPHY" a solo "MISSABLE –" en
 *    las guías más nuevas. Se busca la palabra suelta en mayúsculas
 *    (`\bMISSABLE\b`, sin la bandera `i`): comprobado a mano que "MISSABLE"
 *    en mayúsculas SOLO aparece como este aviso (0 falsos positivos en las
 *    dos guías de prueba) — el texto normal de PowerPyx usa "missable" en
 *    minúsculas o "unmissable"/"umissable", que no coinciden por el case.
 */
function trofeosPerdibles(html: string): Set<string> {
  const perdibles = new Set<string>();
  let ultimo: string | null = null;

  for (const m of html.matchAll(/<td>([^<]{2,90})(?:<a[^>]*><\/a>)?<br\s*\/?>|\bMISSABLE\b/g)) {
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
 * Nombres de trofeo marcados como perdibles en el RESUMEN de la guía — la
 * línea "Number of missable trophies: N" que traen las guías más modernas,
 * ANTES de la tabla, con un `<ul>` listando los N nombres de un tirón.
 * Complementa a `trofeosPerdibles` (que lee los avisos sueltos dentro de la
 * tabla) en vez de sustituirlo: el resumen suele documentar TODOS los
 * perdibles de golpe, mientras que el aviso en la tabla solo aparece para
 * algunos — comprobado en Black Myth: Wukong, donde el resumen lista 7 y la
 * tabla solo avisa junto al nombre en 2. `trofeosPerdiblesDe` une los dos
 * conjuntos.
 *
 * Estructura real (comprobada contra Black Myth: Wukong y Elden Ring, los
 * dos con lista; y Ghost of Tsushima, Marvel's Spider-Man 2, Final Fantasy 7
 * Rebirth y Silent Hill 2 Remake, los cuatro SIN lista — 0 perdibles o solo
 * prosa sin nombres sueltos): cuando el número es mayor que 0 y viene
 * enumerado, el `<ul>` que sigue trae un `<li>` por perdible, cada uno con un
 * enlace de ancla `<a href="#slug">Nombre</a>` — el mismo `id` que lleva la
 * celda de ese trofeo en la tabla. Esos enlaces se distinguen de los demás
 * que pueda llevar la descripción (a jefes, objetos, otras guías...) porque
 * SOLO ellos apuntan dentro de la propia página (`href="#..."`, sin dominio).
 *
 * La ventana tras el marcador está acotada a propósito: cuando no hay lista
 * (0 perdibles, o perdibles solo explicados en prosa como Silent Hill 2, "20
 * (practically all non-automatic story trophies...)"), el `<ul>` más cercano
 * de la página puede estar muy lejos — comprobado: 3092 a 6222 caracteres en
 * los cuatro juegos de prueba sin lista real — y sin este límite se habría
 * enganchado a un `<ul>` de otra sección sin ninguna relación. Los dos casos
 * reales con lista están mucho más cerca (35 y 426 caracteres).
 */
function resumenPerdibles(html: string): Set<string> {
  const perdibles = new Set<string>();
  const marcador = html.indexOf("Number of missable trophies");
  if (marcador === -1) return perdibles;

  const inicioUl = html.indexOf("<ul>", marcador);
  if (inicioUl === -1 || inicioUl - marcador > 1000) return perdibles;

  const finUl = html.indexOf("</ul>", inicioUl);
  if (finUl === -1) return perdibles;

  const bloque = html.slice(inicioUl, Math.min(finUl, inicioUl + 20_000));
  for (const m of bloque.matchAll(/<a href="#[^"]+">([^<]+)<\/a>/g)) {
    perdibles.add(
      normalizar(
        m[1]
          .replace(/&#8217;|&#39;/g, "'")
          .replace(/&amp;/g, "&")
          .trim(),
      ),
    );
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

    const res = await fetch(guia, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 30 * 86_400 },
    });
    if (!res.ok) return new Set();
    const html = await res.text();

    // Unión, no la primera que encuentre algo: son dos fuentes distintas
    // dentro de la misma página y ninguna cubre sola todos los casos (ver
    // el comentario de `resumenPerdibles`).
    return new Set([...trofeosPerdibles(html), ...resumenPerdibles(html)]);
  } catch (error) {
    console.error("[powerpyx] trofeosPerdiblesDe", error);
    return new Set();
  }
}
