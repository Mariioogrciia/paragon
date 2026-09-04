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

/**
 * Etiqueta de fecha en español, contando solo lo que IGDB sabe de verdad.
 *
 * Un juego anunciado "para 2028" llega con timestamp del 31 de diciembre de
 * relleno (ver `precisionOf` más abajo). Pintarlo como "31 dic 2028" sería
 * inventarse el día, así que cada precisión tiene su propio formato.
 */
export function releaseLabelEs(iso: string | undefined, precision: ReleasePrecision): string {
  if (!iso || precision === "tbd") return "Fecha por confirmar";

  const fecha = new Date(iso);

  switch (precision) {
    case "day":
      return fecha.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    case "month":
      return fecha.toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
    case "quarter": {
      const trimestre = Math.floor(fecha.getUTCMonth() / 3) + 1;
      return `${trimestre}.º trimestre de ${fecha.getUTCFullYear()}`;
    }
    case "year":
      return `Durante ${fecha.getUTCFullYear()}`;
  }
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
 * Filtro `platforms.abbreviation = (...)` de APIcalypse, para las páginas de
 * plataforma en /descubrir/[plataforma]. "PC" es el proxy más cercano que
 * tiene IGDB a "Steam" — también incluye Epic/GOG/venta directa, pero no hay
 * un identificador de tienda más fino en su catálogo. Se documenta en la
 * propia pantalla, no se oculta la imprecisión.
 */
const ABREVIATURAS_PLATAFORMA: Record<"playstation" | "steam", string[]> = {
  playstation: ["PS4", "PS5"],
  steam: ["PC"],
};

function filtroPlataforma(plataforma?: keyof typeof ABREVIATURAS_PLATAFORMA): string {
  if (!plataforma) return "";
  const lista = ABREVIATURAS_PLATAFORMA[plataforma].map((a) => `"${a}"`).join(",");
  return ` & platforms.abbreviation = (${lista})`;
}

/**
 * Próximos lanzamientos: fecha de salida en el futuro, ordenados por hype
 * (cuánta gente en IGDB lo sigue) para que salgan los títulos grandes
 * primero y no ruido de catálogo.
 */
export async function upcomingGames(limit = 8, plataforma?: keyof typeof ABREVIATURAS_PLATAFORMA): Promise<IgdbGameResult[]> {
  const now = Math.floor(Date.now() / 1000);
  const games = await query<IgdbGame>(
    "games",
    `${FIELDS} where first_release_date > ${now} & cover != null & hypes != null${filtroPlataforma(plataforma)}; sort hypes desc; limit ${limit};`,
  );
  return games.map(formatGame);
}

/**
 * Lo contrario de `upcomingGames`: lanzamientos ya salidos, los más
 * recientes primero. Para "Últimos lanzamientos" en la página de cada
 * plataforma — se exige `hypes != null` por el mismo motivo que arriba, para
 * no llenar la fila de ruido de catálogo sin seguimiento.
 */
export async function recentReleases(limit = 12, plataforma?: keyof typeof ABREVIATURAS_PLATAFORMA): Promise<IgdbGameResult[]> {
  const now = Math.floor(Date.now() / 1000);
  const games = await query<IgdbGame>(
    "games",
    `${FIELDS} where first_release_date <= ${now} & cover != null & hypes != null${filtroPlataforma(plataforma)}; sort first_release_date desc; limit ${limit};`,
  );
  return games.map(formatGame);
}

/**
 * Cabecera de Descubrir: solo lanzamientos YA SALIDOS (no próximos —
 * anunciar como destacado un juego que todavía no existe se queda raro en
 * la pieza más grande de la página) y con un filtro de calidad algo más
 * exigente que el resto (`hypes > 8`, no solo `!= null`): con 1-2 follows en
 * IGDB cualquier cosa "tiene hype" técnicamente, y aquí sale una sola pieza
 * enorme — no vale cualquier juego.
 *
 * `revalidate` explícito a un día: es contenido "destacado de hoy", no hace
 * falta refrescarlo cada 6h como el resto del catálogo, pero tampoco debe
 * quedarse la misma semana entera si sale algo nuevo con tirón.
 */
export async function destacadosRecientes(limit = 6): Promise<IgdbGameResult[]> {
  const now = Math.floor(Date.now() / 1000);

  async function buscar(diasAtras: number, minHype: number) {
    const desde = now - diasAtras * 86_400;
    const games = await query<IgdbGame>(
      "games",
      `${FIELDS} where first_release_date > ${desde} & first_release_date <= ${now} & cover != null & hypes > ${minHype}; sort first_release_date desc; limit ${limit};`,
      86_400,
    );
    return games.map(formatGame);
  }

  // 30 días con exigencia real primero; si el catálogo no da para tanto
  // (ventana corta, pocos lanzamientos seguidos en IGDB esa quincena), se
  // abre a 90 días bajando el listón antes que dejar la cabecera vacía.
  const primeros = await buscar(30, 8);
  if (primeros.length > 0) return primeros;
  return buscar(90, 3);
}

/**
 * "Novedades": lo que se está hablando AHORA, no solo lo que aún no ha
 * salido. `upcomingGames` se queda corto para eso — un juego que salió hace
 * dos semanas y todo el mundo comenta (el caso real que lo hizo evidente:
 * "The Blood of Dawnwalker") desaparecía del todo porque ya tiene
 * `first_release_date` en el pasado. Aquí la ventana es "salido hace poco O
 * está por salir" (día de hoy ± `diasAtras`/lejos en el futuro no hay
 * límite), y dentro de esa ventana manda el hype, no la fecha — así lo
 * reciente-y-popular compite con lo próximo-y-esperado en la misma lista.
 */
export async function novedades(
  limit = 10,
  plataforma?: keyof typeof ABREVIATURAS_PLATAFORMA,
  diasAtras = 45,
): Promise<IgdbGameResult[]> {
  const desde = Math.floor(Date.now() / 1000) - diasAtras * 86_400;
  const games = await query<IgdbGame>(
    "games",
    `${FIELDS} where first_release_date > ${desde} & cover != null & hypes != null${filtroPlataforma(plataforma)}; sort hypes desc; limit ${limit};`,
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

/* --------------------------- Ficha ampliada (/juego/[id]) --------------------------- */

/**
 * Categorías de `websites` documentadas por IGDB — solo las que tiene
 * sentido enseñar como enlace con su propio icono/etiqueta. El resto (wikia,
 * facebook, apps de tienda móvil...) cae en el genérico "Sitio web".
 *
 * Los números son los ids de la tabla de referencia `website_types` de
 * IGDB — comprobados a mano contra `POST /v4/website_types` el 4 de
 * septiembre de 2026. El campo que los trae en `games.websites` se llamaba
 * `category`; IGDB lo renombró a `type` en algún momento sin que el
 * proyecto se enterara (`fields websites.category` sigue devolviendo 200
 * pero **sin ese campo**, silencioso — ver DETAIL_FIELDS más abajo). Los
 * IDs en sí no cambiaron, solo el nombre del campo que los trae.
 */
const WEBSITE_LABELS: Record<number, string> = {
  1: "Sitio oficial",
  3: "Wikipedia",
  5: "Twitter / X",
  6: "Twitch",
  9: "YouTube",
  13: "Steam",
  14: "Reddit",
  15: "itch.io",
  16: "Epic Games Store",
  17: "GOG",
  18: "Discord",
  22: "Xbox",
  23: "PlayStation",
  24: "Nintendo",
};

interface IgdbGameDetail extends IgdbGame {
  total_rating?: number;
  total_rating_count?: number;
  storyline?: string;
  screenshots?: { image_id: string }[];
  themes?: { name: string }[];
  game_modes?: { name: string }[];
  websites?: { type: number; url: string }[];
  similar_games?: { id: number; name: string; cover?: { image_id: string } }[];
  artworks?: { image_id: string }[];
  videos?: { video_id: string; name: string }[];
  dlcs?: { name: string; cover?: { image_id: string }; first_release_date?: number }[];
  expansions?: { name: string; cover?: { image_id: string }; first_release_date?: number }[];
  franchises?: { name: string }[];
  collection?: { name: string };
  language_supports?: { language?: { native_name: string }; language_support_type?: { name: string } }[];
}

export interface IgdbGameDetailResult extends IgdbGameResult {
  totalRating?: number;
  totalRatingCount?: number;
  storyline?: string;
  screenshots: string[];
  themes: string[];
  gameModes: string[];
  websites: { label: string; url: string }[];
  similarGames: { igdbId: number; title: string; coverUrl?: string }[];
  artworkUrl?: string;
  videos: { videoId: string; name: string }[];
  dlcs: { name: string; coverUrl?: string; releaseDate?: string }[];
  franchises: string[];
  languages: { language: string; support: string[] }[];
}

const DETAIL_FIELDS =
  "fields name, cover.image_id, first_release_date, release_dates.date, release_dates.human, " +
  "total_rating, total_rating_count, " +
  "platforms.abbreviation, platforms.name, genres.name, involved_companies.company.name, " +
  "involved_companies.developer, involved_companies.publisher, summary, storyline, " +
  "age_ratings.organization, age_ratings.rating_category, screenshots.image_id, " +
  "themes.name, game_modes.name, websites.type, websites.url, artworks.image_id, " +
  "videos.video_id, videos.name, dlcs.name, dlcs.cover.image_id, dlcs.first_release_date, " +
  "expansions.name, expansions.cover.image_id, expansions.first_release_date, " +
  "franchises.name, collection.name, language_supports.language.native_name, language_supports.language_support_type.name, " +
  "similar_games.name, similar_games.cover.image_id;";

/** `t_screenshot_big` es ~889x500 — de sobra para una tira de capturas. */
function screenshotUrl(image_id: string): string {
  return `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${image_id}.jpg`;
}

/**
 * Ficha ampliada de un juego para `/juego/[id]`: lo que ya daba `formatGame`
 * más capturas, historia, temas, modos de juego y enlaces oficiales. Aparte
 * de `getGame()` (y no una extensión de sus `FIELDS`) porque esos campos
 * extra no los necesita nadie más — el buscador de "añadir a mano" o
 * "próximos lanzamientos" no pintan una tira de capturas.
 */
export async function getGameDetails(igdbId: number): Promise<IgdbGameDetailResult | null> {
  const games = await query<IgdbGameDetail>(
    "games",
    `${DETAIL_FIELDS} where id = ${igdbId};`,
  );
  const g = games[0];
  if (!g) return null;

  const base = formatGame(g);

  // Parse languages
  const langMap = new Map<string, Set<string>>();
  for (const ls of g.language_supports ?? []) {
    const langName = ls.language?.native_name;
    const supportName = ls.language_support_type?.name;
    if (langName && supportName) {
      if (!langMap.has(langName)) langMap.set(langName, new Set());
      langMap.get(langName)!.add(supportName);
    }
  }

  const languages = Array.from(langMap.entries())
    .map(([lang, supports]) => ({ language: lang, support: Array.from(supports) }))
    .sort((a, b) => a.language.localeCompare(b.language));

  // Combine DLCs and Expansions
  const rawDlcs = [...(g.dlcs ?? []), ...(g.expansions ?? [])];
  const dlcs = rawDlcs.map((d) => ({
    name: d.name,
    coverUrl: coverUrl(d.cover?.image_id),
    releaseDate: d.first_release_date ? new Date(d.first_release_date * 1000).toISOString() : undefined,
  })).sort((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""));

  // Combine franchises and collection
  const franchises = [
    ...(g.collection?.name ? [g.collection.name] : []),
    ...(g.franchises ?? []).map((f) => f.name),
  ];

  return {
    ...base,
    totalRating: g.total_rating,
    totalRatingCount: g.total_rating_count,
    storyline: g.storyline,
    screenshots: (g.screenshots ?? []).map((s) => screenshotUrl(s.image_id)),
    themes: (g.themes ?? []).map((t) => t.name),
    gameModes: (g.game_modes ?? []).map((m) => m.name),
    websites: (g.websites ?? [])
      .filter((w) => WEBSITE_LABELS[w.type])
      .map((w) => ({ label: WEBSITE_LABELS[w.type], url: w.url })),
    similarGames: (g.similar_games ?? []).slice(0, 12).map((s) => ({
      igdbId: s.id,
      title: s.name,
      coverUrl: coverUrl(s.cover?.image_id),
    })),
    artworkUrl: g.artworks?.[0] ? `https://images.igdb.com/igdb/image/upload/t_1080p/${g.artworks[0].image_id}.jpg` : undefined,
    videos: (g.videos ?? []).map((v) => ({ videoId: v.video_id, name: v.name })),
    dlcs,
    franchises: [...new Set(franchises)],
    languages,
  };
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

/**
 * Encuentra el juego completo en IGDB por su título, usando las mismas 4
 * oleadas de búsqueda que `pegiPorTitulo`. Devuelve un mapa de Título -> IgdbGameResult.
 */
export async function matchIgdbGames(
  titulos: string[],
  limite?: number,
): Promise<Map<string, IgdbGameResult>> {
  const salida = new Map<string, IgdbGameResult>();
  if (titulos.length === 0) return salida;

  const porTitulo = new Map(titulos.map((t) => [t, variantes(t)]));

  /* --- Oleada 1: coincidencia exacta --- */
  const todas = [...new Set([...porTitulo.values()].flat())];
  const lista = todas.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(",");

  const encontrados = await query<IgdbGame>(
    "games",
    `${FIELDS} where name = (${lista}); limit 500;`,
  );

  const gamePorNombre = new Map<string, IgdbGameResult>();
  for (const g of encontrados) {
    const format = formatGame(g);
    const clave = normalizar(g.name);
    // Prefer the first one found or one with cover/pegi
    if (!gamePorNombre.has(clave)) gamePorNombre.set(clave, format);
  }

  const pendientes: string[] = [];
  for (const [original, vs] of porTitulo) {
    const match = vs.map((v) => gamePorNombre.get(normalizar(v))).find(Boolean);
    if (match) salida.set(original, match);
    else pendientes.push(original);
  }

  /* --- Oleada 2 (o 3 en el original): por alias --- */
  const quedan: string[] = [];
  if (pendientes.length > 0) {
    try {
      const alias = pendientes
        .flatMap((t) => porTitulo.get(t) ?? [])
        .map((t) => `"${t.replace(/"/g, '\\"')}"`)
        .join(",");

      const porAlias = await query<IgdbGame>(
        "games",
        `${FIELDS} where alternative_names.name = (${alias}); limit 400;`,
      );

      const gamePorAlias = new Map<string, IgdbGameResult>();
      for (const g of porAlias) {
        const format = formatGame(g);
        for (const alt of g.alternative_names ?? []) {
          const clave = normalizar(alt.name);
          if (!gamePorAlias.has(clave)) gamePorAlias.set(clave, format);
        }
      }

      for (const original of pendientes) {
        const match = (porTitulo.get(original) ?? [])
          .map((v) => gamePorAlias.get(normalizar(v)))
          .find(Boolean);
        if (match) salida.set(original, match);
        else quedan.push(original);
      }
    } catch {
      quedan.push(...pendientes);
    }
  }

  /* --- Oleada 3 (o 4): uno a uno --- */
  await porTandas(quedan, 4, limite, async (original) => {
    for (const variante of porTitulo.get(original) ?? []) {
      try {
        const candidatos = await query<IgdbGame>(
          "games",
          `${FIELDS} where name ~ "${variante.replace(/"/g, '\\"')}"; limit 5;`,
        );

        const match = candidatos
          .filter((c) => normalizar(c.name) === normalizar(variante))
          .map(formatGame)
          .find(Boolean);

        if (match) {
          salida.set(original, match);
          return;
        }
      } catch {
        // Ignorar
      }
    }
  });

  return salida;
}
