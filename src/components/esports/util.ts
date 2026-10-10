import type { EsportsTeam } from "@/lib/pandascore";
import type { EquipoFavorito } from "@/lib/esportsFavoritos";

/** Ruta de la ficha de un partido. */
export const hrefPartido = (id: string) => `/esports/partido/${id}`;

/** El equipo de un partido como favorito; null si no tiene id (partidos de ejemplo). */
export function comoFavorito(team: Pick<EsportsTeam, "id" | "name" | "acronym" | "logo">, juego: string): EquipoFavorito | null {
  if (team.id == null) return null;
  return { teamId: team.id, nombre: team.name, acronimo: team.acronym ?? null, logo: team.logo || null, juego };
}

/**
 * Las imágenes de PandaScore pasan por /api/esports/img: Avast bloquea
 * `cdn-api.pandascore.co` y avisaba por cada escudo. El resto, tal cual.
 */
export function imagenEsports(url: string | null): string | null {
  if (!url) return null;
  return /^https:\/\/cdn-api\.pandascore\.co\//.test(url) ? `/api/esports/img?u=${encodeURIComponent(url)}` : url;
}
