/**
 * Reglas puras de Paragon+ (lib/apoyo.ts): `tests/apoyo.test.ts`.
 */

/** Cuánto dura cada pago: un mes y un día de margen para que una suscripción mensual no se corte un día. */
export const DIAS_POR_APOYO = 31;

export function apoyoVigente(ultimoPago: Date | null, ahora = new Date()): boolean {
  if (!ultimoPago) return false;
  return ahora.getTime() - ultimoPago.getTime() < DIAS_POR_APOYO * 86_400_000;
}

/** El @ que alguien escribe en el mensaje de Ko-fi («para @mario»), en minúsculas. */
export function handleDelMensaje(mensaje: string | null | undefined): string | null {
  const m = /@([a-z0-9_]{3,20})\b/i.exec(mensaje ?? "");
  return m ? m[1].toLowerCase() : null;
}

export interface PagoKofi {
  id: string;
  email: string | null;
  nombre: string | null;
  mensaje: string | null;
  tipo: string;
  importe: string;
  moneda: string;
  suscripcion: boolean;
  publico: boolean;
  tokenVerificacion: string;
}

/** El cuerpo de Ko-fi es un formulario con un campo `data` que lleva un JSON. `null` si no es un pago. */
export function leerPagoKofi(data: string | null): PagoKofi | null {
  if (!data) return null;
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(data);
  } catch {
    return null;
  }
  const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const id = texto(j.kofi_transaction_id);
  const tipo = texto(j.type);
  const token = texto(j.verification_token);
  if (!id || !tipo || !token) return null;
  return {
    id,
    email: texto(j.email)?.toLowerCase() ?? null,
    nombre: texto(j.from_name),
    mensaje: texto(j.message),
    tipo,
    importe: texto(j.amount) ?? "0",
    moneda: texto(j.currency) ?? "EUR",
    suscripcion: j.is_subscription_payment === true,
    publico: j.is_public !== false,
    tokenVerificacion: token,
  };
}
