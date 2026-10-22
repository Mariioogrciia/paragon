import { exchangeCodeForAccessToken, exchangeRefreshTokenForAuthTokens, type AuthorizationPayload } from "psn-api";

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
  /** Lo que contestó Sony, para Admin → Sistema (sin códigos ni tokens). */
  detalle?: string;
  constructor(message: string, detalle?: string) {
    super(message);
    this.name = "PsnAuthError";
    this.detalle = detalle;
  }
}

/** "HTTP 302 → error=login_required, error_code=4165" a partir de la respuesta de Sony. */
function resumenRespuesta(status: number, destino: string): string {
  if (!destino) return `HTTP ${status}`;
  const [base, consulta = ""] = destino.split("?");
  const datos = new URLSearchParams(consulta);
  const utiles = ["error", "error_code", "error_description"]
    .filter((k) => datos.get(k))
    .map((k) => `${k}=${datos.get(k)}`);
  return `HTTP ${status} → ${utiles.length > 0 ? utiles.join(", ") : base.replace(/^[a-z.]+:\/\//i, "").slice(0, 80)}`;
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

/**
 * NPSSO → código de acceso (22 oct 2026). Lo hacía `exchangeNpssoForCode` de
 * psn-api, que da el MISMO error ("¿es válido tu NPSSO?") tanto si Sony
 * rechaza el NPSSO como si no contesta bien por otra cosa (un 403 o 429 de su
 * antibots, un 5xx, la red). Así, un tropiezo puntual se apuntaba como "NPSSO
 * caducado" con uno recién puesto. Aquí se separan:
 * - Sony redirige con `?code=`: bien.
 * - Redirige SIN código (le falta la sesión: NPSSO inválido): `PsnAuthError`.
 * - Cualquier otra respuesta o fallo de red: error normal, "PSN no responde".
 * Misma petición que psn-api (cliente de la app de PlayStation).
 */
export async function codigoDesdeNpsso(npsso: string): Promise<string> {
  const parametros = new URLSearchParams({
    access_type: "offline",
    client_id: "09515159-7237-4370-9b40-3806e67c0891",
    redirect_uri: "com.scee.psxandroid.scecompcall://redirect",
    response_type: "code",
    scope: "psn:mobile.v2.core psn:clientapp",
  });
  const respuesta = await fetch(`https://ca.account.sony.com/api/authz/v3/oauth/authorize?${parametros}`, {
    headers: { Cookie: `npsso=${npsso}` },
    redirect: "manual",
  });
  const destino = respuesta.headers.get("location") ?? "";
  const codigo = destino.includes("?code=") ? new URLSearchParams(destino.split("?")[1]).get("code") : null;
  if (codigo) return codigo;
  if (respuesta.status >= 300 && respuesta.status < 400) {
    throw new PsnAuthError(
      "PSN no aceptó el token NPSSO: ha caducado o se cerró esa sesión. Vuelve a copiarlo con la sesión de PlayStation abierta.",
      resumenRespuesta(respuesta.status, destino),
    );
  }
  throw new Error(`PSN no respondió como se esperaba al pedir el acceso (${resumenRespuesta(respuesta.status, destino)}).`);
}

export function isPsnConfigured(): boolean {
  return npssoDelEntorno() !== null;
}

/** Olvida el token en caché: para comprobar un NPSSO recién puesto sin esperar a que caduque el anterior. */
export function olvidarTokenPsn(): void {
  cache = null;
}

async function authenticateWithNpsso(npsso: string): Promise<CachedAuth> {
  // `PsnAuthError` solo si Sony rechaza el NPSSO de verdad (ver codigoDesdeNpsso).
  const code = await codigoDesdeNpsso(npsso);

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
    code = await codigoDesdeNpsso(npsso);
  } catch (error) {
    if (!(error instanceof PsnAuthError)) throw error;
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
