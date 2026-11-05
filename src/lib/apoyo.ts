import "server-only";
import { cache } from "react";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { apoyos, users } from "@/db/schema";
import { avisarUsuario } from "@/lib/avisos";
import { handleDe, olvidarPerfilPublico } from "@/lib/profiles";
import { apoyoVigente, handleDelMensaje, type PagoKofi } from "@/lib/apoyoReglas";

/**
 * Paragon+ (5 nov 2026): apoyar el proyecto por Ko-fi. Da una insignia en el
 * perfil y la satisfacción de mantener Paragon sin anuncios; no quita nada a
 * nadie (todo lo que había sigue siendo gratis).
 *
 * Montaje: Ko-fi → Settings → API → Webhook URL =
 * `https://www.paragontrophies.com/api/kofi`, y su "Verification Token" en
 * Vercel como `KOFI_VERIFICATION_TOKEN`. El enlace de la página de Ko-fi va
 * en `NEXT_PUBLIC_KOFI_URL`. Ojo: con ingresos, Vercel Hobby deja de valer
 * (uso no comercial) y hace falta el aviso legal de la LSSI (docs/HANDOFF.md).
 */

const tablaFalta = (error: unknown) => (error as { cause?: { code?: string } })?.cause?.code === "42P01";

export const esApoyo = cache(async (userId: string): Promise<boolean> => {
  try {
    const [fila] = await db
      .select({ at: apoyos.recibidoAt })
      .from(apoyos)
      .where(eq(apoyos.userId, userId))
      .orderBy(desc(apoyos.recibidoAt))
      .limit(1);
    return apoyoVigente(fila?.at ?? null);
  } catch (error) {
    if (tablaFalta(error)) return false;
    throw error;
  }
});

/** Guarda un pago (una vez por transacción) y avisa a su dueño si se encuentra. */
export async function registrarPago(pago: PagoKofi): Promise<{ nuevo: boolean; userId: string | null }> {
  const handle = handleDelMensaje(pago.mensaje);
  const [porCorreo] = pago.email
    ? await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${pago.email}`).limit(1)
    : [];
  const [porHandle] = !porCorreo && handle ? await db.select({ id: users.id }).from(users).where(eq(users.handle, handle)).limit(1) : [];
  const userId = porCorreo?.id ?? porHandle?.id ?? null;

  const insertadas = await db
    .insert(apoyos)
    .values({ id: pago.id, userId, email: pago.email, nombre: pago.nombre, tipo: pago.tipo, importe: pago.importe, moneda: pago.moneda, suscripcion: pago.suscripcion })
    .onConflictDoNothing()
    .returning({ id: apoyos.id });

  if (insertadas.length > 0 && userId) {
    // La copia pública del perfil (CDN) tiene que rehacerse para enseñar la insignia.
    // Que falle la caché no puede dejar sin el aviso a quien acaba de pagar.
    try {
      olvidarPerfilPublico(await handleDe(userId));
    } catch (error) {
      console.error("[apoyo] revalidar perfil", error);
    }
    await avisarUsuario(userId, { titulo: "💜 ¡Gracias por apoyar Paragon!", texto: "Ya tienes Paragon+ en tu perfil durante un mes.", ruta: "/apoyar" });
  }
  return { nuevo: insertadas.length > 0, userId };
}
