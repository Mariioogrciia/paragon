/**
 * Catálogo único de insignias ("Logros de Paragon"). Antes había dos listas
 * que no coincidían: `checkAndGrantBadges` otorgaba 10 y la tarjeta del
 * perfil (`ParagonAchievements`) solo enseñaba 6, así que "Crítico",
 * "Sociable", "Rolero" y "Multiplataforma" se conseguían pero no salían.
 *
 * Aquí solo va lo que no toca la base (sirve en cliente): el valor de cada
 * `metrica` lo mide `medirLogros` (lib/medirLogros.ts) en una sola consulta,
 * y lo mismo decide qué se otorga y qué progreso enseña la tarjeta.
 *
 * Textos en `messages/Perfil/*.json`, `Badges.items.<id>`.
 */

export type MetricaLogro =
  | "pionero"
  | "platinos"
  | "juegos"
  | "resenas"
  | "amigos"
  | "plataformas"
  | "rpgs"
  | "platinoRaro"
  | "ultraRaros"
  | "palmares"
  | "guerras"
  | "coop"
  | "semanasPerfectas"
  | "misiones"
  | "temporadaMax"
  | "guias"
  | "sesiones"
  | "nivel"
  | "noctambulo"
  | "maraton";

export interface Logro {
  id: string;
  metrica: MetricaLogro;
  objetivo: number;
  /** Fondo de la insignia redonda del perfil. */
  bg: string;
  /** Color de la tarjeta de progreso. */
  color: string;
  /** Oculto: ni nombre ni requisito hasta conseguirlo. */
  oculto?: boolean;
}

export const LOGROS: Logro[] = [
  { id: "madrugador", metrica: "pionero", objetivo: 1, bg: "linear-gradient(135deg, #4c1d95, #8b5cf6)", color: "var(--accent-2)" },
  { id: "first_blood", metrica: "platinos", objetivo: 1, bg: "linear-gradient(135deg, #2b5f7d, #cfeaf7)", color: "var(--platinum)" },
  { id: "cazador", metrica: "platinos", objetivo: 10, bg: "linear-gradient(135deg, #1f2937, #4b5563)", color: "var(--accent)" },
  { id: "experto", metrica: "platinos", objetivo: 50, bg: "linear-gradient(135deg, #7f1d1d, #ef4444)", color: "var(--gold)" },
  { id: "leyenda", metrica: "platinos", objetivo: 100, bg: "linear-gradient(135deg, #78350f, #fbbf24)", color: "var(--bronze)" },
  { id: "coleccionista", metrica: "juegos", objetivo: 100, bg: "linear-gradient(135deg, #064e3b, #10b981)", color: "var(--good)" },
  { id: "critico", metrica: "resenas", objetivo: 3, bg: "linear-gradient(135deg, #be123c, #f43f5e)", color: "#f43f5e" },
  { id: "sociable", metrica: "amigos", objetivo: 3, bg: "linear-gradient(135deg, #1d4ed8, #3b82f6)", color: "#3b82f6" },
  { id: "rolero", metrica: "rpgs", objetivo: 5, bg: "linear-gradient(135deg, #047857, #10b981)", color: "#10b981" },
  { id: "multiplataforma", metrica: "plataformas", objetivo: 3, bg: "linear-gradient(135deg, #1e3a8a, #6366f1)", color: "#6366f1" },
  { id: "joya_rara", metrica: "platinoRaro", objetivo: 1, bg: "linear-gradient(135deg, #0e7490, #67e8f9)", color: "#67e8f9" },
  { id: "uno_entre_cien", metrica: "ultraRaros", objetivo: 10, bg: "linear-gradient(135deg, #581c87, #e879f9)", color: "#e879f9" },
  { id: "campeon", metrica: "palmares", objetivo: 1, bg: "linear-gradient(135deg, #a16207, #fde047)", color: "var(--gold)" },
  { id: "senor_guerra", metrica: "guerras", objetivo: 1, bg: "linear-gradient(135deg, #7c2d12, #fb923c)", color: "#fb923c" },
  { id: "en_equipo", metrica: "coop", objetivo: 1, bg: "linear-gradient(135deg, #155e75, #2dd4bf)", color: "#2dd4bf" },
  { id: "anfitrion", metrica: "sesiones", objetivo: 1, bg: "linear-gradient(135deg, #3730a3, #a5b4fc)", color: "#a5b4fc" },
  { id: "guia", metrica: "guias", objetivo: 3, bg: "linear-gradient(135deg, #365314, #a3e635)", color: "#a3e635" },
  { id: "semana_perfecta", metrica: "semanasPerfectas", objetivo: 1, bg: "linear-gradient(135deg, #065f46, #34d399)", color: "#34d399" },
  { id: "incansable", metrica: "misiones", objetivo: 25, bg: "linear-gradient(135deg, #9a3412, #fdba74)", color: "#fdba74" },
  { id: "temporada_oro", metrica: "temporadaMax", objetivo: 30, bg: "linear-gradient(135deg, #854d0e, #e2b53e)", color: "#e2b53e" },
  { id: "temporada_platino", metrica: "temporadaMax", objetivo: 50, bg: "linear-gradient(135deg, #0c4a6e, #9fd4ec)", color: "#9fd4ec" },
  { id: "veterano", metrica: "nivel", objetivo: 25, bg: "linear-gradient(135deg, #1e293b, #94a3b8)", color: "#94a3b8" },
  { id: "maestro", metrica: "nivel", objetivo: 50, bg: "linear-gradient(135deg, #312e81, #c4b5fd)", color: "#c4b5fd" },
  { id: "noctambulo", metrica: "noctambulo", objetivo: 10, bg: "linear-gradient(135deg, #0f172a, #475569)", color: "#64748b", oculto: true },
  { id: "maraton", metrica: "maraton", objetivo: 40, bg: "linear-gradient(135deg, #881337, #fda4af)", color: "#fda4af", oculto: true },
];

export const LOGRO_POR_ID = new Map(LOGROS.map((l) => [l.id, l]));

export type MedidasLogros = Record<MetricaLogro, number>;

export function logroConseguido(logro: Logro, medidas: MedidasLogros): boolean {
  return medidas[logro.metrica] >= logro.objetivo;
}
