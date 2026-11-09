/**
 * Estadísticas dentro del propio juego, tipo tracker (9 nov 2026): las que
 * Steam guarda por jugador (`ISteamUserStats/GetUserStatsForGame`): bajas,
 * partidas, distancia, tiempo en un modo… Cada juego define las suyas, con
 * nombres internos ("total_kills_ak47") y a veces un nombre bonito en el
 * esquema. Aquí se limpian, se ordenan y se les adivina el formato.
 *
 * Módulo puro: `tests/estadisticasJuego.test.ts`. La llamada a Steam está en
 * `lib/steam/client.ts` (`fetchEstadisticasJuego`).
 */

export type FormatoEstadistica = "numero" | "tiempo" | "distancia" | "porcentaje";

export interface EstadisticaJuego {
  /** Nombre interno de Steam. */
  id: string;
  nombre: string;
  valor: number;
  formato: FormatoEstadistica;
  /** Unidad de origen del tiempo o la distancia, para formatear. */
  unidad?: "s" | "min" | "h" | "m" | "km";
}

/** Lo que no le dice nada a nadie: banderas, versiones, contadores de logro… */
const INTERNAS = /(^_|version|bitfield|flags?$|^flag_|unlock|^ach_|_ach_|achievement|checksum|seed|timestamp|^last_|_id$|^id_|dummy|test|debug|dlc_owned|has_|^is_|_bool$)/i;

/** "total_kills_ak47" / "TotalKillsAk47" / "STAT_KILLS" → "Total kills ak47". */
export function nombreBonito(nombreInterno: string): string {
  const limpio = nombreInterno
    .replace(/^(stats?|stat_|st_)[_.]?/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_.\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!limpio) return nombreInterno;
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/** Formato y unidad por el nombre interno: Steam no lo dice en ningún sitio. */
export function formatoDe(nombreInterno: string): Pick<EstadisticaJuego, "formato" | "unidad"> {
  const n = nombreInterno.toLowerCase();
  if (/(percent|pct|ratio|accuracy|precision)/.test(n)) return { formato: "porcentaje" };
  if (/(time|seconds|secs|duration|playtime|tiempo)/.test(n) || /_s$/.test(n)) {
    if (/(minute|mins?\b|_min)/.test(n)) return { formato: "tiempo", unidad: "min" };
    if (/(hour|hrs?\b|_h$)/.test(n)) return { formato: "tiempo", unidad: "h" };
    return { formato: "tiempo", unidad: "s" };
  }
  if (/(distance|meters|metres|travel|walked|driven|flown|distancia)/.test(n)) {
    return { formato: "distancia", unidad: /(km|kilomet)/.test(n) ? "km" : "m" };
  }
  return { formato: "numero" };
}

/**
 * Lo que se enseña: sin ceros ni internas, primero las que el juego bautiza
 * en su esquema (en su orden, que suele ser el que el estudio quiere) y
 * después el resto por valor. Como mucho `max`.
 */
export function prepararEstadisticas(
  stats: { name: string; value: number }[],
  esquema: { name: string; displayName?: string }[],
  max = 24,
): EstadisticaJuego[] {
  const bonitos = new Map(esquema.map((s, i) => [s.name, { displayName: s.displayName?.trim() ?? "", orden: i }]));
  const vistos = new Set<string>();
  const filas = stats
    .filter((s) => {
      const v = Number(s.value);
      if (!Number.isFinite(v) || v <= 0 || vistos.has(s.name)) return false;
      vistos.add(s.name);
      const bautizada = bonitos.get(s.name)?.displayName;
      // Con nombre bonito de verdad se enseña aunque el interno parezca raro.
      return (bautizada && bautizada !== s.name) || !INTERNAS.test(s.name);
    })
    .map((s) => {
      const info = bonitos.get(s.name);
      const bautizada = info?.displayName && info.displayName !== s.name ? info.displayName : null;
      return {
        e: { id: s.name, nombre: bautizada ?? nombreBonito(s.name), valor: Number(s.value), ...formatoDe(s.name) } satisfies EstadisticaJuego,
        bautizada: bautizada !== null,
        orden: info?.orden ?? Number.MAX_SAFE_INTEGER,
      };
    });
  filas.sort((a, b) => Number(b.bautizada) - Number(a.bautizada) || (a.bautizada ? a.orden - b.orden : b.e.valor - a.e.valor));
  return filas.slice(0, max).map((f) => f.e);
}

/** "1.234", "12,5 h", "45 min", "3,2 km", "87 %" en el idioma de quien mira. */
export function formatearEstadistica(e: Pick<EstadisticaJuego, "valor" | "formato" | "unidad">, locale: string): string {
  const num = (v: number, dec = 0) => new Intl.NumberFormat(locale, { maximumFractionDigits: dec }).format(v);
  switch (e.formato) {
    case "tiempo": {
      const segundos = e.unidad === "h" ? e.valor * 3600 : e.unidad === "min" ? e.valor * 60 : e.valor;
      if (segundos < 60) return `${num(segundos)} s`;
      if (segundos < 3600) return `${num(segundos / 60)} min`;
      const horas = segundos / 3600;
      return `${num(horas, horas < 100 ? 1 : 0)} h`;
    }
    case "distancia": {
      const metros = e.unidad === "km" ? e.valor * 1000 : e.valor;
      return metros >= 1000 ? `${num(metros / 1000, 1)} km` : `${num(metros)} m`;
    }
    case "porcentaje": {
      // Unos juegos lo guardan de 0 a 1 y otros de 0 a 100.
      const pct = e.valor <= 1 ? e.valor * 100 : e.valor;
      return `${num(pct, 1)} %`;
    }
    default:
      return num(e.valor, Number.isInteger(e.valor) ? 0 : 2);
  }
}
