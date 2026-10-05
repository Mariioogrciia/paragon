import "server-only";

export interface EsportsTeam {
  /** Id de PandaScore; falta en los partidos de ejemplo. */
  id?: number;
  name: string;
  acronym?: string | null;
  logo: string;
  score: number;
}

export interface EsportsMatch {
  id: string;
  game: string;
  league: string;
  team1: EsportsTeam;
  team2: EsportsTeam;
  date: string;
  status: "running" | "upcoming" | "past";
  streamUrl: string | null;
  format: string;
  /** Torneo (fase) de PandaScore, para agrupar y pedir su clasificación. */
  tournamentId?: number | null;
  tournament?: string | null;
  /** Nivel del torneo: s, a, b, c, d (o null si no lo tiene). */
  tier?: string | null;
}

const FALLBACK_MOCK_MATCHES: EsportsMatch[] = [
  {
    id: "mock-live-1",
    game: "VALORANT",
    league: "VCT EMEA",
    team1: { name: "KOI", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/52/KOI_logo.svg/200px-KOI_logo.svg.png", score: 1 },
    team2: { name: "FNATIC", logo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/43/Fnatic_logo.svg/200px-Fnatic_logo.svg.png", score: 1 },
    date: new Date().toISOString(),
    status: "running",
    streamUrl: "https://www.twitch.tv/valorant_emea",
    format: "BO3",
  },
  {
    id: "mock-up-1",
    game: "LoL",
    league: "LVP Superliga",
    team1: { name: "Heretics", logo: "", score: 0 },
    team2: { name: "Giants", logo: "", score: 0 },
    date: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    status: "upcoming",
    streamUrl: null,
    format: "BO1",
  },
  {
    id: "mock-up-2",
    game: "CS:GO",
    league: "BLAST Premier",
    team1: { name: "NAVI", logo: "", score: 0 },
    team2: { name: "Vitality", logo: "", score: 0 },
    date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    status: "upcoming",
    streamUrl: null,
    format: "BO3",
  },
  {
    id: "mock-past-1",
    game: "LoL",
    league: "LEC",
    team1: { name: "BDS", logo: "", score: 2 },
    team2: { name: "Karmine Corp", logo: "", score: 0 },
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: "past",
    streamUrl: null,
    format: "BO3",
  },
  {
    id: "mock-past-2",
    game: "VALORANT",
    league: "VCT Americas",
    team1: { name: "Sentinels", logo: "", score: 2 },
    team2: { name: "LOUD", logo: "", score: 1 },
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    status: "past",
    streamUrl: null,
    format: "BO3",
  },
];

const API_KEY = process.env.PANDASCORE_API_KEY;
const BASE_URL = "https://api.pandascore.co";

/** Lo que se lee de un partido en bruto de PandaScore — todo opcional, es JSON ajeno. */
interface PandaScoreOpponent {
  id?: number;
  name?: string;
  image_url?: string | null;
}

interface PandaScoreMatch {
  id?: number | string;
  opponents?: { opponent?: PandaScoreOpponent | null }[];
  streams_list?: { language?: string; main?: boolean; raw_url?: string }[];
  results?: { team_id?: number; score?: number }[];
  videogame?: { name?: string };
  league?: { name?: string };
  begin_at?: string | null;
  number_of_games?: number;
  tournament_id?: number;
  tournament?: { name?: string; tier?: string | null };
}

/** Nombre corto y estable del juego (PandaScore cambia la forma según el título). */
function nombreJuego(nombre: string | undefined): string {
  const n = nombre ?? "Unknown";
  if (n.includes("Valorant")) return "VALORANT";
  if (n.includes("CS:GO") || n.includes("Counter-Strike")) return "CS2";
  if (n.includes("Mobile Legends")) return "Mobile Legends";
  if (n.includes("Rainbow")) return "R6 Siege";
  if (n.includes("King of Glory")) return "Honor of Kings";
  return n;
}

/**
 * Normaliza la respuesta bruta de PandaScore en nuestro formato EsportsMatch
 */
function normalizeMatch(match: PandaScoreMatch | null, status: "running" | "upcoming" | "past"): EsportsMatch | null {
  if (!match || !match.opponents || match.opponents.length !== 2) return null;
  
  const op1 = match.opponents[0].opponent;
  const op2 = match.opponents[1].opponent;
  
  if (!op1 || !op2) return null;

  // Buscar stream principal en español o inglés
  const streams = match.streams_list ?? [];
  const streamUrl = streams.find((s) => s.language === "es")?.raw_url 
                 || streams.find((s) => s.main)?.raw_url 
                 || streams[0]?.raw_url 
                 || null;

  const results = match.results ?? [];
  const score1 = results.find((r) => r.team_id === op1.id)?.score ?? 0;
  const score2 = results.find((r) => r.team_id === op2.id)?.score ?? 0;

  return {
    id: String(match.id),
    game: nombreJuego(match.videogame?.name),
    league: match.league?.name ?? "Torneo",
    team1: {
      id: op1.id,
      acronym: (op1 as { acronym?: string | null }).acronym ?? null,
      name: op1.name ?? "TBD",
      logo: op1.image_url ?? "",
      score: score1,
    },
    team2: {
      id: op2.id,
      acronym: (op2 as { acronym?: string | null }).acronym ?? null,
      name: op2.name ?? "TBD",
      logo: op2.image_url ?? "",
      score: score2,
    },
    date: match.begin_at ?? new Date().toISOString(),
    status,
    streamUrl,
    format: `BO${match.number_of_games ?? 1}`,
    tournamentId: match.tournament_id ?? null,
    tournament: match.tournament?.name ?? null,
    tier: match.tournament?.tier ?? null,
  };
}

async function fetchFromPandaScore(endpoint: string, status: "running" | "upcoming" | "past", perPage = 10, cacheTime = 60): Promise<EsportsMatch[]> {
  if (!API_KEY) {
    console.warn(`[PandaScore] API Key no configurada. Devolviendo datos mock para '${endpoint}'.`);
    return FALLBACK_MOCK_MATCHES.filter(m => m.status === status);
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}?per_page=${perPage}&sort=${status === "past" ? "-begin_at" : "begin_at"}`, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Accept": "application/json"
      },
      next: { revalidate: cacheTime },
    });

    if (!res.ok) {
      console.error(`[PandaScore] Error HTTP ${res.status} al pedir ${endpoint}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .map((item: PandaScoreMatch) => normalizeMatch(item, status))
      .filter((m): m is EsportsMatch => m !== null);

  } catch (error) {
    console.error(`[PandaScore] Fallo de red al pedir ${endpoint}:`, error);
    return [];
  }
}

export async function getLiveMatches(): Promise<EsportsMatch[]> {
  // Los directos se cachean muy poco tiempo (1 minuto) para que estén actualizados
  return fetchFromPandaScore("/matches/running", "running", 15, 60);
}

export async function getUpcomingMatches(): Promise<EsportsMatch[]> {
  // Pedimos 50 en lugar de 15 para que entren otros juegos como Rocket League, R6, etc.
  return fetchFromPandaScore("/matches/upcoming", "upcoming", 50, 3600);
}

export async function getPastMatches(): Promise<EsportsMatch[]> {
  return fetchFromPandaScore("/matches/past", "past", 30, 3600);
}

export async function getAllPandaScoreMatches(): Promise<{ live: EsportsMatch[], upcoming: EsportsMatch[], past: EsportsMatch[] }> {
  // Promise.all aquí sí está bien porque son solo 3 peticiones controladas a nuestra API (PandaScore)
  const [live, upcoming, past] = await Promise.all([
    getLiveMatches(),
    getUpcomingMatches(),
    getPastMatches()
  ]);

  return { live, upcoming, past };
}

/* ------------------------------------------------------------------ *
 * Detalle de un partido (/esports/partido/[id])                      *
 *                                                                    *
 * Todo lo que da el plan actual de PandaScore: mapa a mapa,           *
 * plantillas, todos los streams, torneo y su clasificación. Sin       *
 * estadísticas por jugador (`detailed_stats` no entra en el plan).    *
 * Cuatro peticiones por ficha, cacheadas: el límite es por hora.      *
 * ------------------------------------------------------------------ */

export interface EsportsPlayer {
  id: number;
  nick: string;
  nombre: string | null;
  nacionalidad: string | null;
  edad: number | null;
  rol: string | null;
  foto: string;
}

export interface EsportsTeamDetail {
  id: number;
  name: string;
  acronym: string | null;
  logo: string;
  location: string | null;
  score: number;
  players: EsportsPlayer[];
}

export interface EsportsGame {
  position: number;
  /** not_started | running | finished (y raros: not_played) */
  status: string;
  winnerId: number | null;
  /** Segundos. */
  length: number | null;
  forfeit: boolean;
}

export type PlataformaStream = "twitch" | "youtube" | "kick" | "otra";

export interface EsportsStream {
  url: string;
  embedUrl: string | null;
  language: string | null;
  official: boolean;
  main: boolean;
  plataforma: PlataformaStream;
}

export interface EsportsStanding {
  rank: number;
  teamId: number;
  name: string;
  logo: string;
  wins: number;
  losses: number;
  gameWins: number;
  gameLosses: number;
}

export interface EsportsMatchDetail {
  id: string;
  game: string;
  /** running | upcoming | past, como en la lista. */
  status: EsportsMatch["status"];
  /** Estado tal cual: también canceled / postponed. */
  statusRaw: string;
  league: string;
  leagueUrl: string | null;
  serie: string | null;
  tournament: string | null;
  tier: string | null;
  region: string | null;
  /** online | offline */
  modalidad: string | null;
  pais: string | null;
  numberOfGames: number;
  scheduledAt: string | null;
  originalScheduledAt: string | null;
  rescheduled: boolean;
  beginAt: string | null;
  endAt: string | null;
  winnerId: number | null;
  forfeit: boolean;
  draw: boolean;
  teams: [EsportsTeamDetail, EsportsTeamDetail];
  games: EsportsGame[];
  streams: EsportsStream[];
  standings: EsportsStanding[];
  /** Otros partidos del mismo torneo (fase), sin este. */
  otros: EsportsMatch[];
}

interface PsPlayer {
  id?: number;
  name?: string;
  first_name?: string | null;
  last_name?: string | null;
  nationality?: string | null;
  age?: number | null;
  role?: string | null;
  image_url?: string | null;
  active?: boolean;
}

interface PsTeam extends PandaScoreOpponent {
  acronym?: string | null;
  location?: string | null;
  players?: PsPlayer[];
}

interface PsMatchFull extends Omit<PandaScoreMatch, "opponents" | "streams_list" | "league"> {
  status?: string;
  scheduled_at?: string | null;
  original_scheduled_at?: string | null;
  rescheduled?: boolean;
  end_at?: string | null;
  winner_id?: number | null;
  forfeit?: boolean;
  draw?: boolean;
  tournament_id?: number;
  opponents?: { opponent?: PsTeam | null }[];
  league?: { name?: string; url?: string | null };
  serie?: { full_name?: string | null };
  tournament?: { name?: string; tier?: string | null; region?: string | null; type?: string | null; country?: string | null };
  games?: { position?: number; status?: string; length?: number | null; forfeit?: boolean; winner?: { id?: number | null } | null }[];
  streams_list?: { language?: string; main?: boolean; official?: boolean; raw_url?: string; embed_url?: string | null }[];
}

interface PsStanding {
  rank?: number;
  wins?: number;
  losses?: number;
  game_wins?: number;
  game_losses?: number;
  team?: PsTeam;
}

function normalizarStandings(lista: PsStanding[] | null): EsportsStanding[] {
  return (lista ?? []).flatMap((s) =>
    s.team?.id != null
      ? [{
          rank: s.rank ?? 0,
          teamId: s.team.id,
          name: s.team.name ?? "?",
          logo: s.team.image_url ?? "",
          wins: s.wins ?? 0,
          losses: s.losses ?? 0,
          gameWins: s.game_wins ?? 0,
          gameLosses: s.game_losses ?? 0,
        }]
      : [],
  );
}

async function pedir<T>(ruta: string, revalidate: number): Promise<T | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(`${BASE_URL}${ruta}`, {
      signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${API_KEY}`, Accept: "application/json" },
      next: { revalidate },
    });
    if (!res.ok) {
      if (res.status !== 404) console.error(`[PandaScore] Error HTTP ${res.status} al pedir ${ruta}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error(`[PandaScore] Fallo de red al pedir ${ruta}:`, error);
    return null;
  }
}

function plataformaDe(url: string): PlataformaStream {
  if (/twitch\.tv/i.test(url)) return "twitch";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/kick\.com/i.test(url)) return "kick";
  return "otra";
}

function estadoLista(status: string | undefined): EsportsMatch["status"] {
  if (status === "running") return "running";
  if (status === "finished") return "past";
  return "upcoming";
}

export async function getPandaScoreMatchDetail(id: string): Promise<EsportsMatchDetail | null> {
  // Los ids de PandaScore son numéricos; los de ejemplo ("mock-…") no tienen ficha.
  if (!/^\d+$/.test(id)) return null;

  const match = await pedir<PsMatchFull>(`/matches/${id}`, 60);
  if (!match || !match.opponents || match.opponents.length !== 2) return null;
  const enJuego = match.status === "running";
  const torneo = match.tournament_id;

  const [conPlantillas, standings, delTorneo] = await Promise.all([
    pedir<{ opponents?: PsTeam[] }>(`/matches/${id}/opponents`, 21_600),
    torneo ? pedir<PsStanding[]>(`/tournaments/${torneo}/standings`, enJuego ? 120 : 600) : Promise.resolve(null),
    torneo ? pedir<PsMatchFull[]>(`/tournaments/${torneo}/matches?per_page=50&sort=begin_at`, enJuego ? 120 : 600) : Promise.resolve(null),
  ]);

  const plantillas = new Map((conPlantillas?.opponents ?? []).map((t) => [t.id, t.players ?? []]));
  const resultados = match.results ?? [];

  const equipo = (op: PsTeam | null | undefined): EsportsTeamDetail | null => {
    if (!op || op.id == null) return null;
    return {
      id: op.id,
      name: op.name ?? "TBD",
      acronym: op.acronym ?? null,
      logo: op.image_url ?? "",
      location: op.location ?? null,
      score: resultados.find((r) => r.team_id === op.id)?.score ?? 0,
      players: (plantillas.get(op.id) ?? [])
        .filter((p) => p.active !== false && p.id != null)
        .map((p) => ({
          id: p.id!,
          nick: p.name ?? "?",
          nombre: [p.first_name, p.last_name].map((s) => s?.trim()).filter(Boolean).join(" ") || null,
          nacionalidad: p.nationality ?? null,
          edad: p.age ?? null,
          rol: p.role ?? null,
          foto: p.image_url ?? "",
        })),
    };
  };
  const t1 = equipo(match.opponents[0].opponent);
  const t2 = equipo(match.opponents[1].opponent);
  if (!t1 || !t2) return null;

  // Principal primero, luego oficiales; el resto en el orden de PandaScore.
  const streams: EsportsStream[] = (match.streams_list ?? [])
    .flatMap((s) =>
      s.raw_url
        ? [{
            url: s.raw_url,
            embedUrl: s.embed_url ?? null,
            language: s.language ?? null,
            official: !!s.official,
            main: !!s.main,
            plataforma: plataformaDe(s.raw_url),
          }]
        : [],
    )
    .sort((a, b) => Number(b.main) - Number(a.main) || Number(b.official) - Number(a.official));

  return {
    id: String(match.id),
    game: nombreJuego(match.videogame?.name),
    status: estadoLista(match.status),
    statusRaw: match.status ?? "not_started",
    league: match.league?.name ?? "Torneo",
    leagueUrl: match.league?.url ?? null,
    serie: match.serie?.full_name?.trim() || null,
    tournament: match.tournament?.name ?? null,
    tier: match.tournament?.tier ?? null,
    region: match.tournament?.region ?? null,
    modalidad: match.tournament?.type ?? null,
    pais: match.tournament?.country ?? null,
    numberOfGames: match.number_of_games ?? 1,
    scheduledAt: match.scheduled_at ?? null,
    originalScheduledAt: match.original_scheduled_at ?? null,
    rescheduled: !!match.rescheduled,
    beginAt: match.begin_at ?? null,
    endAt: match.end_at ?? null,
    winnerId: match.winner_id ?? null,
    forfeit: !!match.forfeit,
    draw: !!match.draw,
    teams: [t1, t2],
    games: (match.games ?? [])
      .map((g) => ({
        position: g.position ?? 0,
        status: g.status ?? "not_started",
        winnerId: g.winner?.id ?? null,
        length: g.length ?? null,
        forfeit: !!g.forfeit,
      }))
      .sort((a, b) => a.position - b.position),
    streams,
    standings: normalizarStandings(standings),
    otros: (delTorneo ?? [])
      .filter((m) => String(m.id) !== String(match.id))
      .map((m) => normalizeMatch(m as PandaScoreMatch, estadoLista(m.status)))
      .filter((m): m is EsportsMatch => m !== null),
  };
}

/**
 * Clasificación de varios torneos a la vez, para las tablas de la lista
 * por competición. Solo los que se piden (la lista elige los de más
 * nivel); un torneo sin tabla (eliminatorias) vuelve vacío.
 */
export async function getStandingsDeTorneos(ids: number[]): Promise<Record<number, EsportsStanding[]>> {
  // De dos en dos: ocho a la vez y PandaScore responde 429 (límite por ráfaga).
  const unicos = Array.from(new Set(ids)).slice(0, 6);
  const tablas: Record<number, EsportsStanding[]> = {};
  for (let i = 0; i < unicos.length; i += 2) {
    const tanda = unicos.slice(i, i + 2);
    const listas = await Promise.all(tanda.map((id) => pedir<PsStanding[]>(`/tournaments/${id}/standings`, 900)));
    tanda.forEach((id, j) => (tablas[id] = normalizarStandings(listas[j])));
  }
  return tablas;
}
