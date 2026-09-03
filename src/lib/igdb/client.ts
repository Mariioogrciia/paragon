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
  platforms?: { abbreviation?: string; name: string }[];
  genres?: { name: string }[];
  involved_companies?: { company: { name: string }; developer: boolean; publisher: boolean }[];
  summary?: string;
  total_rating?: number;
}

export interface IgdbGameResult {
  igdbId: number;
  title: string;
  coverUrl?: string;
  releaseDate?: string;
  platforms: string[];
  genres: string[];
  developer?: string;
  publisher?: string;
  summary?: string;
}

/** `t_cover_big` es ~264x374; de sobra para tarjetas y miniaturas. */
function coverUrl(image_id?: string): string | undefined {
  return image_id
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${image_id}.jpg`
    : undefined;
}

function formatGame(g: IgdbGame): IgdbGameResult {
  return {
    igdbId: g.id,
    title: g.name,
    coverUrl: coverUrl(g.cover?.image_id),
    releaseDate: g.first_release_date
      ? new Date(g.first_release_date * 1000).toISOString()
      : undefined,
    platforms: (g.platforms ?? []).map((p) => p.abbreviation || p.name),
    genres: (g.genres ?? []).map((g) => g.name),
    developer: g.involved_companies?.find((c) => c.developer)?.company.name,
    publisher: g.involved_companies?.find((c) => c.publisher)?.company.name,
    summary: g.summary,
  };
}

const FIELDS =
  "fields name, cover.image_id, first_release_date, platforms.abbreviation, platforms.name, " +
  "genres.name, involved_companies.company.name, involved_companies.developer, " +
  "involved_companies.publisher, summary, total_rating;";

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
