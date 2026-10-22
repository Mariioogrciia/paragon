/**
 * "Iniciar sesión con Steam" (OpenID 2.0, 22 oct 2026): la forma oficial de
 * que Steam diga qué cuenta es tuya, para marcarla como verificada (como el
 * login de Epic, ver lib/verificacion.ts). No da acceso a nada más: solo el
 * SteamID. Steam no usa OAuth, por eso no va por Auth.js.
 * https://partner.steamgames.com/doc/features/auth
 *
 * Sin `server-only` a propósito: no tiene nada secreto y así se puede probar.
 */

const PROVEEDOR = "https://steamcommunity.com/openid/login";
const NS = "http://specs.openid.net/auth/2.0";
const SELECCION = "http://specs.openid.net/auth/2.0/identifier_select";
const ID_STEAM = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

/** Adónde mandar a la persona para que inicie sesión en Steam. */
export function urlLoginSteam(volverA: string, dominio: string): string {
  const p = new URLSearchParams({
    "openid.ns": NS,
    "openid.mode": "checkid_setup",
    "openid.return_to": volverA,
    "openid.realm": dominio,
    "openid.identity": SELECCION,
    "openid.claimed_id": SELECCION,
  });
  return `${PROVEEDOR}?${p}`;
}

/**
 * El SteamID que confirma Steam en la vuelta, o `null` si no cuadra algo.
 * Cualquiera puede escribir esos parámetros en una URL: por eso, además de
 * comprobar que vuelven a NUESTRA dirección exacta, se le pregunta a Steam
 * (`check_authentication`) si la firma es suya.
 */
export async function steamIdConfirmado(
  vuelta: URLSearchParams,
  volverAEsperado: string,
  preguntar: typeof fetch = fetch,
): Promise<string | null> {
  if (vuelta.get("openid.mode") !== "id_res") return null;
  if (vuelta.get("openid.op_endpoint") !== PROVEEDOR) return null;
  if (vuelta.get("openid.return_to") !== volverAEsperado) return null;
  const reclamado = vuelta.get("openid.claimed_id") ?? "";
  const id = ID_STEAM.exec(reclamado)?.[1];
  if (!id || vuelta.get("openid.identity") !== reclamado) return null;

  const comprobacion = new URLSearchParams();
  for (const [clave, valor] of vuelta) if (clave.startsWith("openid.")) comprobacion.set(clave, valor);
  comprobacion.set("openid.mode", "check_authentication");
  try {
    const respuesta = await preguntar(PROVEEDOR, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: comprobacion.toString(),
    });
    const texto = await respuesta.text();
    return /(^|\n)is_valid:true(\n|$)/.test(texto) ? id : null;
  } catch {
    return null;
  }
}
