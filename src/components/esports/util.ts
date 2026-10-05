import type { EsportsTeam } from "@/lib/pandascore";
import type { EquipoFavorito } from "@/lib/esportsFavoritos";

/** Ruta de la ficha de un partido. */
export const hrefPartido = (id: string) => `/esports/partido/${id}`;

/** El equipo de un partido como favorito; null si no tiene id (partidos de ejemplo). */
export function comoFavorito(team: Pick<EsportsTeam, "id" | "name" | "acronym" | "logo">, juego: string): EquipoFavorito | null {
  if (team.id == null) return null;
  return { teamId: team.id, nombre: team.name, acronimo: team.acronym ?? null, logo: team.logo || null, juego };
}
