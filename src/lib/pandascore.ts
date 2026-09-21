import "server-only";

export interface EsportsMatch {
  id: string;
  game: string;
  league: string;
  team1: { name: string; logo: string; score: number };
  team2: { name: string; logo: string; score: number };
  date: string;
  status: "running" | "upcoming" | "past";
  streamUrl: string | null;
  format: string;
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

/**
 * Normaliza la respuesta bruta de PandaScore en nuestro formato EsportsMatch
 */
function normalizeMatch(match: any, status: "running" | "upcoming" | "past"): EsportsMatch | null {
  if (!match || !match.opponents || match.opponents.length !== 2) return null;
  
  const op1 = match.opponents[0].opponent;
  const op2 = match.opponents[1].opponent;
  
  if (!op1 || !op2) return null;

  // Buscar stream principal en español o inglés
  const streams = match.streams_list ?? [];
  const streamUrl = streams.find((s: any) => s.language === "es")?.raw_url 
                 || streams.find((s: any) => s.main)?.raw_url 
                 || streams[0]?.raw_url 
                 || null;

  const results = match.results ?? [];
  const score1 = results.find((r: any) => r.team_id === op1.id)?.score ?? 0;
  const score2 = results.find((r: any) => r.team_id === op2.id)?.score ?? 0;

  let gameName = match.videogame?.name ?? "Unknown";
  if (gameName === "LoL") gameName = "LoL"; // PandaScore ya devuelve "LoL" u otros nombres, pero aseguramos limpieza
  if (gameName.includes("Valorant")) gameName = "VALORANT";
  if (gameName.includes("CS:GO") || gameName.includes("Counter-Strike")) gameName = "CS2";
  if (gameName.includes("Mobile Legends")) gameName = "Mobile Legends";
  if (gameName.includes("Rainbow")) gameName = "R6 Siege";
  if (gameName.includes("King of Glory")) gameName = "Honor of Kings";

  return {
    id: String(match.id),
    game: gameName,
    league: match.league?.name ?? "Torneo",
    team1: {
      name: op1.name ?? "TBD",
      logo: op1.image_url ?? "",
      score: score1,
    },
    team2: {
      name: op2.name ?? "TBD",
      logo: op2.image_url ?? "",
      score: score2,
    },
    date: match.begin_at ?? new Date().toISOString(),
    status,
    streamUrl,
    format: `BO${match.number_of_games ?? 1}`,
  };
}

async function fetchFromPandaScore(endpoint: string, status: "running" | "upcoming" | "past", perPage = 10, cacheTime = 60): Promise<EsportsMatch[]> {
  if (!API_KEY) {
    console.warn(`[PandaScore] API Key no configurada. Devolviendo datos mock para '${endpoint}'.`);
    return FALLBACK_MOCK_MATCHES.filter(m => m.status === status);
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}?per_page=${perPage}&sort=${status === "past" ? "-begin_at" : "begin_at"}`, {
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
      .map(item => normalizeMatch(item, status))
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
