import { NextResponse } from "next/server";
import nacl from "tweetnacl";
import { usuarioParagonDeDiscord } from "@/lib/discordBot";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { platinosAlAlcance } from "@/lib/backlog";
import { sugerirPorTiempo } from "@/lib/recomendadorTiempo";

/**
 * Endpoint de "Interactions" del bot de Discord — comandos de barra
 * (`/platinosalalcance`, `/quejuegohoy`). Configúralo en el Developer
 * Portal → tu aplicación → General Information → "Interactions Endpoint
 * URL" = https://tu-dominio/api/discord/interactions. Discord manda un
 * PING de prueba a esa URL nada más guardarla; si no responde bien, ni
 * deja guardar el campo.
 *
 * Nada de gateway ni conexión persistente: los comandos de barra son HTTP
 * puro, encajan tal cual en una ruta serverless — mismo modelo que ya usa
 * el resto de la app.
 */

// Tipos mínimos de la petición de Discord — solo los campos que se usan,
// no el esquema entero de su API.
interface DiscordInteraction {
  type: number;
  member?: { user?: { id: string } };
  user?: { id: string };
  data?: {
    name: string;
    options?: { name: string; value: number }[];
  };
}

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 } as const;
const ResponseType = { PONG: 1, CHANNEL_MESSAGE_WITH_SOURCE: 4 } as const;

/** Mensaje efímero (solo lo ve quien escribió el comando) — no tiene sentido spamear el canal con el backlog de otra persona. */
function mensaje(contenido: string) {
  return NextResponse.json({
    type: ResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: contenido, flags: 1 << 6 /* EPHEMERAL */ },
  });
}

async function comandoPlatinosAlAlcance(discordUserId: string) {
  const userId = await usuarioParagonDeDiscord(discordUserId);
  if (!userId) return mensaje("Tu cuenta de Discord no está vinculada a ninguna cuenta de Paragon — inicia sesión en Paragon con este mismo Discord primero.");

  const profile = await getProfileByUserId(userId);
  if (!profile) return mensaje("No encuentro tu perfil de Paragon.");

  const { games } = await getLibrary(profile);
  const juegos = platinosAlAlcance(games).slice(0, 5);
  if (juegos.length === 0) return mensaje("Nada al alcance ahora mismo — o lo tienes todo muy verde, o ya no te queda nada por rescatar. 👏");

  const lineas = juegos.map((g) => `🏆 **${g.titulo}** — ${g.progressPercent}%, te ${g.trofeosRestantes === 1 ? "falta" : "faltan"} ${g.trofeosRestantes}`);
  return mensaje(`**Platinos al alcance:**\n${lineas.join("\n")}`);
}

async function comandoQueJuegoHoy(discordUserId: string, minutos: number) {
  const userId = await usuarioParagonDeDiscord(discordUserId);
  if (!userId) return mensaje("Tu cuenta de Discord no está vinculada a ninguna cuenta de Paragon — inicia sesión en Paragon con este mismo Discord primero.");

  const profile = await getProfileByUserId(userId);
  if (!profile) return mensaje("No encuentro tu perfil de Paragon.");

  const { games } = await getLibrary(profile);
  const { victoriasRapidas, paraProfundizar } = sugerirPorTiempo(games, minutos / 60);

  if (victoriasRapidas.length === 0 && paraProfundizar.length === 0) {
    return mensaje("Nada que encaje ahora mismo con ese tiempo — prueba a poner horas de HLTB en más juegos empezados desde la ficha de cada uno.");
  }

  const bloques: string[] = [];
  if (victoriasRapidas.length > 0) {
    bloques.push(`**Victorias rápidas:**\n${victoriasRapidas.slice(0, 4).map((s) => `• ${s.titulo} — ${s.motivo}`).join("\n")}`);
  }
  if (paraProfundizar.length > 0) {
    bloques.push(`**Para profundizar:**\n${paraProfundizar.slice(0, 4).map((s) => `• ${s.titulo} — ${s.motivo}`).join("\n")}`);
  }
  return mensaje(bloques.join("\n\n"));
}

export async function POST(request: Request) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: "Falta DISCORD_PUBLIC_KEY en el servidor." }, { status: 503 });
  }

  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  const body = await request.text();

  if (!signature || !timestamp) {
    return NextResponse.json({ error: "Faltan cabeceras de firma." }, { status: 401 });
  }

  const verificado = nacl.sign.detached.verify(
    Buffer.from(timestamp + body),
    Buffer.from(signature, "hex"),
    Buffer.from(publicKey, "hex"),
  );
  if (!verificado) {
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  const interaction = JSON.parse(body) as DiscordInteraction;

  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: ResponseType.PONG });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND && interaction.data) {
    // En un servidor el autor va en `member.user`; en un DM al bot, en `user` a secas.
    const discordUserId = interaction.member?.user?.id ?? interaction.user?.id;
    if (!discordUserId) return mensaje("No he podido saber quién eres.");

    try {
      if (interaction.data.name === "platinosalalcance") {
        return await comandoPlatinosAlAlcance(discordUserId);
      }
      if (interaction.data.name === "quejuegohoy") {
        const minutos = interaction.data.options?.find((o) => o.name === "minutos")?.value ?? 60;
        return await comandoQueJuegoHoy(discordUserId, minutos);
      }
    } catch (error) {
      console.error("[discord-interactions]", interaction.data.name, error);
      return mensaje("Algo falló consultando tu biblioteca — inténtalo de nuevo en un momento.");
    }
  }

  return NextResponse.json({ error: "Comando no reconocido." }, { status: 400 });
}
