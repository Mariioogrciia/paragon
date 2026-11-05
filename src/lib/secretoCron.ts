import { createHash, timingSafeEqual } from "node:crypto";

/**
 * ¿La petición trae `Authorization: Bearer <CRON_SECRET>`? En tiempo
 * constante (auditoría, 5 nov 2026): con `!==` cada carácter acertado
 * tarda un poco más en fallar, y en teoría se puede adivinar el secreto
 * midiendo. Se comparan los SHA-256 para que las longitudes siempre cuadren.
 */
export function traeSecretoCron(cabecera: string | null, secreto: string): boolean {
  if (!cabecera) return false;
  const a = createHash("sha256").update(cabecera).digest();
  const b = createHash("sha256").update(`Bearer ${secreto}`).digest();
  return timingSafeEqual(a, b);
}
