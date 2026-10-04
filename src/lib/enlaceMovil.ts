import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Entrega segura del token de sesión a la app Android (auditoría, 4 oct
 * 2026).
 *
 * Antes `/movil/enlazar` mandaba el token en claro por `paragon://auth?token=`.
 * Dos problemas: (1) cualquier otra app instalada podía registrar el mismo
 * esquema `paragon://` y quedarse con el token; (2) cualquier app o web
 * podía abrir `paragon://auth?token=<el de otra cuenta>` y dejar la app
 * logueada en una cuenta ajena sin que la persona se diera cuenta.
 *
 * Ahora la app genera una clave aleatoria de 32 bytes por cada login (`k`),
 * la manda por la Custom Tab (HTTPS, solo la ven el navegador y Paragon) y
 * guarda una copia. El servidor cifra el token con esa clave (AES-256-GCM)
 * y el enlace solo lleva el texto cifrado (`c`). Quien intercepte el enlace
 * no puede descifrarlo, y un enlace fabricado por otro no pasa la
 * verificación de GCM con la clave que espera la app.
 *
 * Formato de `c`: base64url( iv[12] | cifrado | etiqueta[16] ), que es lo
 * que espera `Cipher("AES/GCM/NoPadding")` en Kotlin (etiqueta al final).
 */

const CLAVE_RE = /^[A-Za-z0-9_-]{43}$/;

/** `k` válida = 32 bytes en base64url sin relleno (43 caracteres). */
export function claveDeEnlaceValida(k: unknown): k is string {
  return typeof k === "string" && CLAVE_RE.test(k);
}

export function cifrarParaApp(token: string, k: string): string {
  const clave = Buffer.from(k, "base64url");
  if (clave.length !== 32) throw new Error("Clave de enlace no válida");
  const iv = randomBytes(12);
  const cifrador = createCipheriv("aes-256-gcm", clave, iv);
  const cifrado = Buffer.concat([cifrador.update(token, "utf8"), cifrador.final()]);
  return Buffer.concat([iv, cifrado, cifrador.getAuthTag()]).toString("base64url");
}

/** Lo que hace la app en Kotlin; aquí solo para los tests. */
export function descifrarEnApp(c: string, k: string): string {
  const datos = Buffer.from(c, "base64url");
  const descifrador = createDecipheriv("aes-256-gcm", Buffer.from(k, "base64url"), datos.subarray(0, 12));
  descifrador.setAuthTag(datos.subarray(datos.length - 16));
  return Buffer.concat([descifrador.update(datos.subarray(12, datos.length - 16)), descifrador.final()]).toString("utf8");
}
