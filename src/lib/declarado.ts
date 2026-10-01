/**
 * Plataformas cuyo progreso es DECLARADO (decisión del usuario, 1 oct 2026).
 *
 * Epic bloquea las lecturas desde el servidor (antibots), así que sus logros
 * los lee la extensión del navegador desde la sesión del propio usuario y los
 * envía a Paragon (ver /api/extension/epic-sync). El servidor no puede
 * comprobar que sean ciertos, a diferencia de PSN/Steam/Xbox, que lee él
 * mismo. Para que falsearlo no sirva para nada:
 *
 * - NO suma XP al nivel Paragon, ni al Paragon Score.
 * - NO cuenta en clasificaciones de amigos, ligas, clanes, temporadas,
 *   retos, insignias, ni en estadísticas públicas (muro de la fama, etc.).
 * - SÍ se ve en la biblioteca, la ficha y las estadísticas del propio
 *   usuario, marcado como "Progreso declarado localmente".
 *
 * Una sola lista para todo: si mañana otra plataforma entra por el mismo
 * camino, se añade aquí y deja de puntuar en todas partes a la vez.
 */
export const PLATAFORMAS_DECLARADAS = ["epic"] as const;

export function esDeclarada(platform: string | null | undefined): boolean {
  return (PLATAFORMAS_DECLARADAS as readonly string[]).includes(platform ?? "");
}

/** Para filtrar listas de juegos antes de puntuar. */
export function puntuables<T extends { platform: string }>(juegos: T[]): T[] {
  return juegos.filter((j) => !esDeclarada(j.platform));
}

/** Fragmento SQL (`games.platform not in (...)`): lista fija, no entrada de usuario. */
export const SQL_NO_DECLARADA = PLATAFORMAS_DECLARADAS.map((p) => `'${p}'`).join(", ");
