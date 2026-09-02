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

export function isPsnConfigured(): boolean {
  return Boolean(process.env.PSN_NPSSO);
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

  const npsso = process.env.PSN_NPSSO;
  if (!npsso) throw new PsnNotConfiguredError();

  cache = await authenticateWithNpsso(npsso);
  return { accessToken: cache.accessToken };
}
