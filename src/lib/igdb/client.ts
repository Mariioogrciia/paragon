import "server-only";

/**
 * Cliente de IGDB (Twitch).
 *
 * IGDB no tiene API key propia: usa OAuth de Twitch. El flujo "Client
 * Credentials" (sin usuario, solo servidor) da un token que sirve para
 * cualquier consulta de solo lectura al catálogo, y dura ~60 días. Se cachea
 * en memoria del proceso: mientras la función serverless siga caliente no
 * hace falta pedirlo de nuevo, igual que el resto de clientes de este
 * proyecto reutilizan conexión en vez de reautenticar en cada llamada.
 *
 * Credenciales: cuenta de desarrollador gratuita en
 * https://dev.twitch.tv/console/apps -> crear app -> Client ID y Client
 * Secret van en IGDB_CLIENT_ID / IGDB_CLIENT_SECRET.
 */

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_API = "https://api.igdb.com/v4";

export class IgdbNotConfiguredError extends Error {
  constructor() {
    super(
      "El servidor no tiene configurado el acceso a IGDB (falta IGDB_CLIENT_ID o IGDB_CLIENT_SECRET).",
    );
    this.name = "IgdbNotConfiguredError";
  }
}

function credentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new IgdbNotConfiguredError();
  return { clientId, clientSecret };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const { clientId, clientSecret } = credentials();
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const response = await fetch(`${TWITCH_TOKEN_URL}?${params}`, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Twitch OAuth rechazó las credenciales de IGDB (${response.status}).`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  // Se resta un margen de 5 minutos para no usar un token que caduque a
  // mitad de una petición.
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 300) * 1000 };
  return cachedToken.value;
}

/**
 * POST contra un endpoint de IGDB con su lenguaje de consulta propio (APIcalypse).
 *
 * `revalidate` cachea la respuesta como el resto del catálogo (ver
 * steam/client.ts): el catálogo mundial de juegos no cambia minuto a minuto.
 */
async function query<T>(endpoint: string, body: string, revalidate = 21_600): Promise<T[]> {
  const token = await accessToken();
  const { clientId } = credentials();

  const response = await fetch(`${IGDB_API}/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body,
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`IGDB respondió ${response.status} en /${endpoint}: ${await response.text()}`);
  }

  return (await response.json()) as T[];
}

/* --------------------------------- Tipos --------------------------------- */

interface IgdbGame {
  id: number;
  name: string;
  cover?: { image_id: string };
  first_release_date?: number;
  release_dates?: { date?: number; human?: string }[];
  platforms?: { abbreviation?: string; name: string }[];
  genres?: { name: string }[];
  involved_companies?: { company: { name: string }; developer: boolean; publisher: boolean }[];
  summary?: string;
  age_ratings?: { organization?: number; rating_category?: number }[];
  alternative_names?: { name: string }[];
}

/**
 * PEGI, sacado de la clasificación por edades de IGDB.
 *
 * Los identificadores están comprobados contra los endpoints
 * `age_rating_organizations` y `age_rating_categories` de la propia API, no
 * puestos de memoria: PEGI es la organización 2, y sus categorías son estas
 * cinco. Contrastado con juegos conocidos (Elden Ring -> 16, Hollow Knight
 * -> 7).
 *
 * Ojo si se toca: los campos viejos `age_ratings.category` y
 * `age_ratings.rating` ya NO los devuelve IGDB — se piden, responde 200 y
 * llegan vacíos, así que la clasificación no salía nunca y no había ningún
 * error que lo delatara.
 */
const PEGI_ORG = 2;

const PEGI_POR_CATEGORIA: Record<number, string> = {
  8: "3",
  9: "7",
  10: "12",
  11: "16",
  12: "18",
};

/**
 * Cuánto se sabe de verdad de la fecha.
 *
 * IGDB devuelve SIEMPRE un timestamp exacto en `first_release_date`, aunque
 * solo conozca el año: rellena con el 31 de diciembre. The Witcher IV, por
 * ejemplo, viene como 2028-12-31 y su `human` dice "2028" a secas. Pintar ese
 * timestamp como fecha exacta sería inventarse un día de salida, así que la
 * precisión se lee de `human`, que es donde está la verdad.
 */
export type ReleasePrecision = "day" | "month" | "quarter" | "year" | "tbd";

export interface IgdbGameResult {
  igdbId: number;
  title: string;
  coverUrl?: string;
  /** Timestamp de IGDB en ISO. Ojo: exacto solo si `releasePrecision` es "day". */
  releaseDate?: string;
  releasePrecision: ReleasePrecision;
  platforms: string[];
  genres: string[];
  developer?: string;
  publisher?: string;
  summary?: string;
  /** Nota media en IGDB (0-100), cuando ya hay votos. */
  rating?: number;
  pegi?: string;
}

/** `t_cover_big` es ~264x374; de sobra para tarjetas y miniaturas. */
function coverUrl(image_id?: string): string | undefined {
  return image_id
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${image_id}.jpg`
    : undefined;
}

/**
 * Lee la precisión del texto que da IGDB: "Nov 19, 2026", "Q4 2026", "2028"...
 * Es un formato fijo suyo, en inglés, y solo se usa para clasificar — la
 * fecha que se pinta se formatea en español a partir del timestamp.
 */
function precisionOf(human?: string): ReleasePrecision {
  if (!human) return "tbd";
  const t = human.trim();
  if (/^[A-Za-z]{3,} \d{1,2}, \d{4}$/.test(t)) return "day";
  if (/^Q[1-4] \d{4}$/i.test(t)) return "quarter";
  if (/^[A-Za-z]{3,} \d{4}$/.test(t)) return "month";
  if (/^\d{4}$/.test(t)) return "year";
  return "tbd";
}

function formatGame(g: IgdbGame): IgdbGameResult {
  // La entrada de `release_dates` que corresponde a la fecha principal; si no
  // cuadra ninguna, la más temprana, que es la que IGDB usa como primera.
  const fechas = g.release_dates ?? [];
  const principal =
    fechas.find((f) => f.date === g.first_release_date) ??
    [...fechas].sort((a, b) => (a.date ?? 0) - (b.date ?? 0))[0];

  const clasificacion = g.age_ratings?.find((a) => a.organization === PEGI_ORG);
  const pegi =
    clasificacion?.rating_category !== undefined
      ? PEGI_POR_CATEGORIA[clasificacion.rating_category]
      : undefined;

  return {
    igdbId: g.id,
    title: g.name,
    coverUrl: coverUrl(g.cover?.image_id),
    releaseDate: g.first_release_date
      ? new Date(g.first_release_date * 1000).toISOString()
      : undefined,
    releasePrecision: g.first_release_date ? precisionOf(principal?.human) : "tbd",
    platforms: (g.platforms ?? []).map((p) => p.abbreviation || p.name),
    genres: (g.genres ?? []).map((g) => g.name),
    developer: g.involved_companies?.find((c) => c.developer)?.company.name,
    publisher: g.involved_companies?.find((c) => c.publisher)?.company.name,
    summary: g.summary,
    pegi,
  };
}

const FIELDS =
  "fields name, cover.image_id, first_release_date, release_dates.date, release_dates.human, " +
  "platforms.abbreviation, platforms.name, genres.name, involved_companies.company.name, " +
  "involved_companies.developer, involved_companies.publisher, summary, age_ratings.organization, age_ratings.rating_category;";

/**
 * Próximos lanzamientos: fecha de salida en el futuro, ordenados por hype
 * (cuánta gente en IGDB lo sigue) para que salgan los títulos grandes
 * primero y no ruido de catálogo.
 */
export async function upcomingGames(limit = 8): Promise<IgdbGameResult[]> {
  const now = Math.floor(Date.now() / 1000);
  const games = await query<IgdbGame>(
    "games",
    `${FIELDS} where first_release_date > ${now} & cover != null & hypes != null; sort hypes desc; limit ${limit};`,
  );
  return games.map(formatGame);
}

/**
 * Búsqueda libre por título, para el buscador de "añadir juego a mano".
 * IGDB tiene su propio operador `search`, que hace fuzzy matching mejor que
 * un LIKE nuestro.
 */
export async function searchGames(title: string, limit = 12): Promise<IgdbGameResult[]> {
  const escaped = title.replace(/"/g, '\\"');
  const games = await query<IgdbGame>(
    "games",
    `${FIELDS} search "${escaped}"; where cover != null; limit ${limit};`,
    // Las búsquedas del usuario no se cachean tanto: quiere ver lo que hay
    // ahora, no lo que había hace 6 horas.
    300,
  );
  return games.map(formatGame);
}

/** Un juego concreto por su id de IGDB, para cuando ya se ha elegido en el buscador. */
export async function getGame(igdbId: number): Promise<IgdbGameResult | null> {
  const games = await query<IgdbGame>(
    "games",
    `${FIELDS} where id = ${igdbId};`,
  );
  return games[0] ? formatGame(games[0]) : null;
}

/* ------------------------------ Clasificación PEGI ----------------------------- */

/** El PEGI de un juego de IGDB, si lo trae. */
function pegiDe(g: IgdbGame): string | undefined {
  const clasificacion = g.age_ratings?.find((a) => a.organization === PEGI_ORG);
  return clasificacion?.rating_category !== undefined
    ? PEGI_POR_CATEGORIA[clasificacion.rating_category]
    : undefined;
}

const CAMPOS_PEGI =
  "fields name, alternative_names.name, age_ratings.organization, age_ratings.rating_category;";

/**
 * Los títulos de PSN no son los del catálogo.
 *
 * Vienen con marcas registradas pegadas a la palabra siguiente
 * ("EA SPORTS™UFC®4"), con el sufijo del set de trofeos ("Descenders Trophy
 * Set", "EA SPORTS FC™ 26 Trophies") y con apóstrofes tipográficos
 * ("Drake’s"). Sin limpiar todo eso, la mitad de la biblioteca no casa con
 * ningún juego de IGDB.
 */
function limpiar(title: string): string {
  return title
    // El símbolo se sustituye por espacio, no se borra: si no,
    // "EA SPORTS™UFC®4" se convierte en "EA SPORTSUFC4".
    .replace(/[™®©]/g, " ")
    .replace(/[’‘]/g, "'")
    .replace(/\s*\b(trophy set|trophy list|trophies)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Para comparar sin que estorben mayúsculas, tildes ni puntuación. */
function normalizar(title: string): string {
  return limpiar(title)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    // "DIRT5" y "Dirt 5" son el mismo juego: se separan letras de números
    // para que comparen igual.
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Variantes que se prueban de un título, de la más fiel a la más laxa.
 *
 * La edición se quita solo como ÚLTIMO recurso: "Uncharted 3 Remastered" y
 * "Uncharted 3" son fichas distintas en IGDB, y mientras la exacta exista es
 * la que hay que usar.
 */
function variantes(title: string): string[] {
  const base = limpiar(title);
  const sinEdicion = base
    .replace(
      /\s*[-–:]?\s*(deluxe|definitive|remastered|remake|goty|game of the year|complete|ultimate|gold|standard|digital|anniversary)?\s*edition\b.*$/i,
      "",
    )
    .replace(/\s*[-–:]?\s*(remastered|definitive|complete)\s*$/i, "")
    .trim();

  const formas = [base];
  if (sinEdicion && sinEdicion !== base) formas.push(sinEdicion);

  // La forma normalizada ("DIRT5" -> "dirt 5") se añade como candidata de
  // consulta, no solo de comparación: `~` no distingue mayúsculas pero sí
  // espacios, y sin esto "DIRT5" nunca encuentra "Dirt 5".
  for (const f of [...formas]) {
    const n = normalizar(f);
    if (n && !formas.some((x) => x.toLowerCase() === n)) formas.push(n);
  }

  return formas;
}

/**
 * Lanza las tareas de N en N, dejando respirar al límite de IGDB (4/s) y
 * parando si se acaba el tiempo.
 *
 * El corte por tiempo importa: esto se llama desde el cron, que en Vercel
 * muere a los 60 segundos. Sin él, una biblioteca grande se lleva la función
 * por delante y la pasada entera se pierde en vez de guardar lo que ya había
 * resuelto.
 */
async function porTandas<T>(
  items: T[],
  tam: number,
  limite: number | undefined,
  run: (item: T) => Promise<void>,
) {
  for (let i = 0; i < items.length; i += tam) {
    if (limite !== undefined && Date.now() > limite) return;
    await Promise.all(items.slice(i, i + tam).map(run));
    if (i + tam < items.length) await new Promise((r) => setTimeout(r, 1100));
  }
}

/**
 * PEGI de varios juegos, buscándolos por título.
 *
 * Dos oleadas, por cómo es la API:
 *
 * 1. `where name = (...)` acepta una lista entera en UNA consulta, pero
 *    distingue mayúsculas — y PSN escribe "HEAVY RAIN™" donde IGDB pone
 *    "Heavy Rain".
 * 2. `where name ~ "..."` no distingue mayúsculas, pero SOLO admite un
 *    título por consulta (con lista devuelve 400). Se reserva para los que
 *    no casaron en la primera, en tandas para no pasarse del límite.
 *
 * Nunca se usa el buscador difuso `search`: devuelve "Elden Ring Nightreign"
 * al pedir "Elden Ring". Para una etiqueta de edad, el juego equivocado es
 * peor que ninguna etiqueta.
 */
export async function pegiPorTitulo(
  titulos: string[],
  /** Momento (epoch ms) a partir del cual se deja de buscar y se devuelve lo que haya. */
  limite?: number,
): Promise<Map<string, string>> {
  const salida = new Map<string, string>();
  if (titulos.length === 0) return salida;

  const porTitulo = new Map(titulos.map((t) => [t, variantes(t)]));

  /* --- Oleada 1: todas las variantes de golpe, coincidencia exacta --- */

  const todas = [...new Set([...porTitulo.values()].flat())];
  const lista = todas.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(",");

  const encontrados = await query<IgdbGame>(
    "games",
    `${CAMPOS_PEGI} where name = (${lista}); limit 500;`,
  );

  // Indexado por nombre normalizado: así una diferencia de mayúsculas o de
  // puntuación entre lo que pedimos y lo que devuelve IGDB no tira el match.
  const pegiPorNombre = new Map<string, string>();
  for (const g of encontrados) {
    const pegi = pegiDe(g);
    const clave = normalizar(g.name);
    if (pegi && !pegiPorNombre.has(clave)) pegiPorNombre.set(clave, pegi);
  }

  const pendientes: string[] = [];

  for (const [original, vs] of porTitulo) {
    const pegi = vs.map((v) => pegiPorNombre.get(normalizar(v))).find(Boolean);
    if (pegi) salida.set(original, pegi);
    else pendientes.push(original);
  }

  /* --- Oleada 3: por nombre alternativo, en lote --- */

  // IGDB guarda los alias reales de cada juego ("GTA IV", "MW2"), que es como
  // los escribe PSN a veces. Va antes que la oleada de uno en uno porque
  // entra entera en una sola consulta.
  const quedan: string[] = [];

  if (pendientes.length > 0) {
    try {
      const alias = pendientes
        .flatMap((t) => porTitulo.get(t) ?? [])
        .map((t) => `"${t.replace(/"/g, '\\"')}"`)
        .join(",");

      const porAlias = await query<IgdbGame>(
        "games",
        `${CAMPOS_PEGI} where alternative_names.name = (${alias}); limit 400;`,
      );

      const pegiPorAlias = new Map<string, string>();
      for (const g of porAlias) {
        const pegi = pegiDe(g);
        if (!pegi) continue;
        for (const alt of g.alternative_names ?? []) {
          const clave = normalizar(alt.name);
          if (!pegiPorAlias.has(clave)) pegiPorAlias.set(clave, pegi);
        }
      }

      for (const original of pendientes) {
        const pegi = (porTitulo.get(original) ?? [])
          .map((v) => pegiPorAlias.get(normalizar(v)))
          .find(Boolean);
        if (pegi) salida.set(original, pegi);
        else quedan.push(original);
      }
    } catch {
      quedan.push(...pendientes);
    }
  }

  /* --- Oleada 4: los que siguen sin casar, uno a uno y sin distinguir mayúsculas --- */

  await porTandas(quedan, 4, limite, async (original) => {
    for (const variante of porTitulo.get(original) ?? []) {
      try {
        const candidatos = await query<IgdbGame>(
          "games",
          `${CAMPOS_PEGI} where name ~ "${variante.replace(/"/g, '\\"')}"; limit 5;`,
        );

        // Se comprueba el nombre aunque `~` sea exacto: si algún día se
        // comporta como "contiene", esto evita colgarle el PEGI de otro juego.
        //
        // Y entre los que coinciden se coge el primero QUE TENGA PEGI, no el
        // primero a secas: IGDB tiene fichas duplicadas que solo se
        // distinguen por mayúsculas ("Puss In Boots" y "Puss in Boots") y a
        // menudo la clasificación está solo en una de las dos.
        const pegi = candidatos
          .filter((c) => normalizar(c.name) === normalizar(variante))
          .map(pegiDe)
          .find(Boolean);

        if (pegi) {
          salida.set(original, pegi);
          return;
        }
      } catch {
        // Un título que falle no puede tumbar la tanda entera.
      }
    }
  });

  return salida;
}
