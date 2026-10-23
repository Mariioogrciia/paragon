/**
 * Vuelta del login de Epic cuando algo falla (23 oct 2026).
 *
 * Auth.js manda cualquier fallo de la vuelta a `/entrar?error=…` (o a
 * `/api/auth/error`). Para Epic eso confunde: el login de Epic NO sirve para
 * entrar, solo para verificar la cuenta con la sesión ya abierta (ver
 * `verificarEpic` en auth.ts), así que quien lo pulsaba desde Ajustes acababa
 * en la pantalla de entrar sin saber qué había pasado. Aquí se cambia ese
 * destino por Ajustes → Plataformas con el motivo, para enseñar un mensaje
 * que diga qué hacer.
 *
 * `/entrar?epic=sin-sesion` (sin `error`) es la salida buena de cuando no
 * hay sesión: esa no se toca.
 */

export type MotivoFalloEpic = "cancelado" | "estado" | "fallo";

/** Cookie del `state` de Auth.js (con prefijo `__Secure-` en https). */
export const COOKIE_STATE = /(?:^|;\s*)(?:__Secure-)?authjs\.state=/;

/**
 * Qué ha fallado. Auth.js no sirve para distinguirlo: casi todo lo de la
 * vuelta (también que falte la cookie del `state`, `InvalidCheck`) le llega
 * al navegador como `error=Configuration`. Por eso se mira lo que manda Epic
 * y si la petición traía esa cookie.
 */
export function motivoFalloEpic(errorDeEpic: string | null, conCookieState: boolean): MotivoFalloEpic {
  // Epic: el usuario pulsó "Cancelar" o no dio permiso.
  if (errorDeEpic === "access_denied") return "cancelado";
  // Sin la cookie del intento: otra pestaña, otro dominio (sin www) o caducada.
  if (!conCookieState) return "estado";
  return "fallo";
}

/**
 * Si `respuesta` es la redirección de error de Auth.js para la vuelta de Epic
 * (`urlPeticion`), la URL de Ajustes a la que mandarla en su lugar. Si no,
 * null y se deja la respuesta tal cual.
 */
export function destinoFalloEpic(urlPeticion: URL, respuesta: Response, cookies: string | null): string | null {
  if (!urlPeticion.pathname.endsWith("/callback/epic")) return null;
  if (respuesta.status < 300 || respuesta.status >= 400) return null;
  const location = respuesta.headers.get("location");
  if (!location) return null;

  let destino: URL;
  try {
    destino = new URL(location, urlPeticion);
  } catch {
    return null;
  }
  const esPaginaDeError = destino.pathname === "/entrar" || destino.pathname === "/api/auth/error";
  if (!esPaginaDeError || !destino.searchParams.get("error")) return null;

  const motivo = motivoFalloEpic(urlPeticion.searchParams.get("error"), COOKIE_STATE.test(cookies ?? ""));
  return new URL(`/ajustes/plataformas?epic=error&motivo=${motivo}`, urlPeticion).toString();
}
