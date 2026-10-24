/**
 * Petición del token de Epic con el secreto SIN codificar (24 oct 2026).
 *
 * Auth.js (oauth4webapi) manda el id y el secreto en `Authorization: Basic`
 * codificados como formulario antes del base64, como dice el estándar
 * (RFC 6749 §2.3.1): un secreto con "/" o "+" viaja como "%2F" o "%2B".
 * Epic no lo descodifica y contesta `invalid_client_credentials` (18033),
 * así que con un secreto de esos el login de Epic fallaba SIEMPRE al volver
 * ("Server error"), aunque estuviese bien puesto en Vercel. Epic tampoco
 * acepta el secreto en el cuerpo (`client_secret_post`).
 *
 * Esto cambia solo esa cabecera, y solo en la petición al endpoint de token
 * de Epic; lo demás pasa tal cual. Se engancha al proveedor con el
 * `customFetch` de Auth.js (ver auth.ts).
 */

export const URL_TOKEN_EPIC = "https://api.epicgames.dev/epic/oauth/v2/token";

/** `Basic base64(id:secreto)` con los valores tal cual, como los espera Epic. */
export function cabeceraBasicEpic(id: string, secreto: string): string {
  return `Basic ${Buffer.from(`${id}:${secreto}`).toString("base64")}`;
}

function urlDe(entrada: RequestInfo | URL): string {
  if (typeof entrada === "string") return entrada;
  if (entrada instanceof URL) return entrada.href;
  return entrada.url;
}

/** Un `fetch` que, para el token de Epic, pone la cabecera Basic sin codificar. */
export function fetchEpic(id: string | undefined, secreto: string | undefined, base: typeof fetch = fetch): typeof fetch {
  return (entrada, init) => {
    if (!id || !secreto || !urlDe(entrada).startsWith(URL_TOKEN_EPIC)) return base(entrada, init);
    const cabeceras = new Headers(init?.headers);
    cabeceras.set("authorization", cabeceraBasicEpic(id, secreto));
    return base(entrada, { ...init, headers: cabeceras });
  };
}
