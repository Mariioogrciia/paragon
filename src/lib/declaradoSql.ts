import "server-only";
import { notLike, type AnyColumn, type SQL } from "drizzle-orm";
import { PLATAFORMAS_DECLARADAS } from "@/lib/declarado";

/**
 * Condiciones SQL para dejar fuera el progreso declarado (ver
 * lib/declarado.ts) de cualquier consulta que puntúe o clasifique.
 *
 * El id de un juego es `<plataforma>-<id nativo>` (decisión de arquitectura
 * del HANDOFF), así que la plataforma se saca del propio id y no hace falta
 * unir con `games`. Pasar la columna `gameId` de la tabla de la consulta
 * (userTrophies.gameId, userGames.gameId...).
 */
export function noDeclaradoPorId(columnaGameId: AnyColumn): SQL[] {
  return PLATAFORMAS_DECLARADAS.map((p) => notLike(columnaGameId, `${p}-%`));
}
