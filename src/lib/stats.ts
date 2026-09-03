import {
  emptyCounts,
  type Game,
  type Library,
  type Platform,
  type Trophy,
  type TrophyCounts,
} from "@/lib/types";

export type GameStatus = "platinado" | "completado" | "en-curso" | "sin-empezar" | "deseados";

export interface GameProgress {
  earned: number;
  total: number;
  percent: number;
  status: GameStatus;
  hasPlatinum: boolean;
  platinumEarned: boolean;
}

/**
 * Progreso de un juego, en el lenguaje común a todas las plataformas.
 *
 * "Platinado" solo existe donde hay platino (PSN). En Steam el equivalente de
 * terminar un juego es el 100%, y por eso cae en "completado": no es que le
 * falte algo, es que esa plataforma no tiene metales.
 */
export function gameProgress(game: Game): GameProgress {
  const earned = game.earnedTotal;
  const total = game.definedTotal;
  const hasPlatinum = (game.defined?.platinum ?? 0) > 0;
  const platinumEarned = (game.earned?.platinum ?? 0) > 0;

  let status: GameStatus;
  if (game.isWishlist) {
    status = "deseados";
  } else if (platinumEarned) {
    status = "platinado";
  } else if (!hasPlatinum && game.progressPercent === 100) {
    status = "completado";
  } else if (earned === 0) {
    status = "sin-empezar";
  } else {
    status = "en-curso";
  }

  return {
    earned,
    total,
    percent: game.progressPercent,
    status,
    hasPlatinum,
    platinumEarned,
  };
}

/**
 * Qué hacer a continuación en un juego.
 *
 * Orden: primero lo ya empezado (un hito parcial dice que vas a medias), luego
 * lo más común entre jugadores — la mejor señal automática de "esto es lo fácil
 * que te queda". El platino va siempre al final: no es una tarea, es la
 * consecuencia de terminar el resto.
 */
export function nextSteps(trophies: Trophy[], limit = 4): Trophy[] {
  const fraction = (t: Trophy) =>
    t.progress ? t.progress.current / t.progress.target : 0;

  return trophies
    .filter((t) => !t.earned)
    .sort((a, b) => {
      if (a.grade === "platinum") return 1;
      if (b.grade === "platinum") return -1;

      const started = fraction(b) - fraction(a);
      if (started !== 0) return started;

      return (b.rarityPercent ?? 0) - (a.rarityPercent ?? 0);
    })
    .slice(0, limit);
}

export interface PlayerSummary {
  platinos: number;
  juegos: number;
  trofeos: number;
  counts: TrophyCounts;
  /** Media de completado sobre los juegos empezados. */
  completadoMedio: number;
  /** Cuántos juegos aporta cada plataforma vinculada. */
  porPlataforma: Partial<Record<Platform, number>>;
}

export function summarise(games: Game[]): PlayerSummary {
  const counts = emptyCounts();
  const porPlataforma: Partial<Record<Platform, number>> = {};
  let trofeos = 0;

  for (const g of games) {
    // El desglose por metal solo lo dan las plataformas que los tienen; el
    // total, en cambio, cuenta siempre.
    counts.platinum += g.earned?.platinum ?? 0;
    counts.gold += g.earned?.gold ?? 0;
    counts.silver += g.earned?.silver ?? 0;
    counts.bronze += g.earned?.bronze ?? 0;

    trofeos += g.earnedTotal;
    porPlataforma[g.platform] = (porPlataforma[g.platform] ?? 0) + 1;
  }

  const empezados = games.filter((g) => g.progressPercent > 0);

  return {
    platinos: counts.platinum,
    juegos: games.length,
    trofeos,
    counts,
    completadoMedio:
      empezados.length === 0
        ? 0
        : Math.round(
            empezados.reduce((n, g) => n + g.progressPercent, 0) / empezados.length,
          ),
    porPlataforma,
  };
}

/* ------------------------------ Búsqueda y filtros ----------------------------- */

export type SortKey = "reciente" | "progreso" | "titulo" | "pendientes" | "asequible";

export interface LibraryFilters {
  search?: string;
  platform?: Platform | "todas";
  status?: GameStatus | "todos";
  publisher?: string;
  genre?: string;
  sort?: SortKey;
  sortDir?: "asc" | "desc";
}

/** Quita acentos y mayúsculas: buscar "pokemon" tiene que encontrar "Pokémon". */
function normalise(text: string): string {
  // NFD separa cada letra acentuada en letra + marca combinante, y el rango de
  // abajo (U+0300–U+036F) borra esas marcas. Se ven como caracteres vacíos en
  // el editor: no los borres, son el filtro.
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** La empresa por la que agrupamos: la editora, y si no la hay, quien lo hizo. */
export function companyOf(game: Game): string | null {
  return game.publisher ?? game.developer ?? null;
}

export function filterGames(games: Game[], filters: LibraryFilters): Game[] {
  const needle = filters.search ? normalise(filters.search.trim()) : "";

  const filtered = games.filter((game) => {
    if (needle) {
      const haystack = normalise(
        [game.title, game.developer, game.publisher, ...(game.genres ?? [])]
          .filter(Boolean)
          .join(" "),
      );
      if (!haystack.includes(needle)) return false;
    }

    if (filters.platform && filters.platform !== "todas") {
      if (game.platform !== filters.platform) return false;
    }

    if (filters.status && filters.status !== "todos") {
      if (gameProgress(game).status !== filters.status) return false;
    }

    if (filters.publisher && companyOf(game) !== filters.publisher) return false;

    if (filters.genre && !(game.genres ?? []).includes(filters.genre)) return false;

    return true;
  });

  const sorted = sortGames(filtered, filters.sort ?? "reciente");
  if (filters.sortDir === "asc") {
    return sorted.reverse();
  }
  return sorted;
}

export function sortGames(games: Game[], sort: SortKey): Game[] {
  const copy = [...games];

  switch (sort) {
    case "titulo":
      return copy.sort((a, b) => a.title.localeCompare(b.title, "es"));
    case "progreso":
      return copy.sort((a, b) => b.progressPercent - a.progressPercent);
    case "pendientes":
      // Lo que menos te queda primero, ignorando lo que ya está terminado y lo
      // que no has empezado: son los dos casos donde "lo que falta" no dice nada.
      return copy.sort((a, b) => {
        const restante = (g: Game) => {
          const p = gameProgress(g);
          if (p.total === 0 || p.percent === 100 || p.earned === 0) return Infinity;
          return p.total - p.earned;
        };
        return restante(a) - restante(b);
      });
    case "asequible":
      // El platino más alcanzable primero: el que más gente ha sacado. Los
      // ya platinados y los que no tienen dato de rareza van al final — no
      // son candidatos a "¿qué me pongo a platinar?".
      return copy.sort((a, b) => {
        const puntua = (g: Game) => {
          const p = gameProgress(g);
          if (p.platinumEarned || g.platinumRarity === undefined) return -1;
          return g.platinumRarity;
        };
        const pa = puntua(a);
        const pb = puntua(b);
        if (pa < 0 && pb < 0) return 0;
        if (pa < 0) return 1;
        if (pb < 0) return -1;
        return pb - pa;
      });
    default:
      return copy.sort((a, b) =>
        (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""),
      );
  }
}

export interface Facet {
  value: string;
  count: number;
}

/**
 * Los valores por los que se puede filtrar, con cuántos juegos tiene cada uno.
 *
 * Se calculan sobre la biblioteca entera, no sobre lo ya filtrado: si al elegir
 * una editora desaparecieran las demás del desplegable, no habría forma de
 * cambiar de opinión sin borrar el filtro.
 */
export function libraryFacets(games: Game[]): {
  publishers: Facet[];
  genres: Facet[];
  platforms: Facet[];
} {
  const tally = (values: (string | null | undefined)[]) => {
    const map = new Map<string, number>();
    for (const value of values) {
      if (!value) continue;
      map.set(value, (map.get(value) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "es"));
  };

  return {
    publishers: tally(games.map(companyOf)),
    genres: tally(games.flatMap((g) => g.genres ?? [])),
    platforms: tally(games.map((g) => g.platform)),
  };
}

/* --------------------------------- Comparativa --------------------------------- */

export interface SharedGame {
  id: string;
  title: string;
  iconUrl?: string;
  /** Progreso por jugador, en el mismo orden que las librerías recibidas. */
  progress: GameProgress[];
}

/**
 * Juegos que aparecen en todas las bibliotecas recibidas.
 *
 * Acepta N jugadores a propósito: hoy lo usa la comparativa con un amigo, y es
 * lo mismo que hará falta para comparar con un grupo entero.
 */
export function sharedGames(libraries: Library[]): SharedGame[] {
  if (libraries.length === 0) return [];

  const [first, ...rest] = libraries;

  const rows: SharedGame[] = [];

  for (const game of first.games) {
    const others = rest.map((lib) => lib.games.find((g) => g.id === game.id));
    if (others.some((g) => !g)) continue;

    rows.push({
      id: game.id,
      title: game.title,
      iconUrl: game.iconUrl,
      progress: [game, ...(others as Game[])].map(gameProgress),
    });
  }

  return rows.sort((a, b) => b.progress[0].percent - a.progress[0].percent);
}

/* ------------------------------ Juego base y DLC ------------------------------ */

export interface RepartoDlc {
  base: { earned: number; total: number };
  dlc: { earned: number; total: number };
  /** Si el juego tiene contenido descargable con trofeos. */
  tieneDlc: boolean;
  /** Platino conseguido y juego base al 100%, pero quedan trofeos de DLC. */
  baseCompletoConDlcPendiente: boolean;
}

/**
 * Separa lo que es del juego base de lo que viene en DLC.
 *
 * Importa porque el platino SOLO depende del juego base: se puede tener el
 * platino y seguir con la barra al 77% porque faltan trofeos de expansiones.
 * Sin distinguirlo, la ficha parece decir que te falta juego por terminar, y
 * un aviso de "te queda 1 para el platino" se equivocaría contando trofeos
 * que no cuentan para él.
 *
 * PSN agrupa los trofeos en "default" (el juego) y "001", "002"... (cada
 * DLC). En Steam no hay grupos: todo llega junto y esto devuelve todo como
 * base, que es lo honesto — no tenemos el dato.
 */
export function repartoDlc(trophies: Trophy[]): RepartoDlc {
  const esDlc = (t: Trophy) => (t.groupId ?? "default") !== "default";

  const base = trophies.filter((t) => !esDlc(t));
  const dlc = trophies.filter(esDlc);

  const cuenta = (lista: Trophy[]) => ({
    earned: lista.filter((t) => t.earned).length,
    total: lista.length,
  });

  const baseCuenta = cuenta(base);
  const dlcCuenta = cuenta(dlc);

  return {
    base: baseCuenta,
    dlc: dlcCuenta,
    tieneDlc: dlcCuenta.total > 0,
    baseCompletoConDlcPendiente:
      baseCuenta.total > 0 &&
      baseCuenta.earned === baseCuenta.total &&
      dlcCuenta.total > dlcCuenta.earned,
  };
}
