import {
  exchangeCodeForAccessToken,
  exchangeNpssoForCode,
  exchangeRefreshTokenForAuthTokens,
  type AuthorizationPayload,
} from "psn-api";

/**
 * Autenticación contra PSN, con la credencial del servidor.
 *
 * PSN no tiene API pública. El camino que usa la comunidad es: token NPSSO ->
 * código de acceso -> access token de ~1h, renovable con el refresh token
 * durante ~2 meses.
 *
 * Importante: hay UN solo NPSSO para toda la app, el del servidor. Con él se
 * leen los perfiles públicos de todos los usuarios, así que ningún usuario
 * tiene que entregarnos credenciales de Sony. Es también el motivo por el que
 * un perfil privado en PSN no se puede sincronizar: no somos ellos.
 */

interface CachedAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

let cache: CachedAuth | null = null;

/** Margen para no usar un token que caduca mientras viaja la petición. */
const SKEW_MS = 60_000;

export class PsnNotConfiguredError extends Error {
  constructor() {
    super("Falta PSN_NPSSO en las variables de entorno.");
    this.name = "PsnNotConfiguredError";
  }
}

export class PsnAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PsnAuthError";
  }
}

/**
 * El NPSSO de `PSN_NPSSO`, limpio (21 oct 2026). Lo que da
 * ca.account.sony.com/api/v1/ssocookie es `{"npsso":"…"}`, y al pegarlo en
 * Vercel es muy fácil llevarse las comillas, el JSON entero o un espacio:
 * Sony lo rechazaba y salía "ha caducado" con uno recién copiado. Se acepta
 * cualquiera de esas formas y se usa solo el valor.
 */
export function npssoDelEntorno(valor = process.env.PSN_NPSSO): string | null {
  const bruto = valor?.trim();
  if (!bruto) return null;
  try {
    const json: unknown = JSON.parse(bruto);
    if (typeof json === "object" && json && typeof (json as { npsso?: unknown }).npsso === "string") {
      return (json as { npsso: string }).npsso.trim() || null;
    }
  } catch {
    // No es JSON: se mira abajo.
  }
  const conClave = bruto.match(/npsso"?\s*[:=]\s*"?([A-Za-z0-9]+)/i);
  if (conClave) return conClave[1];
  const limpio = bruto.replace(/^["']+|["']+$/g, "").trim();
  return limpio || null;
}

export function isPsnConfigured(): boolean {
  return npssoDelEntorno() !== null;
}

/** Olvida el token en caché: para comprobar un NPSSO recién puesto sin esperar a que caduque el anterior. */
export function olvidarTokenPsn(): void {
  cache = null;
}

async function authenticateWithNpsso(npsso: string): Promise<CachedAuth> {
  let code: string;
  try {
    code = await exchangeNpssoForCode(npsso);
  } catch {
    throw new PsnAuthError(
      "PSN no aceptó el token NPSSO. Lo más habitual es que haya caducado: vuelve a copiarlo con la sesión de PlayStation abierta.",
    );
  }

  const tokens = await exchangeCodeForAccessToken(code);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
  };
}

/**
 * Autentica con el NPSSO de un usuario concreto (no el del servidor) — para
 * la extensión de navegador: lee la sesión de PSN del propio usuario y nos
 * la manda una vez, para leer SU biblioteca aunque no sea amigo de la
 * cuenta maestra. A propósito no se cachea ni se reintenta con refresh
 * token como el de arriba: vive solo lo que dura esta petición y se
 * descarta — nunca se guarda un NPSSO ajeno en la base de datos.
 */
export async function authenticateWithNpssoEphemeral(npsso: string): Promise<AuthorizationPayload> {
  let code: string;
  try {
    code = await exchangeNpssoForCode(npsso);
  } catch {
    throw new PsnAuthError(
      "PSN no ha aceptado la sesión — vuelve a intentarlo con playstation.com abierto y con la sesión iniciada.",
    );
  }

  const tokens = await exchangeCodeForAccessToken(code);
  return { accessToken: tokens.accessToken };
}

/** Token válido para llamar a la API, renovándolo si hace falta. */
export async function getAuthorization(): Promise<AuthorizationPayload> {
  if (cache && cache.expiresAt - SKEW_MS > Date.now()) {
    return { accessToken: cache.accessToken };
  }

  if (cache) {
    try {
      const refreshed = await exchangeRefreshTokenForAuthTokens(cache.refreshToken);
      cache = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: Date.now() + refreshed.expiresIn * 1000,
      };
      return { accessToken: cache.accessToken };
    } catch {
      // El refresh también caducó: volvemos al NPSSO.
      cache = null;
    }
  }

  const npsso = npssoDelEntorno();
  if (!npsso) throw new PsnNotConfiguredError();

  cache = await authenticateWithNpsso(npsso);
  return { accessToken: cache.accessToken };
}
