/**
 * Reglas de los campos del perfil, en un solo sitio: `HANDLE_RE` estaba
 * copiada en actions.ts, /api/mobile/profile/handle y /api/profile/update, y
 * esta última llegó a no aplicarla (auditoría, 25 sept 2026). Probado en
 * tests/validacionPerfil.test.ts.
 */

export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
export const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
export const IDIOMA_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

/** URL absoluta http(s), con tope de longitud. */
export function esUrlHttp(valor: string): boolean {
  if (valor.length > 2048) return false;
  try {
    const { protocol } = new URL(valor);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/** Zona horaria IANA que `Intl` reconoce ("Europe/Madrid"). */
export function esZonaHoraria(valor: string): boolean {
  try {
    new Intl.DateTimeFormat("es-ES", { timeZone: valor });
    return true;
  } catch {
    return false;
  }
}
