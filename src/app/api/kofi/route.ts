import { createHash, timingSafeEqual } from "node:crypto";
import { leerPagoKofi } from "@/lib/apoyoReglas";
import { registrarPago } from "@/lib/apoyo";
import { registrar } from "@/lib/registro";

/**
 * Webhook de Ko-fi (lib/apoyo.ts). Ko-fi manda un formulario con `data`
 * (JSON) y lo reintenta si no recibe un 200: por eso un pago repetido se
 * ignora en silencio (mismo `kofi_transaction_id`) y se contesta 200.
 */
function mismoToken(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export async function POST(request: Request) {
  const esperado = process.env.KOFI_VERIFICATION_TOKEN;
  if (!esperado) return new Response("Ko-fi no está configurado.", { status: 503 });

  const formulario = await request.formData().catch(() => null);
  const pago = leerPagoKofi(typeof formulario?.get("data") === "string" ? (formulario!.get("data") as string) : null);
  if (!pago) return new Response("Datos no válidos.", { status: 400 });
  if (!mismoToken(pago.tokenVerificacion, esperado)) return new Response("No autorizado.", { status: 401 });

  const { nuevo, userId } = await registrarPago(pago);
  if (nuevo) {
    await registrar("info", "admin", `Apoyo de Ko-fi (${pago.tipo}, ${pago.importe} ${pago.moneda})${userId ? "" : " sin cuenta asociada"}`, { transaccion: pago.id });
  }
  return new Response(null, { status: 200 });
}
