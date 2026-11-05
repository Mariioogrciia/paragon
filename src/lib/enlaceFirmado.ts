import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Enlaces privados sin tabla nueva: `<userId en base64url>.<firma>`, con la
 * firma HMAC-SHA256 del userId y un propósito ("calendario", "baja-correo"…)
 * usando `AUTH_SECRET`. Sirve para lo que se pega en otra app y tiene que
 * funcionar sin sesión (una suscripción de calendario, un enlace para darse
 * de baja de un correo), sin que nadie pueda fabricar el de otra persona.
 *
 * No caduca ni se puede revocar uno solo: cambiar `AUTH_SECRET` los anula
 * todos (y cierra todas las sesiones). Para lo que exponen (fechas de tu
 * calendario, una baja) es suficiente; no usar para nada que escriba datos
 * importantes.
 */

function clave(): string {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto) throw new Error("Falta AUTH_SECRET para firmar enlaces.");
  return secreto;
}

function firma(proposito: string, userId: string): string {
  return createHmac("sha256", clave()).update(`${proposito}:${userId}`).digest("base64url").slice(0, 32);
}

export function firmarEnlace(proposito: string, userId: string): string {
  return `${Buffer.from(userId, "utf8").toString("base64url")}.${firma(proposito, userId)}`;
}

/** El userId si la firma es buena; `null` si no. */
export function verificarEnlace(proposito: string, token: string): string | null {
  const [parteId, parteFirma] = token.split(".");
  if (!parteId || !parteFirma) return null;
  let userId: string;
  try {
    userId = Buffer.from(parteId, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!userId) return null;
  const esperada = Buffer.from(firma(proposito, userId));
  const recibida = Buffer.from(parteFirma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
  return userId;
}
