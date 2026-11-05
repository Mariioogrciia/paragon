import "server-only";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { correoSemanal, notificationLog, users } from "@/db/schema";
import { lineasDeResumen } from "@/lib/resumenSemanal";
import { traducirAviso } from "@/lib/avisosTraduccion";
import { normalizarIdioma } from "@/lib/idiomaUsuario";
import { firmarEnlace } from "@/lib/enlaceFirmado";
import { dominioPublico } from "@/lib/site";
import { correoResumen } from "@/lib/correoPlantilla";
import { claveSemana, esMomentoDelResumen } from "@/lib/semana";

/**
 * Resumen semanal por CORREO (5 nov 2026), para quien no tiene la app ni
 * Discord. Solo con alta expresa (tabla `correo_semanal`); cada correo
 * lleva su enlace de baja (firmado, de un clic, también con
 * `List-Unsubscribe` para el botón de Gmail/Apple Mail).
 *
 * Se manda con Resend por su API HTTP (sin paquete): `RESEND_API_KEY` y
 * `CORREO_REMITENTE` ("Paragon <resumen@paragontrophies.com>", con el
 * dominio verificado en Resend). Sin ellas no se manda nada. El plan
 * gratuito da 3000 correos al mes.
 */

const TIPO = "resumen-correo";
const tablaFalta = (error: unknown) => (error as { cause?: { code?: string } })?.cause?.code === "42P01";

export function correoActivo(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.CORREO_REMITENTE);
}

export async function estaSuscrito(userId: string): Promise<boolean> {
  try {
    const [fila] = await db.select({ id: correoSemanal.userId }).from(correoSemanal).where(eq(correoSemanal.userId, userId)).limit(1);
    return Boolean(fila);
  } catch (error) {
    if (tablaFalta(error)) return false;
    throw error;
  }
}

export async function cambiarSuscripcion(userId: string, alta: boolean): Promise<void> {
  if (alta) await db.insert(correoSemanal).values({ userId }).onConflictDoNothing();
  else await db.delete(correoSemanal).where(eq(correoSemanal.userId, userId));
}

export function enlaceBaja(userId: string): string {
  return `${dominioPublico()}/api/correo/baja?t=${encodeURIComponent(firmarEnlace("baja-correo", userId))}`;
}

async function enviar(para: string, asunto: string, html: string, texto: string, baja: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CORREO_REMITENTE,
      to: [para],
      subject: asunto,
      html,
      text: texto,
      headers: { "List-Unsubscribe": `<${baja}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) console.error("[correo] Resend devolvió", res.status, await res.text());
  return res.ok;
}

/** Lo lanza el cron junto al resumen de Discord: domingos por la tarde, unos pocos por pasada. */
export async function enviarCorreosSemanales(hasta: number, ahora = new Date(), maximo = 10): Promise<number> {
  if (!correoActivo() || !esMomentoDelResumen(ahora)) return 0;
  const clave = claveSemana(ahora);
  let candidatos: { userId: string; email: string | null; name: string | null; handle: string | null; idioma: string | null }[];
  try {
    candidatos = await db
      .select({ userId: users.id, email: users.email, name: users.name, handle: users.handle, idioma: users.language })
      .from(correoSemanal)
      .innerJoin(users, eq(users.id, correoSemanal.userId))
      .where(
        and(
          isNotNull(users.email),
          sql`not exists (select 1 from ${notificationLog} n where n."userId" = ${users.id} and n.tipo = ${TIPO} and n.clave = ${clave})`,
        ),
      )
      .limit(maximo);
  } catch (error) {
    if (tablaFalta(error)) return 0;
    throw error;
  }
  if (candidatos.length === 0) return 0;

  const lineas = await lineasDeResumen(candidatos.map((c) => c.userId), ahora);
  let enviados = 0;
  for (const c of candidatos) {
    if (Date.now() > hasta) break;
    const idioma = normalizarIdioma(c.idioma);
    const baja = enlaceBaja(c.userId);
    const correo = correoResumen(
      idioma,
      c.name ?? (c.handle ? `@${c.handle}` : "cazador"),
      (lineas.get(c.userId) ?? []).map((l) => traducirAviso(l, idioma)),
      { ritmo: `${dominioPublico()}/ritmo`, baja },
    );
    await enviar(c.email!, correo.asunto, correo.html, correo.texto, baja).catch((e) => console.error("[correo]", e));
    // Apuntado aunque falle: mejor perder un resumen que repetirlo cada 10 minutos.
    await db.insert(notificationLog).values({ userId: c.userId, tipo: TIPO, clave }).onConflictDoNothing();
    enviados++;
  }
  return enviados;
}
