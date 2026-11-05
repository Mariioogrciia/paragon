import { createHash } from "node:crypto";
import { cifrarParaApp, descifrarEnApp } from "@/lib/enlaceMovil";

/**
 * Cifrar en reposo los tokens de terceros que guardamos (Linked Roles de
 * Discord y otros): AES-256-GCM, el mismo formato que lib/enlaceMovil.ts,
 * con una clave derivada de `AUTH_SECRET` y un propósito, para que un
 * volcado de la base no dé tokens usables.
 */
function claveDe(proposito: string): string {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto) throw new Error("Falta AUTH_SECRET para cifrar.");
  return createHash("sha256").update(`paragon:${proposito}:${secreto}`).digest("base64url");
}

export function cifrar(proposito: string, texto: string): string {
  return cifrarParaApp(texto, claveDe(proposito));
}

/** `null` si no descifra (otro `AUTH_SECRET`, dato roto). */
export function descifrar(proposito: string, cifrado: string): string | null {
  try {
    return descifrarEnApp(cifrado, claveDe(proposito));
  } catch {
    return null;
  }
}
