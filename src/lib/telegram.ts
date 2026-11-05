import "server-only";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { telegramChats, users } from "@/db/schema";
import { traducirAviso } from "@/lib/avisosTraduccion";
import { idiomaDeUsuario } from "@/lib/idiomaUsuario";
import { dominioPublico } from "@/lib/site";
import { escaparTelegram } from "@/lib/telegramTextos";

/**
 * Bot de Telegram (5 nov 2026): los mismos avisos que el DM de Discord
 * (trofeos, platinos, ligas…) para quien usa Telegram, y unos comandos
 * (/perfil, /racha). Webhook puro (/api/telegram), sin proceso encendido.
 *
 * Montaje: @BotFather → /newbot; el token en `TELEGRAM_BOT_TOKEN`, el
 * nombre del bot (sin @) en `TELEGRAM_BOT_USERNAME` y un secreto cualquiera
 * en `TELEGRAM_WEBHOOK_SECRET`. Luego `npx tsx scripts/registrar-webhook-telegram.mts`.
 */

const tablaFalta = (error: unknown) => (error as { cause?: { code?: string } })?.cause?.code === "42P01";

export function telegramActivo(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME);
}

export async function estadoTelegram(userId: string): Promise<{ vinculado: boolean; enlace: string | null }> {
  if (!telegramActivo()) return { vinculado: false, enlace: null };
  try {
    const [fila] = await db.select().from(telegramChats).where(eq(telegramChats.userId, userId)).limit(1);
    if (fila?.chatId) return { vinculado: true, enlace: null };
    // Telegram deja 64 caracteres en `start`: un código aleatorio, no un enlace firmado.
    const codigo = fila?.codigo ?? randomBytes(18).toString("base64url");
    if (!fila) await db.insert(telegramChats).values({ userId, codigo }).onConflictDoNothing();
    return { vinculado: false, enlace: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${codigo}` };
  } catch (error) {
    if (tablaFalta(error)) return { vinculado: false, enlace: null };
    throw error;
  }
}

/** `/start <codigo>`: conecta este chat con la cuenta del código. Devuelve el nombre, o `null` si no vale. */
export async function vincularChat(codigo: string, chatId: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(codigo)) return null;
  // Un chat solo puede ser de una cuenta: si ya lo era de otra, deja de serlo.
  await db.delete(telegramChats).where(eq(telegramChats.chatId, chatId));
  const [fila] = await db
    .update(telegramChats)
    .set({ chatId, codigo: null, vinculadoAt: new Date() })
    .where(eq(telegramChats.codigo, codigo))
    .returning({ userId: telegramChats.userId });
  if (!fila) return null;
  const [u] = await db.select({ name: users.name, handle: users.handle }).from(users).where(eq(users.id, fila.userId)).limit(1);
  return u?.name ?? (u?.handle ? `@${u.handle}` : "Paragon");
}

export async function usuarioDeChat(chatId: string): Promise<string | null> {
  const [fila] = await db.select({ userId: telegramChats.userId }).from(telegramChats).where(eq(telegramChats.chatId, chatId)).limit(1);
  return fila?.userId ?? null;
}

export async function desvincularChat(chatId: string): Promise<void> {
  await db.delete(telegramChats).where(eq(telegramChats.chatId, chatId));
}

export async function desvincularTelegram(userId: string): Promise<void> {
  await db.delete(telegramChats).where(eq(telegramChats.userId, userId));
}

export async function mandarMensaje(chatId: string, html: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10_000),
  });
  // 403: la persona bloqueó el bot. Se olvida el chat para no insistir.
  if (res.status === 403) await desvincularChat(chatId);
  return res.ok;
}

/** Para lib/avisos.ts: el aviso por Telegram si la persona lo conectó. Nunca lanza. */
export async function enviarTelegramSiVinculado(userId: string, aviso: { titulo: string; texto: string; ruta?: string }): Promise<void> {
  if (!telegramActivo()) return;
  try {
    const [fila] = await db.select({ chatId: telegramChats.chatId }).from(telegramChats).where(eq(telegramChats.userId, userId)).limit(1);
    if (!fila?.chatId) return;
    const idioma = await idiomaDeUsuario(userId);
    const cuerpo = traducirAviso(aviso.texto, idioma)
      .split("\n")
      .map((l) => escaparTelegram(l).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"))
      .join("\n");
    const enlace = aviso.ruta ? `\n${dominioPublico()}${aviso.ruta}` : "";
    await mandarMensaje(fila.chatId, `<b>${escaparTelegram(traducirAviso(aviso.titulo, idioma))}</b>\n${cuerpo}${enlace}`);
  } catch (error) {
    if (!tablaFalta(error)) console.error("[telegram] aviso", error);
  }
}
