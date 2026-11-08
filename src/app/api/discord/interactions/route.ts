import { NextResponse, after } from "next/server";
import nacl from "tweetnacl";
import { usuarioParagonDeDiscord, setAnnounceChannel, anadirNotaJuego, type FilaBotones } from "@/lib/discordBot";
import { getLibrary, getGameDetail, getProfileByUserId, acceptFriendRequest, declineFriendRequest } from "@/lib/profiles";
import { getParagonLevels } from "@/lib/paragonLevel";
import { acceptLeagueInvite, declineLeagueInvite } from "@/lib/leagues";
import { apuntarMiembroServidor, miembrosParagonDelServidor, titulosParaAutocompletar } from "@/lib/discordServidor";
import { platinosAlAlcance, salonDeLaVerguenza } from "@/lib/backlog";
import { sugerirPorTiempo } from "@/lib/recomendadorTiempo";
import { getRetirados } from "@/lib/retirados";
import { sinRetirados } from "@/lib/retiradosReglas";
import { summarise } from "@/lib/stats";
import { getParagonLevel } from "@/lib/paragonLevel";
import { rachas } from "@/lib/history";
import { hitosHistoricos } from "@/lib/profileStats";
import { calcularTrophyDna, calcularEstiloDeCaza, CATEGORIAS_GENERO, type CategoriaDna } from "@/lib/trophyDna";
import { dificultadDeJuego } from "@/lib/difficulty";
import { dominioPublico } from "@/lib/site";
import { listUserLeagues, listPendingLeagueInvites, getLeagueDetail } from "@/lib/leagues";
import type { Game } from "@/lib/types";

/**
 * Endpoint de "Interactions" del bot de Discord — comandos de barra
 * (`/platinosalalcance`, `/hoy`, `/perfil`, `/verguenza`, `/racha`, `/juego`,
 * `/nota`, `/ruleta`, `/anunciosaqui`, `/help`). Configúralo en el Developer
 * Portal → tu aplicación → General Information → "Interactions Endpoint
 * URL" = https://tu-dominio/api/discord/interactions. Discord manda un PING
 * de prueba a esa URL nada más guardarla; si no responde bien, ni deja
 * guardarlo.
 *
 * Nada de gateway ni conexión persistente: los comandos de barra son HTTP
 * puro, encajan tal cual en una ruta serverless — mismo modelo que ya usa
 * el resto de la app.
 *
 * RESPUESTA DIFERIDA — bug real encontrado en producción (10 sept 2026,
 * "La aplicación no ha respondido" en /perfil): Discord exige una
 * respuesta a la interacción en menos de 3 segundos. Antes de este cambio
 * se calculaba TODO (varias consultas a la base, a veces un sync en vivo
 * contra PSN/Steam en `/juego`) antes de devolver nada — con un arranque
 * en frío de Vercel eso pasa de 3s fácilmente, y Discord lo enseña como
 * "no ha respondido" aunque el cálculo hubiera terminado bien un segundo
 * después. Ahora se responde SIEMPRE al momento con tipo 5 (differed) y el
 * cálculo de verdad corre en `after()` (node_modules/next/dist/docs/…
 * /after.md — funciona en Vercel de fábrica, usa su `waitUntil`), editando
 * la respuesta ya enviada vía el webhook de la propia interacción cuando
 * termina. `maxDuration` más abajo le da margen de sobra a ese trabajo.
 */
export const maxDuration = 30;

// Tipos mínimos de la petición de Discord — solo los campos que se usan,
// no el esquema entero de su API.
interface DiscordInteraction {
  type: number;
  guild_id?: string;
  channel_id?: string;
  token: string;
  member?: { user?: { id: string } };
  user?: { id: string };
  data?: {
    name: string;
    /** 1 = comando de barra, 2 = menú contextual de usuario. */
    type?: number;
    /** A quién se le hizo clic derecho (menú contextual de usuario). */
    target_id?: string;
    /** El botón pulsado (componentes). */
    custom_id?: string;
    options?: { name: string; value: string | number; focused?: boolean }[];
  };
}

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2, MESSAGE_COMPONENT: 3, AUTOCOMPLETE: 4 } as const;
const ResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  AUTOCOMPLETE_RESULT: 8,
} as const;

/** Lo que se manda a Discord: texto y, si hace falta, tarjetas (embeds) y botones. */
interface Respuesta {
  content: string;
  embeds?: Record<string, unknown>[];
  components?: FilaBotones[];
}

const COLOR_PARAGON = 0x7fbcd8;
const EPHEMERAL = 1 << 6;

const SIN_VINCULAR = "Tu cuenta de Discord no está vinculada a ninguna cuenta de Paragon — inicia sesión en Paragon con este mismo Discord primero.";

/** Solo el CONTENIDO — quién ve el mensaje (público/efímero) ya se decidió al diferir, no aquí. */
function mensaje(content: string, extra: Omit<Respuesta, "content"> = {}): Respuesta {
  return { content, ...extra };
}

/**
 * Edita la respuesta diferida cuando ya se sabe el contenido real — el
 * token de la interacción hace de autenticación por sí solo en este
 * endpoint concreto de Discord, no hace falta el token del bot.
 */
async function editarRespuestaDiferida(token: string, respuesta: Respuesta): Promise<void> {
  const applicationId = process.env.DISCORD_APPLICATION_ID;
  if (!applicationId) {
    console.error("[discord-interactions] Falta DISCORD_APPLICATION_ID — no se puede editar la respuesta diferida.");
    return;
  }
  try {
    const res = await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(respuesta),
    });
    if (!res.ok) console.error("[discord-interactions] Discord devolvió", res.status, "editando la respuesta diferida:", await res.text());
  } catch (error) {
    console.error("[discord-interactions] fallo editando la respuesta diferida", error);
  }
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
  return mensaje("", {
    embeds: [
      {
        title: detalle.title,
        url: `${dominioPublico()}/u/${profile.handle}/${encodeURIComponent(detalle.id)}`,
        description: lineas.slice(1).join("\n"),
        color: COLOR_PARAGON,
        ...(detalle.iconUrl ? { thumbnail: { url: detalle.iconUrl } } : {}),
        footer: { text: "Paragon" },
      },
    ],
  });
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
  // Sin lo que ya no tienes (Ajustes → Ocultar, lib/retirados.ts).
  const { victoriasRapidas, paraProfundizar } = sugerirPorTiempo(sinRetirados(games, await getRetirados(userId)), minutos / 60, genero);
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
  // Sin lo que ya no tienes (Ajustes → Ocultar, lib/retirados.ts).
  const { victoriasRapidas, paraProfundizar } = sugerirPorTiempo(sinRetirados(games, await getRetirados(userId)), minutos / 60, genero);

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
  const estiloDeCaza = calcularEstiloDeCaza(games);

  const lineas = [
    `**${profile.displayName ?? profile.handle ?? "Perfil"}** (@${profile.handle ?? "?"})`,
    `🏆 ${resumen.platinos} platinos · 🎮 ${resumen.juegos} juegos · 🧩 ${resumen.trofeos.toLocaleString("es-ES")} trofeos`,
    `⭐ Nivel Paragon ${nivel.level} (${nivel.progreso}% hasta el ${nivel.siguienteNivel})`,
  ];
  if (dna.arquetipo) lineas.push(`🧬 ${dna.arquetipo}`);
  if (estiloDeCaza) lineas.push(`🎯 ${estiloDeCaza.nombre}`);
  if (racha.actual > 0) lineas.push(`🔥 Racha activa: ${racha.actual} ${racha.actual === 1 ? "día" : "días"} (mejor: ${racha.mejor})`);
  if (hitos.primerTrofeo) lineas.push(`🎮 Primer trofeo: ${hitos.primerTrofeo.nombre} (${hitos.primerTrofeo.tituloJuego})`);
  if (hitos.primerPlatino) lineas.push(`🥇 Primer platino: ${hitos.primerPlatino.titulo}`);
  if (hitos.trofeoMasRaro) lineas.push(`💎 Trofeo más raro: ${hitos.trofeoMasRaro.nombre} (${hitos.trofeoMasRaro.rarityPercent.toFixed(1)}%)`);

  // Tarjeta con la imagen social del perfil (la misma de WhatsApp o X) en
  // vez de solo texto (5 nov 2026).
  if (!profile.handle) return mensaje(lineas.join("\n"));
  const web = dominioPublico();
  return mensaje("", {
    embeds: [
      {
        title: lineas[0].replace(/\*\*/g, ""),
        url: `${web}/u/${profile.handle}`,
        description: lineas.slice(1).join("\n"),
        color: COLOR_PARAGON,
        image: { url: `${web}/api/og/u/${profile.handle}` },
        footer: { text: "Paragon" },
      },
    ],
  });
}

/** Coincidencia exacta si la hay; si no, la primera que CONTENGA lo escrito — mismo criterio que `encontrarJuegoPorTitulo`. */
function encontrarLigaPorNombre<T extends { name: string }>(ligas: T[], busqueda: string): T | null {
  const q = normalizarTitulo(busqueda);
  if (!q) return null;
  const exacta = ligas.find((l) => normalizarTitulo(l.name) === q);
  if (exacta) return exacta;
  return ligas.find((l) => normalizarTitulo(l.name).includes(q)) ?? null;
}

async function comandoLigas(discordUserId: string) {
  const userId = await usuarioParagonDeDiscord(discordUserId);
  if (!userId) return mensaje(SIN_VINCULAR);

  const ligas = await listUserLeagues(userId);
  if (ligas.length === 0) return mensaje("No estás en ninguna liga todavía — créate una en Paragon o pide que te inviten.");

  const lineas = await Promise.all(
    ligas.map(async (liga) => {
      const detalle = await getLeagueDetail(liga.id, userId);
      const posicion = detalle?.standings.findIndex((s) => s.userId === userId);
      const yo = posicion != null && posicion >= 0 ? detalle!.standings[posicion] : null;
      const sufijo = yo ? ` — vas ${posicion! + 1}º con ${yo.points} pts` : "";
      return `🏅 **${liga.name}** (${liga.memberCount} ${liga.memberCount === 1 ? "miembro" : "miembros"})${sufijo}`;
    }),
  );
  return mensaje(lineas.join("\n"));
}

async function comandoLiga(discordUserId: string, nombre: string) {
  const userId = await usuarioParagonDeDiscord(discordUserId);
  if (!userId) return mensaje(SIN_VINCULAR);

  const ligas = await listUserLeagues(userId);
  const encontrada = encontrarLigaPorNombre(ligas, nombre);
  if (!encontrada) return mensaje(`No encuentro ninguna liga tuya llamada "${nombre}".`);

  const detalle = await getLeagueDetail(encontrada.id, userId);
  if (!detalle) return mensaje("No he podido cargar esa liga ahora mismo.");

  const lineas = [`**${detalle.name}**`];
  detalle.standings.forEach((s, i) => {
    const nombreMostrado = s.name ?? s.handle ?? "Alguien";
    lineas.push(`${i + 1}. ${nombreMostrado} — ${s.points} pts`);
  });
  if (detalle.challenge) {
    lineas.push("", `🏆 Reto: **${detalle.challenge.title}**`);
    detalle.challenge.standings.forEach((s, i) => {
      const nombreMostrado = s.name ?? s.handle ?? "Alguien";
      const estado = s.hasPlatinum ? "Platino" : `${s.progressPercent}%`;
      lineas.push(`${i + 1}. ${nombreMostrado} — ${estado}`);
    });
  }
  return mensaje(lineas.join("\n"));
}

async function comandoInvitacionesLiga(discordUserId: string) {
  const userId = await usuarioParagonDeDiscord(discordUserId);
  if (!userId) return mensaje(SIN_VINCULAR);

  const invitaciones = await listPendingLeagueInvites(userId);
  if (invitaciones.length === 0) return mensaje("No tienes ninguna invitación a ligas pendiente.");

  const lineas = invitaciones.map((inv) => `🏅 **${inv.name}** — invitación de ${inv.ownerName ?? "alguien"}`);
  // Un botón por invitación (Discord deja 5 filas por mensaje).
  const filas: FilaBotones[] = invitaciones.slice(0, 5).map((inv) => ({
    type: 1,
    components: [
      { type: 2, style: 3, label: `Aceptar · ${inv.name}`.slice(0, 80), custom_id: `liga:aceptar:${inv.id}` },
      { type: 2, style: 4, label: "Rechazar", custom_id: `liga:rechazar:${inv.id}` },
    ],
  }));
  return mensaje(lineas.join("\n"), { components: filas });
}

/**
 * /ranking: clasificación de la gente de este servidor que usa Paragon, por
 * nivel. "La gente de este servidor" = quien ha usado algún comando aquí
 * (lib/discordServidor.ts), sin pedir a Discord la lista de miembros.
 */
async function comandoRanking(guildId: string | null) {
  if (!guildId) return mensaje("Esto solo funciona dentro de un servidor, no por DM.");
  const miembros = await miembrosParagonDelServidor(guildId);
  if (miembros.length === 0) return mensaje("Todavía nadie de este servidor ha usado el bot de Paragon.");
  const niveles = await getParagonLevels(miembros.map((m) => m.userId));
  const orden = miembros
    .map((m) => ({ ...m, nivel: niveles.get(m.userId) }))
    .sort((a, b) => (b.nivel?.xp ?? 0) - (a.nivel?.xp ?? 0))
    .slice(0, 15);
  const medallas = ["🥇", "🥈", "🥉"];
  const lineas = orden.map((m, i) => `${medallas[i] ?? `${i + 1}.`} **${m.nombre}** — nivel ${m.nivel?.level ?? 1} (${(m.nivel?.xp ?? 0).toLocaleString("es-ES")} XP)`);
  lineas.push("", "Sale aquí quien haya usado algún comando del bot en este servidor.");
  return mensaje("", { embeds: [{ title: "🏆 Ranking Paragon del servidor", description: lineas.join("\n"), color: COLOR_PARAGON }] });
}

/** Clic derecho → Apps → "Comparar en Paragon" (o `/comparar`): tú contra esa persona. */
async function comandoComparar(discordUserId: string, discordObjetivo: string | null) {
  const yoId = await usuarioParagonDeDiscord(discordUserId);
  if (!yoId) return mensaje(SIN_VINCULAR);
  if (!discordObjetivo) return mensaje("Dime con quién — por ejemplo `/comparar @amigo`.");
  const otroId = await usuarioParagonDeDiscord(discordObjetivo);
  if (!otroId) return mensaje("Esa persona no tiene su Discord vinculado a ninguna cuenta de Paragon.");
  if (otroId === yoId) return mensaje("Ese eres tú. 😄");

  const [yo, otro] = await Promise.all([getProfileByUserId(yoId), getProfileByUserId(otroId)]);
  if (!yo || !otro) return mensaje("No encuentro alguno de los dos perfiles.");
  const [libYo, libOtro, niveles] = await Promise.all([getLibrary(yo), getLibrary(otro), getParagonLevels([yoId, otroId])]);
  const a = summarise(libYo.games);
  const b = summarise(libOtro.games);
  const clave = (g: Game) => (g.igdbId ? `i${g.igdbId}` : normalizarTitulo(g.title));
  const mios = new Set(libYo.games.filter((g) => !g.isWishlist).map(clave));
  const comunes = new Set(libOtro.games.filter((g) => !g.isWishlist).map(clave).filter((k) => mios.has(k))).size;

  const fila = (etiqueta: string, x: number, y: number) => `${etiqueta}: **${x.toLocaleString("es-ES")}** ${x > y ? "🟢" : x < y ? "🔴" : "🟰"} **${y.toLocaleString("es-ES")}**`;
  const nombreA = yo.displayName ?? yo.handle ?? "Tú";
  const nombreB = otro.displayName ?? otro.handle ?? "Rival";
  const lineas = [
    `${nombreA} vs ${nombreB}`,
    fila("⭐ Nivel", niveles.get(yoId)?.level ?? 1, niveles.get(otroId)?.level ?? 1),
    fila("🏆 Platinos", a.platinos, b.platinos),
    fila("🧩 Trofeos", a.trofeos, b.trofeos),
    fila("🎮 Juegos", a.juegos, b.juegos),
    fila("📈 Completado medio %", a.completadoMedio, b.completadoMedio),
    `🤝 Juegos en común: **${comunes}**`,
  ];
  return mensaje("", {
    embeds: [
      {
        title: `⚔️ ${lineas[0]}`,
        url: otro.handle ? `${dominioPublico()}/comparar/${otro.handle}` : undefined,
        description: lineas.slice(1).join("\n"),
        color: COLOR_PARAGON,
        footer: { text: "Paragon" },
      },
    ],
  });
}

/**
 * Un botón pulsado (invitación de liga o solicitud de amistad, en un DM o
 * en la respuesta de /invitacionesliga). Quien pulsa tiene que ser la
 * persona invitada: aceptar y rechazar ya lo comprueban en la base.
 */
async function responderBoton(customId: string, discordUserId: string): Promise<Respuesta> {
  const userId = await usuarioParagonDeDiscord(discordUserId);
  if (!userId) return mensaje(SIN_VINCULAR, { components: [] });
  const [tipo, accion, id] = customId.split(":");
  if (!id) return mensaje("Botón no reconocido.", { components: [] });

  if (tipo === "liga") {
    if (accion === "aceptar") {
      const ok = await acceptLeagueInvite(id, userId);
      return mensaje(ok ? "✅ Te has unido a la liga. ¡A por ellos!" : "Esa invitación ya no está pendiente.", { components: [] });
    }
    await declineLeagueInvite(id, userId);
    return mensaje("Invitación rechazada.", { components: [] });
  }
  if (tipo === "amigo") {
    if (accion === "aceptar") {
      const ok = await acceptFriendRequest(userId, id);
      return mensaje(ok ? "🤝 ¡Ya sois amigos en Paragon!" : "Esa solicitud ya no está pendiente.", { components: [] });
    }
    const ok = await declineFriendRequest(userId, id);
    return mensaje(ok ? "Solicitud rechazada." : "Esa solicitud ya no está pendiente.", { components: [] });
  }
  return mensaje("Botón no reconocido.", { components: [] });
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
      "🏅 `/ligas` — tus ligas creadas con amigos y tu posición en cada una.",
      "🏅 `/liga <nombre>` — clasificación completa de una liga (y su reto, si tiene).",
      "✉️ `/invitacionesliga` — invitaciones a ligas sin responder, con botones para aceptarlas.",
      "📊 `/ranking` — clasificación por nivel de la gente de este servidor que usa Paragon.",
      "⚔️ `/comparar <usuario>` — tú contra un amigo: nivel, platinos, trofeos y juegos en común.",
      "🖱️ Clic derecho en alguien → Apps → «Ver en Paragon» o «Comparar en Paragon».",
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

/**
 * Todo el cálculo de verdad de un comando — vive aparte de `POST` porque
 * esto es justo lo que corre DENTRO de `after()`, después de haber
 * contestado ya a Discord con la respuesta diferida. Devuelve el texto
 * final, nunca un `NextResponse` (eso ya se mandó).
 */
async function calcularRespuesta(interaction: DiscordInteraction, discordUserId: string): Promise<Respuesta> {
  const nombre = interaction.data!.name;
  switch (nombre) {
    // Menús contextuales de usuario (clic derecho → Apps).
    case "Ver en Paragon":
      return await comandoPerfil(discordUserId, interaction.data!.target_id ?? null);
    case "Comparar en Paragon":
      return await comandoComparar(discordUserId, interaction.data!.target_id ?? null);
    case "comparar":
      return await comandoComparar(discordUserId, usuarioMencionado(interaction));
    case "ranking":
      return await comandoRanking(interaction.guild_id ?? null);
    case "platinosalalcance":
      return await comandoPlatinosAlAlcance(discordUserId);
    case "hoy": {
      const minutos = interaction.data!.options?.find((o) => o.name === "minutos")?.value;
      const generoOpt = interaction.data!.options?.find((o) => o.name === "genero")?.value;
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
      const titulo = interaction.data!.options?.find((o) => o.name === "titulo")?.value;
      if (typeof titulo !== "string" || !titulo.trim()) return mensaje("Dime qué juego — por ejemplo `/juego Elden Ring`.");
      return await comandoJuego(discordUserId, titulo);
    }
    case "nota": {
      const titulo = interaction.data!.options?.find((o) => o.name === "titulo")?.value;
      const texto = interaction.data!.options?.find((o) => o.name === "texto")?.value;
      if (typeof titulo !== "string" || !titulo.trim() || typeof texto !== "string" || !texto.trim()) {
        return mensaje("Hace falta el título del juego y el texto de la nota.");
      }
      return await comandoNota(discordUserId, titulo, texto);
    }
    case "ruleta": {
      const minutos = interaction.data!.options?.find((o) => o.name === "minutos")?.value;
      const generoOpt = interaction.data!.options?.find((o) => o.name === "genero")?.value;
      const genero = typeof generoOpt === "string" && CATEGORIAS_GENERO.some((c) => c.key === generoOpt) ? (generoOpt as CategoriaDna) : undefined;
      return await comandoRuleta(discordUserId, typeof minutos === "number" ? minutos : 60, genero);
    }
    case "anunciosaqui":
      return await comandoAnunciosAqui(interaction.guild_id ?? null, interaction.channel_id ?? null, discordUserId);
    case "ligas":
      return await comandoLigas(discordUserId);
    case "liga": {
      const nombre = interaction.data!.options?.find((o) => o.name === "nombre")?.value;
      if (typeof nombre !== "string" || !nombre.trim()) return mensaje("Dime el nombre de la liga — por ejemplo `/liga Los de siempre`.");
      return await comandoLiga(discordUserId, nombre);
    }
    case "invitacionesliga":
      return await comandoInvitacionesLiga(discordUserId);
    case "help":
      return comandoHelp();
    default:
      return mensaje("Comando no reconocido.");
  }
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

  // `verify` lanza (no devuelve false) con una firma de longitud incorrecta
  // — sin el try, una cabecera basura daba un 500 en vez de un 401.
  let verificado = false;
  try {
    verificado = nacl.sign.detached.verify(
      Buffer.from(timestamp + body),
      Buffer.from(signature, "hex"),
      Buffer.from(publicKey, "hex"),
    );
  } catch {
    verificado = false;
  }
  if (!verificado) {
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  const interaction = JSON.parse(body) as DiscordInteraction;

  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: ResponseType.PONG });
  }

  const discordAutor = interaction.member?.user?.id ?? interaction.user?.id;

  // Autocompletado de /juego, /nota y /liga: hay que contestar en menos de
  // 3 s y sin diferir, así que va con una consulta mínima (solo títulos).
  if (interaction.type === InteractionType.AUTOCOMPLETE && interaction.data) {
    const foco = interaction.data.options?.find((o) => o.focused);
    let opciones: { name: string; value: string }[] = [];
    try {
      const userId = discordAutor ? await usuarioParagonDeDiscord(discordAutor) : null;
      if (userId && foco) {
        const texto = String(foco.value ?? "");
        const nombres =
          interaction.data.name === "liga"
            ? (await listUserLeagues(userId)).map((l) => l.name).filter((n) => normalizarTitulo(n).includes(normalizarTitulo(texto)))
            : await titulosParaAutocompletar(userId, texto);
        // Discord: 25 opciones como mucho y 100 caracteres por nombre y valor.
        opciones = [...new Set(nombres)].slice(0, 25).map((n) => ({ name: n.slice(0, 100), value: n.slice(0, 100) }));
      }
    } catch (error) {
      console.error("[discord-interactions] autocompletado", error);
    }
    return NextResponse.json({ type: ResponseType.AUTOCOMPLETE_RESULT, data: { choices: opciones } });
  }

  // Botones (aceptar/rechazar ligas y amistades). Se contesta "editaré este
  // mensaje" al momento y el cambio de verdad va en `after()`.
  if (interaction.type === InteractionType.MESSAGE_COMPONENT && interaction.data?.custom_id && discordAutor) {
    const { token } = interaction;
    const customId = interaction.data.custom_id;
    after(async () => {
      let respuesta: Respuesta;
      try {
        respuesta = await responderBoton(customId, discordAutor);
      } catch (error) {
        console.error("[discord-interactions] botón", customId, error);
        respuesta = mensaje("Algo falló — inténtalo desde la web.", { components: [] });
      }
      await editarRespuestaDiferida(token, respuesta);
    });
    return NextResponse.json({ type: ResponseType.DEFERRED_UPDATE_MESSAGE });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND && interaction.data) {
    // En un servidor el autor va en `member.user`; en un DM al bot, en `user` a secas.
    const discordUserId = interaction.member?.user?.id ?? interaction.user?.id;
    // Caso instantáneo, sin ir a la base — se contesta directo, sin diferir.
    if (!discordUserId) {
      return NextResponse.json({
        type: ResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: "No he podido saber quién eres.", flags: EPHEMERAL },
      });
    }

    // Único comando público — presumir de estadísticas en /perfil SÍ tiene
    // sentido delante del canal, a diferencia del backlog o la vergüenza
    // de cada uno (todo lo demás es efímero).
    const esPublico = ["perfil", "ranking", "comparar", "Ver en Paragon", "Comparar en Paragon"].includes(interaction.data.name);
    const { token } = interaction;

    // El cálculo de verdad (consultas a la base, a veces un sync en vivo)
    // corre DESPUÉS de haber contestado ya — ver el aviso grande de arriba
    // del archivo sobre por qué (bug real de "La aplicación no ha
    // respondido" en producción).
    after(async () => {
      let respuesta: Respuesta;
      try {
        respuesta = await calcularRespuesta(interaction, discordUserId);
      } catch (error) {
        console.error("[discord-interactions]", interaction.data!.name, error);
        respuesta = mensaje("Algo falló consultando tu biblioteca — inténtalo de nuevo en un momento.");
      }
      await editarRespuestaDiferida(token, respuesta);
      // Para /ranking: quien usa el bot en un servidor sale en el de ese servidor.
      if (interaction.guild_id) await apuntarMiembroServidor(interaction.guild_id, discordUserId);
    });

    return NextResponse.json({
      type: ResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      data: esPublico ? {} : { flags: EPHEMERAL },
    });
  }

  return NextResponse.json({ error: "Comando no reconocido." }, { status: 400 });
}
