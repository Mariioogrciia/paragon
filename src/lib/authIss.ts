/**
 * Arreglo del login con Discord (21 oct 2026). Discord ha empezado a mandar
 * `iss` en la vuelta del login (RFC 9207: quién emite la respuesta). Auth.js
 * trata Discord como OAuth sin emisor y compara ese `iss` con uno de relleno
 * ("https://authjs.dev"), así que todo login con Discord fallaba con
 * `unexpected "iss" (issuer) response parameter value` (CallbackRouteError).
 *
 * Se quita el parámetro solo si de verdad lo emite discord.com; cualquier
 * otro emisor sigue llegando a Auth.js y se rechaza como antes. La vuelta de
 * cada proveedor tiene su propia URL, así que no hay riesgo de confundir una
 * respuesta de Google con una de Discord (lo que `iss` evita).
 *
 * Devuelve la URL sin `iss`, o null si no hay nada que tocar.
 */
export function urlSinIssDeDiscord(url: URL): URL | null {
  if (!url.pathname.endsWith("/callback/discord")) return null;
  const iss = url.searchParams.get("iss");
  if (!iss) return null;
  let host: string;
  try {
    host = new URL(iss).hostname;
  } catch {
    return null;
  }
  if (host !== "discord.com" && !host.endsWith(".discord.com")) return null;
  const limpia = new URL(url);
  limpia.searchParams.delete("iss");
  return limpia;
}
