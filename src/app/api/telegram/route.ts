import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { desvincularChat, usuarioDeChat, vincularChat } from "@/lib/telegram";
import { escaparTelegram, leerComando, textosTelegram } from "@/lib/telegramTextos";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { getParagonLevel } from "@/lib/paragonLevel";
import { rachas } from "@/lib/history";
import { summarise } from "@/lib/stats";
import { dominioPublico } from "@/lib/site";

/**
 * Webhook del bot de Telegram (lib/telegram.ts). Se contesta en la propia
 * respuesta del webhook (`method: "sendMessage"`), que Telegram ejecuta:
 * sin llamada aparte a su API. Telegram firma cada envío con la cabecera
 * `X-Telegram-Bot-Api-Secret-Token` (el secreto que se le dio al registrar
 * el webhook).
 */
export const maxDuration = 20;

interface Update {
  message?: { chat?: { id?: number; type?: string }; text?: string; from?: { language_code?: string } };
}

function mismo(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export async function POST(request: Request) {
  const secreto = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secreto) return new Response("Telegram no está configurado.", { status: 503 });
  if (!mismo(request.headers.get("x-telegram-bot-api-secret-token") ?? "", secreto)) return new Response("No autorizado.", { status: 401 });

  const update = (await request.json().catch(() => null)) as Update | null;
  const chat = update?.message?.chat;
  // Solo chats privados: en un grupo, los avisos de alguien los leería todo el grupo.
  if (!chat?.id || chat.type !== "private") return NextResponse.json({});
  const chatId = String(chat.id);
  const t = textosTelegram(update?.message?.from?.language_code);
  const responder = (texto: string) => NextResponse.json({ method: "sendMessage", chat_id: chat.id, text: texto, parse_mode: "HTML", disable_web_page_preview: true });

  const orden = leerComando(update?.message?.text);
  if (!orden) return responder(t.ayuda);

  if (orden.comando === "start") {
    if (!orden.argumento) return responder(t.bienvenida);
    const nombre = await vincularChat(orden.argumento, chatId);
    return responder(nombre ? `${t.vinculado(escaparTelegram(nombre))}\n\n${t.ayuda}` : t.codigoMalo);
  }
  if (orden.comando === "ayuda" || orden.comando === "help") return responder(t.ayuda);

  const userId = await usuarioDeChat(chatId);
  if (!userId) return responder(t.sinVincular);

  if (orden.comando === "salir" || orden.comando === "stop") {
    await desvincularChat(chatId);
    return responder(t.desvinculado);
  }
  if (orden.comando === "racha") {
    const r = await rachas(userId);
    return responder(r.actual > 0 ? t.racha(r.actual, r.mejor) : t.sinRacha);
  }
  if (orden.comando === "perfil") {
    const profile = await getProfileByUserId(userId);
    if (!profile) return responder(t.sinVincular);
    const [{ games }, nivel] = await Promise.all([getLibrary(profile), getParagonLevel(userId)]);
    const r = summarise(games);
    return responder(
      t.perfil({
        nombre: escaparTelegram(profile.displayName ?? (profile.handle ? `@${profile.handle}` : "Paragon")),
        nivel: nivel.level,
        platinos: r.platinos,
        trofeos: r.trofeos,
        juegos: r.juegos,
        enlace: profile.handle ? `${dominioPublico()}/u/${profile.handle}` : dominioPublico(),
      }),
    );
  }
  return responder(t.desconocido);
}
