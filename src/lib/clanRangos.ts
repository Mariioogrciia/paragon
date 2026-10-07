/**
 * Rangos de un clan, al estilo Clash of Clans. Se guardan en
 * `clan_members.role` (texto): "owner" (líder), "colider", "veterano" y
 * "member". "admin" es un valor antiguo del esquema que nunca se usó: cuenta
 * como colíder. La app tiene las mismas reglas (ClansRepository.kt).
 *
 *   Líder     todo: ascender/degradar, expulsar y pasar el liderazgo.
 *   Colíder   editar nombre, descripción y escudo; invitar; expulsar y
 *             ascender/degradar entre veterano y miembro.
 *   Veterano  invitar.
 *   Miembro   nada de gestión.
 */

export const RANGOS = ["owner", "colider", "veterano", "member"] as const;
export type Rango = (typeof RANGOS)[number];

export function normalizarRango(role: string | null | undefined): Rango {
  if (role === "admin") return "colider";
  return (RANGOS as readonly string[]).includes(role ?? "") ? (role as Rango) : "member";
}

/** Más alto = más mando. */
export function nivelRango(role: string | null | undefined): number {
  return { owner: 3, colider: 2, veterano: 1, member: 0 }[normalizarRango(role)];
}

/** Nombre, descripción y escudo. */
export function puedeEditarClan(role: string | null | undefined): boolean {
  return nivelRango(role) >= 2;
}

export function puedeInvitar(role: string | null | undefined): boolean {
  return nivelRango(role) >= 1;
}

/** Expulsar: líder o colíder, y solo a alguien de rango inferior. */
export function puedeExpulsar(actor: string | null | undefined, objetivo: string | null | undefined): boolean {
  return nivelRango(actor) >= 2 && nivelRango(actor) > nivelRango(objetivo);
}

/**
 * Cambiar el rango de otro a `nuevo`. El líder pone cualquiera (con "owner"
 * pasa el liderazgo, y él queda de colíder). El colíder solo mueve entre
 * veterano y miembro, y solo a quien está por debajo de él.
 */
export function puedeCambiarRango(actor: string | null | undefined, objetivo: string | null | undefined, nuevo: Rango): boolean {
  const a = nivelRango(actor);
  if (a <= nivelRango(objetivo)) return false;
  if (normalizarRango(objetivo) === nuevo) return false;
  if (a === 3) return true;
  if (a === 2) return nuevo === "veterano" || nuevo === "member";
  return false;
}
