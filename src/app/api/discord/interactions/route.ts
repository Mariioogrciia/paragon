import { NextResponse } from "next/server";
import nacl from "tweetnacl";
import { usuarioParagonDeDiscord, setAnnounceChannel, anadirNotaJuego } from "@/lib/discordBot";
import { getLibrary, getGameDetail, getProfileByUserId } from "@/lib/profiles";
import { platinosAlAlcance, salonDeLaVerguenza } from "@/lib/backlog";
import { sugerirPorTiempo } from "@/lib/recomendadorTiempo";
import { summarise } from "@/lib/stats";
import { getParagonLevel } from "@/lib/paragonLevel";
import { rachas } from "@/lib/history";
import { hitosHistoricos } from "@/lib/profileStats";
import { calcularTrophyDna, CATEGORIAS_GENERO, type CategoriaDna } from "@/lib/trophyDna";
import { dificultadDeJuego } from "@/lib/difficulty";
import { dominioPublico } from "@/lib/site";
import type { Game } from "@/lib/types";

/**
 * Endpoint de "Interactions" del bot de Discord — comandos de barra
 * (`/platinosalalcance`, `/hoy`, `/perfil`, `/verguenza`, `/racha`).
 * Configúralo en el Developer Portal → tu aplicación → General Information
 * → "Interactions Endpoint URL" = https://tu-dominio/api/discord/interactions.
 * Discord manda un PING de prueba a esa URL nada más guardarla; si no
 * responde bien, ni deja guardar el campo.
 *
 * Nada de gateway ni conexión persistente: los comandos de barra son HTTP
 * puro, encajan tal cual en una ruta serverless — mismo modelo que ya usa
 * el resto de la app.
 */

// Tipos mínimos de la petición de Discord — solo los campos que se usan,
// no el esquema entero de su API.
interface DiscordInteraction {
  type: number;
  guild_id?: string;
  channel_id?: string;
  member?: { user?: { id: string } };
  user?: { id: string };
  data?: {
    name: string;
    options?: { name: string; value: string | number }[];
  };
}

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 } as const;
const ResponseType = { PONG: 1, CHANNEL_MESSAGE_WITH_SOURCE: 4 } as const;

const SIN_VINCULAR = "Tu cuenta de Discord no está vinculada a ninguna cuenta de Paragon — inicia sesión en Paragon con este mismo Discord primero.";

/** Mensaje público — lo ve todo el canal. Solo para /perfil: presumir de estadísticas SÍ tiene sentido delante de los demás, a diferencia del backlog o la vergüenza de cada uno. */
function mensajePublico(contenido: string) {
  return NextResponse.json({ type: ResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: contenido } });
}

/** Mensaje efímero (solo lo ve quien escribió el comando) — no tiene sentido spamear el canal con el backlog de otra persona. */
function mensaje(contenido: string) {
  return NextResponse.json({
    type: ResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: contenido, flags: 1 << 6 /* EPHEMERAL */ },
  });
}

/** Quita acentos/símbolos para comparar títulos escritos a mano ("elden ring" debe encontrar "Elden Ring"). */
function normalizarTitulo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Coincidencia exacta si la hay; si no, la primera que CONTENGA lo escrito — así "spider-man" encuentra "Marvel's Spider-Man 2" sin tener que escribir el título completo. */
function encontrarJuegoPorTitulo(games: Game[], busqueda: string): Game | null {
  const q = normalizarTitulo(busqueda);
  if (!q) return null;
  const exacto = games.find((g) => normalizarTitulo(g.title) === q);
  if (exacto) return exacto;
  return games.find((g) => normalizarTitulo(g.title).includes(q)) ?? null;
}

async function comandoJuego(discordUserId: string, busqueda: string) {
  const userId = await usuarioParagonDeDiscord(discordUserId);
  if (!userId) return mensaje(SIN_VINCULAR);

  const profile = await getProfileByUserId(userId);
  if (!profile) return mensaje("No encuentro tu perfil de Paragon.");

  const { games } = await getLibrary(profile);
  const encontrado = encontrarJuegoPorTitulo(games, busqueda);
  if (!encontrado) return mensaje(`No encuentro "${busqueda}" en tu biblioteca de Paragon — comprueba el nombre exacto.`);

  const detalle = await getGameDetail(profile, encontrado.id);
  if (!detalle) return mensaje("No he podido cargar la ficha de ese juego ahora mismo.");

  const dificultad = dificultadDeJuego(detalle.trophies);
  const perdibles = detalle.trophies.filter((t) => t.isMissable).length;
  const conseguidos = detalle.trophies.filter((t) => t.earned).length;

  const lineas = [`**${detalle.title}**`];
  if (detalle.hltb?.completionist) {
    lineas.push(`⏱️ Platino/completista: ~${detalle.hltb.completionist}h (HowLongToBeat)`);
  }
  if (dificultad) {
    lineas.push(`🎯 Dificultad estimada: ${dificultad.nivel}/10 — ${dificultad.etiqueta} (${dificultad.rareza.toFixed(1)}% de la comunidad lo tiene)`);
  }
  lineas.push(perdibles > 0 ? `⚠️ ${perdibles} trofeo${perdibles === 1 ? "" : "s"} perdible${perdibles === 1 ? "" : "s"} — cuidado con el orden` : "✅ Sin trofeos perdibles conocidos");
  lineas.push(`🏆 Llevas ${conseguidos}/${detalle.trophies.length} (${detalle.progressPercent ?? 0}%)`);
  lineas.push(`🔗 ${dominioPublico()}/u/${profile.handle}/${detalle.id}`);

  return mensaje(lineas.join("\n"));
}

async function comandoNota(discordUserId: string, busqueda: string, texto: string) {
  const userId = await usuarioParagonDeDiscord(discordUserId);
  if (!userId) return mensaje(SIN_VINCULAR);

  const profile = await getProfileByUserId(userId);
  if (!profile) return mensaje("No encuentro tu perfil de Paragon.");

  const { games } = await getLibrary(profile);
  const encontrado = encontrarJuegoPorTitulo(games, busqueda);
  if (!encontrado) return mensaje(`No encuentro "${busqueda}" en tu biblioteca de Paragon — comprueba el nombre exacto.`);

  await anadirNotaJuego(userId, encontrado.id, texto);
  return mensaje(`📝 Nota guardada en **${encontrado.title}**.`);
}

async function comandoRuleta(discordUserId: string, minutos: number, genero?: CategoriaDna) {
  const userId = await usuarioParagonDeDiscord(discordUserId);
  if (!userId) return mensaje(SIN_VINCULAR);

  const profile = await getProfileByUserId(userId);
  if (!profile) return mensaje("No encuentro tu perfil de Paragon.");

  const { games } = await getLibrary(profile);
  const { victoriasRapidas, paraProfundizar } = sugerirPorTiempo(games, minutos / 60, genero);
  const pool = [...victoriasRapidas, ...paraProfundizar];

  if (pool.length === 0) {
    return mensaje(
      genero
        ? "Nada de ese tipo que encaje ahora mismo — prueba con otro género o sin filtro."
        : "Nada que encaje ahora mismo con ese tiempo — prueba a poner horas de HLTB en más juegos empezados desde la ficha de cada uno.",
    );
  }

  const elegido = pool[Math.floor(Math.random() * pool.length)];
  return mensaje(`🎲 **${elegido.titulo}** — ${elegido.motivo}`);
}

async function comandoPlatinosAlAlcance(discordUserId: string) {
  const userId = await usuarioParagonDeDiscord(discordUserId);
  if (!userId) return mensaje(SIN_VINCULAR);

  const profile = await getProfileByUserId(userId);
  if (!profile) return mensaje("No encuentro tu perfil de Paragon.");

  const { games } = await getLibrary(profile);
  const juegos = platinosAlAlcance(games).slice(0, 5);
  if (juegos.length === 0) return mensaje("Nada al alcance ahora mismo — o lo tienes todo muy verde, o ya no te queda nada por rescatar. 👏");

  const lineas = juegos.map((g) => `🏆 **${g.titulo}** — ${g.progressPercent}%, te ${g.trofeosRestantes === 1 ? "falta" : "faltan"} ${g.trofeosRestantes}`);
  return mensaje(`**Platinos al alcance:**\n${lineas.join("\n")}`);
}

async function comandoHoy(discordUserId: string, minutos: number, genero?: CategoriaDna) {
  const userId = await usuarioParagonDeDiscord(discordUserId);
  if (!userId) return mensaje(SIN_VINCULAR);

  const profile = await getProfileByUserId(userId);
  if (!profile) return mensaje("No encuentro tu perfil de Paragon.");

  const { games } = await getLibrary(profile);
  const { victoriasRapidas, paraProfundizar } = sugerirPorTiempo(games, minutos / 60, genero);

  if (victoriasRapidas.length === 0 && paraProfundizar.length === 0) {
    return mensaje(
      genero
        ? "Nada de ese tipo que encaje ahora mismo — prueba con otro género o sin filtro."
        : "Nada que encaje ahora mismo con ese tiempo — prueba a poner horas de HLTB en más juegos empezados desde la ficha de cada uno.",
    );
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

async function comandoPerfil(discordUserId: string, discordUserIdObjetivo: string | null) {
  const userIdPropio = await usuarioParagonDeDiscord(discordUserId);
  if (!userIdPropio) return mensaje(SIN_VINCULAR);

  // Sin usuario dado, tus propias estadísticas. Con uno dado, las suyas —
  // siempre que también tenga Discord vinculado a Paragon; no hay forma de
  // enseñar el perfil de alguien que no ha iniciado sesión aquí nunca.
  const userId = discordUserIdObjetivo ? await usuarioParagonDeDiscord(discordUserIdObjetivo) : userIdPropio;
  if (!userId) return mensaje("Esa persona no tiene su Discord vinculado a ninguna cuenta de Paragon.");

  const profile = await getProfileByUserId(userId);
  if (!profile) return mensaje("No encuentro ese perfil de Paragon.");

  const [{ games }, nivel, racha, hitos] = await Promise.all([
    getLibrary(profile),
    getParagonLevel(userId),
    rachas(userId),
    hitosHistoricos(userId),
  ]);
  const resumen = summarise(games);
  const dna = calcularTrophyDna(games);

  const lineas = [
    `**${profile.displayName ?? profile.handle ?? "Perfil"}** (@${profile.handle ?? "?"})`,
    `🏆 ${resumen.platinos} platinos · 🎮 ${resumen.juegos} juegos · 🧩 ${resumen.trofeos.toLocaleString("es-ES")} trofeos`,
    `⭐ Nivel Paragon ${nivel.level} (${nivel.progreso}% hasta el ${nivel.siguienteNivel})`,
  ];
  if (dna.arquetipo) lineas.push(`🧬 ${dna.arquetipo}`);
  if (racha.actual > 0) lineas.push(`🔥 Racha activa: ${racha.actual} ${racha.actual === 1 ? "día" : "días"} (mejor: ${racha.mejor})`);
  if (hitos.primerPlatino) lineas.push(`🥇 Primer platino: ${hitos.primerPlatino.titulo}`);
  if (hitos.trofeoMasRaro) lineas.push(`💎 Trofeo más raro: ${hitos.trofeoMasRaro.nombre} (${hitos.trofeoMasRaro.rarityPercent.toFixed(1)}%)`);

  return mensajePublico(lineas.join("\n"));
}

function comandoHelp() {
  return mensaje(
    [
      "**Comandos del bot de Paragon**",
      "🏆 `/platinosalalcance` — juegos muy avanzados que llevan meses parados.",
      "🎮 `/hoy [minutos] [genero]` — qué puedes cerrar hoy según el tiempo (y el tipo, si quieres).",
      "👤 `/perfil [usuario]` — tus estadísticas de Paragon, o las de un amigo con Discord vinculado.",
      "😳 `/verguenza` — juegos en tu biblioteca sin ni una hora, sin ni un trofeo.",
      "🔥 `/racha` — tu racha actual de días seguidos ganando al menos un trofeo.",
      "🎮 `/juego <título>` — ficha rápida: duración HLTB, dificultad, perdibles y tu progreso.",
      "📝 `/nota <título> <texto>` — apunta una nota privada en un juego sin abrir la web.",
      "🎲 `/ruleta [minutos] [genero]` — te elige UN juego que encaje con el tiempo que tienes.",
      "📣 `/anunciosaqui` — (solo quien gestione el servidor) anuncia aquí cuando alguien suba de nivel.",
      "",
      "Para que cualquiera de estos funcione, tu cuenta de Discord tiene que estar vinculada a una cuenta de Paragon — inicia sesión en Paragon con este mismo Discord.",
    ].join("\n"),
  );
}

async function comandoAnunciosAqui(guildId: string | null, channelId: string | null, discordUserId: string) {
  if (!guildId || !channelId) return mensaje("Esto solo funciona dentro de un servidor, no por DM.");
  await setAnnounceChannel(guildId, channelId, discordUserId);
  return mensaje(`Hecho — a partir de ahora anuncio aquí los niveles Paragon que suba la gente de este servidor (solo a quien tenga los avisos de Discord activados en Paragon).`);
}

async function comandoVerguenza(discordUserId: string) {
  const userId = await usuarioParagonDeDiscord(discordUserId);
  if (!userId) return mensaje(SIN_VINCULAR);

  const profile = await getProfileByUserId(userId);
  if (!profile) return mensaje("No encuentro tu perfil de Paragon.");

  const { games } = await getLibrary(profile);
  const juegos = salonDeLaVerguenza(games);
  if (juegos.length === 0) return mensaje("Nada aquí — todo lo que tienes lo has tocado al menos una vez. 👏");

  const lineas = juegos.slice(0, 10).map((g) => `😳 ${g.titulo}`);
  const resto = juegos.length > 10 ? `\n… y ${juegos.length - 10} más` : "";
  return mensaje(`**El Salón de la Vergüenza** (${juegos.length}):\n${lineas.join("\n")}${resto}`);
}

async function comandoRacha(discordUserId: string) {
  const userId = await usuarioParagonDeDiscord(discordUserId);
  if (!userId) return mensaje(SIN_VINCULAR);

  const r = await rachas(userId);
  if (r.actual === 0) return mensaje("No tienes ninguna racha activa ahora mismo — gana un trofeo hoy para empezar una.");
  return mensaje(`🔥 Llevas **${r.actual} ${r.actual === 1 ? "día" : "días"}** seguidos ganando al menos un trofeo. Tu mejor racha de siempre: ${r.mejor}.`);
}

/** Snowflake de Discord de la mención en la opción "usuario" de /perfil — `null` si no se puso ninguna. */
function usuarioMencionado(interaction: DiscordInteraction): string | null {
  const valor = interaction.data?.options?.find((o) => o.name === "usuario")?.value;
  return typeof valor === "string" ? valor : null;
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
      switch (interaction.data.name) {
        case "platinosalalcance":
          return await comandoPlatinosAlAlcance(discordUserId);
        case "hoy": {
          const minutos = interaction.data.options?.find((o) => o.name === "minutos")?.value;
          const generoOpt = interaction.data.options?.find((o) => o.name === "genero")?.value;
          const genero = typeof generoOpt === "string" && CATEGORIAS_GENERO.some((c) => c.key === generoOpt) ? (generoOpt as CategoriaDna) : undefined;
          return await comandoHoy(discordUserId, typeof minutos === "number" ? minutos : 60, genero);
        }
        case "perfil":
          return await comandoPerfil(discordUserId, usuarioMencionado(interaction));
        case "verguenza":
          return await comandoVerguenza(discordUserId);
        case "racha":
          return await comandoRacha(discordUserId);
        case "juego": {
          const titulo = interaction.data.options?.find((o) => o.name === "titulo")?.value;
          if (typeof titulo !== "string" || !titulo.trim()) return mensaje("Dime qué juego — por ejemplo `/juego Elden Ring`.");
          return await comandoJuego(discordUserId, titulo);
        }
        case "nota": {
          const titulo = interaction.data.options?.find((o) => o.name === "titulo")?.value;
          const texto = interaction.data.options?.find((o) => o.name === "texto")?.value;
          if (typeof titulo !== "string" || !titulo.trim() || typeof texto !== "string" || !texto.trim()) {
            return mensaje("Hace falta el título del juego y el texto de la nota.");
          }
          return await comandoNota(discordUserId, titulo, texto);
        }
        case "ruleta": {
          const minutos = interaction.data.options?.find((o) => o.name === "minutos")?.value;
          const generoOpt = interaction.data.options?.find((o) => o.name === "genero")?.value;
          const genero = typeof generoOpt === "string" && CATEGORIAS_GENERO.some((c) => c.key === generoOpt) ? (generoOpt as CategoriaDna) : undefined;
          return await comandoRuleta(discordUserId, typeof minutos === "number" ? minutos : 60, genero);
        }
        case "anunciosaqui":
          return await comandoAnunciosAqui(interaction.guild_id ?? null, interaction.channel_id ?? null, discordUserId);
        case "help":
          return comandoHelp();
      }
    } catch (error) {
      console.error("[discord-interactions]", interaction.data.name, error);
      return mensaje("Algo falló consultando tu biblioteca — inténtalo de nuevo en un momento.");
    }
  }

  return NextResponse.json({ error: "Comando no reconocido." }, { status: 400 });
}
