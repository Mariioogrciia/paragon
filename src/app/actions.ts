"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users, userGames, activities, platformAccounts, leagues, accounts, userTrophies, gameTrophies, games } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { contieneLenguajeOfensivo, errorSiOfensivo } from "@/lib/contentFilter";
import { auth, signOut } from "@/auth";
import {
  CollectionNameError,
  createCollection,
  deleteCollection,
  renameCollection,
  toggleGameInCollection,
  addGamesToCollection,
  removeGameFromCollection,
  moveGameToCollection,
} from "@/lib/collections";
import {
  acceptFriendRequest,
  accountFor,
  describePlatformError,
  getProfileByUserId,
  isHandleTaken,
  linkAccount,
  refrescarJuego,
  removeFriend,
  resyncLibraries,
  resyncPlatform,
  saveGameNotes,
  sendFriendRequest,
  setHandle,
  setManualTrophyProgress,
  setProfileInfo,
  togglePinnedGame,
  unlinkAccount,
} from "@/lib/profiles";
import { toggleReservedMilestone } from "@/lib/milestones";
import { toggleActivityReaction, addActivityComment, ComentarioOfensivoError } from "@/lib/feed";
import { createLeague, addLeagueMember, removeLeagueMember, deleteLeague, setLeagueChallenge, acceptLeagueInvite, declineLeagueInvite, NotFriendsError, type LeagueDurationUnit } from "@/lib/leagues";
import { syncGameTrophies } from "@/lib/sync";
import { parseGameKey } from "@/lib/types";
import { addManualGame, setManualGameCompleted } from "@/lib/manualGames";
import { createGuide, deleteGuide, replyToGuide } from "@/lib/guides";
import { buscarVideoGuiaTrofeo, rebuscarVideoGuiaTrofeo } from "@/lib/videoGuides";
import { upsertTrophyGuide, deleteTrophyGuide, listTrophyGuides, TrophyGuideError, type TrophyGuideRow } from "@/lib/trophyGuides";
import { ownsGame } from "@/lib/community";
import { juegosPendientes, saludSincronizacion } from "@/lib/syncHealth";
import { votarDificultad } from "@/lib/communityDifficulty";
import type { PlataformaVinculable } from "@/lib/types";
import { discordUserIdDe, probarDiscordDm, setDiscordDmEnabled } from "@/lib/discordBot";
import { guardarSuscripcionPush, borrarSuscripcionPush, enviarPush } from "@/lib/webPush";
import { setHiddenNavItems } from "@/lib/navPreferences";
import { setPanelOculto } from "@/lib/panelPreferences";
import { setAvisosActivos } from "@/lib/avisosPreferencias";
import { COOKIES_SESION, cerrarOtrasSesiones } from "@/lib/mobileAuth";
import { ipActual, limitar } from "@/lib/rateLimit";
import { HANDLE_RE } from "@/lib/validacionPerfil";
import { borrarAlertaPrecio, guardarAlertaPrecio } from "@/lib/priceAlerts";
import { setObjetivoFecha } from "@/lib/goals";
import { SesionError, apuntarse, cancelarSesion, crearSesion, salirse } from "@/lib/sesiones";
import { CoopError, proponerReto, responderReto } from "@/lib/coop";
import { RetoAmigosError, cancelarRetoAmigos, crearRetoAmigos, responderRetoAmigos } from "@/lib/retosAmigos";
import { VitrinaError, borrarVitrina, crearVitrina } from "@/lib/vitrinas";
import { setHorasIgnoradas } from "@/lib/horasIgnoradas";
import { getParagonLevel } from "@/lib/paragonLevel";
import { ESTILO_REQUISITOS } from "@/lib/level";

export interface ActionState {
  error?: string;
  /** Distinto de `error`: la acción en sí funcionó (p. ej. la cuenta se
   * vinculó de verdad), pero hay algo que el usuario debería saber — no es
   * un fallo completo, así que un rojo de "esto no ha funcionado" sería
   * engañoso. Ver `linkPlatform` (cuenta vinculada pero privada). */
  warning?: string;
  success?: string;
  /** Trofeos que ha traído una sincronización, para el aviso de "trofeo desbloqueado". */
  trofeos?: TrofeoDesbloqueado[];
  /** Cuántos trofeos nuevos trajo en total (el aviso enseña como mucho 3). */
  nuevos?: number;
}

export interface TrofeoDesbloqueado {
  nombre: string;
  juego: string;
  icono: string | null;
  grado: string | null;
}

async function contarTrofeos(userId: string): Promise<number> {
  const [fila] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(userTrophies)
    .where(and(eq(userTrophies.userId, userId), eq(userTrophies.earned, true)));
  return Number(fila?.n ?? 0);
}

/** Los `cuantos` trofeos más recientes (por fecha real de la plataforma), como mucho 3 para el aviso. */
async function ultimosTrofeos(userId: string, cuantos: number): Promise<TrofeoDesbloqueado[]> {
  if (cuantos <= 0) return [];
  return getDb()
    .select({ nombre: gameTrophies.name, juego: games.title, icono: gameTrophies.iconUrl, grado: gameTrophies.grade })
    .from(userTrophies)
    .innerJoin(gameTrophies, and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)))
    .innerJoin(games, eq(games.id, userTrophies.gameId))
    .where(and(eq(userTrophies.userId, userId), eq(userTrophies.earned, true)))
    .orderBy(sql`${userTrophies.earnedAt} desc nulls last`)
    .limit(Math.min(cuantos, 3));
}


async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");
  return session.user.id;
}

// `describeError` vivía aquí duplicada — movida a `describePlatformError`
// en src/lib/profiles.ts para poder reutilizarla también desde
// /api/mobile/* (ver el import de arriba).
const describeError = describePlatformError;

export async function chooseHandleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const handle = String(formData.get("handle") ?? "")
    .trim()
    .toLowerCase();

  if (!HANDLE_RE.test(handle)) {
    return {
      error:
        "Entre 3 y 20 caracteres, solo minúsculas, números y guion bajo.",
    };
  }

  if (await isHandleTaken(handle, userId)) {
    return { error: "Ese nombre de usuario ya está cogido." };
  }
  const errorOfensivo = errorSiOfensivo(handle);
  if (errorOfensivo) return { error: errorOfensivo };

  await setHandle(userId, handle);
  
  const keepAvatar = formData.get("keepAvatar") === "on";
  if (!keepAvatar) {
    const db = getDb();
    await db.update(users).set({ image: null }).where(eq(users.id, userId));
  }
  
  revalidatePath("/", "layout");

  return { success: `Ahora eres @${handle}.` };
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  const image = String(formData.get("image") ?? "").trim();

  if (!name) {
    return { error: "El nombre a mostrar no puede estar vacío." };
  }
  const errorOfensivo = errorSiOfensivo(name);
  if (errorOfensivo) return { error: errorOfensivo };

  await setProfileInfo(userId, name, image || null);
  revalidatePath("/", "layout");

  return { success: "Perfil actualizado correctamente." };
}

/* -------------------------------- Bot de Discord -------------------------------- */

/**
 * Activa/desactiva los DMs del bot — sustituye al webhook de antes (ya no
 * hay URL que pegar). Solo tiene efecto de verdad si la cuenta inició
 * sesión con Discord alguna vez; si no, se avisa aquí mismo en vez de
 * dejar el interruptor encendido sin que vaya a pasar nada.
 */
export async function setDiscordDmAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const activar = formData.get("activar") === "true";

  if (activar && !(await discordUserIdDe(userId))) {
    return { error: "Tu cuenta no inició sesión con Discord — sin eso el bot no sabe a quién escribir." };
  }

  await setDiscordDmEnabled(userId, activar);
  revalidatePath("/ajustes");
  return activar ? { success: "Avisos por Discord activados." } : { success: "Avisos por Discord desactivados." };
}

export async function probarDiscordDmAction(_prev: ActionState): Promise<ActionState> {
  const userId = await requireUserId();
  const res = await probarDiscordDm(userId);
  return res.ok
    ? { success: "Mensaje de prueba enviado — revisa tus DMs de Discord." }
    : { error: res.error ?? "No se pudo enviar." };
}

/* ------------------------------ Notificaciones push ----------------------------- */

export async function subscribePushAction(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    await guardarSuscripcionPush(userId, subscription);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo guardar." };
  }
}

export async function unsubscribePushAction(endpoint: string): Promise<void> {
  await requireUserId();
  await borrarSuscripcionPush(endpoint);
}

/** Botón "Probar" de /ajustes — sin esto no hay forma de saber si el
 * navegador de verdad entrega el aviso hasta que salga un trofeo real. */
export async function testPushAction(): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUserId();
  try {
    const resultado = await enviarPush(userId, {
      title: "✅ Paragon conectado",
      body: "Cuando consigas un trofeo nuevo, se avisa aquí.",
    });
    // Antes esto devolvía {ok:true} pasara lo que pasara: enviarPush nunca
    // lanzaba, solo se callaba si faltaban las claves VAPID o no había
    // ninguna suscripción — el botón "Probar" decía "enviado" aunque no
    // hubiera llegado a ningún sitio.
    if (resultado.enviados === 0) {
      return { ok: false, error: resultado.error ?? "No se pudo entregar el aviso." };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo enviar." };
  }
}

/* ------------------------------ Cuentas de plataforma ----------------------------- */

/**
 * Qué hay que escribir en cada plataforma, y qué decir cuando no se puede
 * leer. `privado` empieza siempre por "Cuenta vinculada..." a propósito
 * (pedido explícito del usuario, 23 sept 2026): la cuenta SÍ se guardó
 * (`linkAccount` la inserta igual aunque no sea legible), así que decir
 * solo "privado" o "no encontrado" sin más suena a que la vinculación en
 * sí falló, cuando lo único que falló fue poder leer la biblioteca.
 */
const PLATFORM_COPY: Record<
  PlataformaVinculable,
  { field: string; missing: string; privado: (nombre: string) => string }
> = {
  psn: {
    field: "onlineId",
    missing: "Escribe tu ID de PlayStation.",
    privado: (nombre) =>
      `Cuenta vinculada a ${nombre}, pero PlayStation no nos deja leer sus trofeos. ` +
      `Tiene que ser amigo en PSN de la cuenta del servidor, o tener los trofeos en público.`,
  },
  steam: {
    field: "steamId",
    missing: "Escribe tu usuario de Steam, tu SteamID64 o la URL de tu perfil.",
    privado: (nombre) =>
      `Cuenta vinculada a ${nombre}, pero no podemos leer tu biblioteca. En Steam hacen falta DOS ` +
      `ajustes en público — Perfil → Editar perfil → Privacidad, y pon "Mi perfil" Y "Detalles del ` +
      `juego" en público (el perfil puede estar ya público y aun así bloquear la lectura si "Detalles ` +
      `del juego" no lo está).`,
  },
  xbox: {
    field: "gamertag",
    missing: "Escribe tu Gamertag de Xbox.",
    privado: (nombre) =>
      `Cuenta vinculada a ${nombre}, pero no podemos leer su historial de logros — o el perfil no es público, o Xbox no lo encuentra.`,
  },
  epic: {
    field: "epicProfile",
    missing: "Pega el enlace a tu perfil de Epic Games (o tu ID de cuenta).",
    privado: (nombre) =>
      `Cuenta vinculada a ${nombre}, pero no es público. En la Epic Games Store: tu avatar → ` +
      `"Mis logros" → "Nivel de privacidad" → "Público".`,
  },
};

async function linkPlatform(
  platform: PlataformaVinculable,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const copy = PLATFORM_COPY[platform];
  const input = String(formData.get(copy.field) ?? "").trim();

  if (!input) return { error: copy.missing };

  try {
    const cuenta = await linkAccount(userId, platform, input);
    revalidatePath("/", "layout");

    if (!cuenta.legible) return { warning: copy.privado(cuenta.username) };

    return {
      success: `Vinculado a ${cuenta.username}: ${cuenta.juegos} juegos importados.`,
    };
  } catch (error) {
    return { error: describeError(error) };
  }
}

export async function linkPsnAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return linkPlatform("psn", formData);
}

export async function linkSteamAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return linkPlatform("steam", formData);
}

export async function linkXboxAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return linkPlatform("xbox", formData);
}

export async function linkEpicAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return linkPlatform("epic", formData);
}

export async function unlinkAccountAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const platformInput = String(formData.get("platform") ?? "");

  if (!["psn", "steam", "xbox", "epic"].includes(platformInput)) return;

  await unlinkAccount(userId, platformInput as PlataformaVinculable);
  revalidatePath("/", "layout");
}

/**
 * Antes nada impedía darle a "Sincronizar ahora" veinte veces seguidas.
 * Con Xbox vinculado eso puede agotar la cuota compartida de OpenXBL (150
 * peticiones/hora entre TODOS los usuarios de Paragon, no por cuenta — ver
 * el aviso en lib/xbl/client.ts) solo por un doble-clic o alguien
 * impaciente. Se reutiliza `platformAccounts.syncedAt` (que `resyncLibraries`
 * ya actualiza al terminar) en vez de una columna nueva: es exactamente
 * "cuándo se sincronizó de verdad la última vez".
 */
const SYNC_COOLDOWN_MS = 2 * 60 * 1000;

async function ultimaSincronizacion(
  userId: string,
  platform?: PlataformaVinculable,
): Promise<Date | null> {
  const db = getDb();
  const [fila] = await db
    .select({ ultimo: sql<Date | null>`max(${platformAccounts.syncedAt})` })
    .from(platformAccounts)
    .where(
      platform
        ? and(eq(platformAccounts.userId, userId), eq(platformAccounts.platform, platform))
        : eq(platformAccounts.userId, userId),
    );
  return fila?.ultimo ? new Date(fila.ultimo) : null;
}

function esperaRestante(ultimo: Date | null): ActionState | null {
  if (!ultimo) return null;
  const transcurrido = Date.now() - ultimo.getTime();
  if (transcurrido >= SYNC_COOLDOWN_MS) return null;

  const segundos = Math.ceil((SYNC_COOLDOWN_MS - transcurrido) / 1000);
  return { error: `Ya se sincronizó hace muy poco — espera ${segundos}s.` };
}

export async function syncNowAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const espera = esperaRestante(await ultimaSincronizacion(userId));
  if (espera) return espera;

  const antes = await contarTrofeos(userId);
  await resyncLibraries(userId, { forzarDetalle: true });
  const nuevos = Math.max(0, (await contarTrofeos(userId)) - antes);
  const trofeos = await ultimosTrofeos(userId, nuevos);
  revalidatePath("/", "layout");
  return { success: "Sincronizado.", trofeos, nuevos };
}

export async function syncPlatformAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const platformInput = String(formData.get("platform"));
  if (!["psn", "steam", "xbox", "epic"].includes(platformInput)) {
    return { error: "Plataforma no válida." };
  }
  const platform = platformInput as PlataformaVinculable;

  const espera = esperaRestante(await ultimaSincronizacion(userId, platform));
  if (espera) return espera;

  const antes = await contarTrofeos(userId);
  await resyncPlatform(userId, platform);
  const nuevos = Math.max(0, (await contarTrofeos(userId)) - antes);
  const trofeos = await ultimosTrofeos(userId, nuevos);
  revalidatePath("/", "layout");
  return { success: "Sincronizado.", trofeos, nuevos };
}

/* ------------------------------------ Carpetas ----------------------------------- */

export async function createCollectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "");
  const gameId = String(formData.get("gameId") ?? "");

  try {
    const id = await createCollection(userId, name);

    // Si la carpeta se crea desde la ficha de un juego, ese juego entra ya:
    // es lo que se espera al escribir el nombre estando dentro del juego.
    if (gameId) await toggleGameInCollection(userId, id, gameId);

    revalidatePath("/", "layout");
    return { success: `Carpeta creada.` };
  } catch (error) {
    if (error instanceof CollectionNameError) return { error: error.message };
    return { error: "No se ha podido crear la carpeta." };
  }
}

export async function toggleGameCollectionAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const collectionId = String(formData.get("collectionId") ?? "");
  const gameId = String(formData.get("gameId") ?? "");

  if (!collectionId || !gameId) return;

  await toggleGameInCollection(userId, collectionId, gameId);
  revalidatePath("/", "layout");
}

export async function deleteCollectionAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = String(formData.get("collectionId") ?? "");

  if (!id) return;

  await deleteCollection(userId, id);
  revalidatePath("/", "layout");
}

export async function renameCollectionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const id = String(formData.get("collectionId") ?? "");
  const name = String(formData.get("name") ?? "");

  try {
    await renameCollection(userId, id, name);
    revalidatePath("/", "layout");
    return { success: "Carpeta renombrada." };
  } catch (error) {
    if (error instanceof CollectionNameError) return { error: error.message };
    return { error: "No se ha podido renombrar la carpeta." };
  }
}

/** Crear una carpeta y meterle de golpe los juegos elegidos en el propio formulario de creación — no hace falta abrirla después para añadirlos uno a uno. */
export async function createCollectionWithGamesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "");
  const gameIds = formData.getAll("gameIds").map(String).filter(Boolean);

  try {
    const id = await createCollection(userId, name);
    if (gameIds.length > 0) await addGamesToCollection(userId, id, gameIds);
    revalidatePath("/", "layout");
    return { success: "Carpeta creada." };
  } catch (error) {
    if (error instanceof CollectionNameError) return { error: error.message };
    return { error: "No se ha podido crear la carpeta." };
  }
}

export async function addGamesToCollectionAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const collectionId = String(formData.get("collectionId") ?? "");
  const gameIds = formData.getAll("gameIds").map(String).filter(Boolean);

  if (!collectionId || gameIds.length === 0) return;

  await addGamesToCollection(userId, collectionId, gameIds);
  revalidatePath("/", "layout");
}

export async function removeGameFromCollectionAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const collectionId = String(formData.get("collectionId") ?? "");
  const gameId = String(formData.get("gameId") ?? "");

  if (!collectionId || !gameId) return;

  await removeGameFromCollection(userId, collectionId, gameId);
  revalidatePath("/", "layout");
}

/** Mover a otra carpeta ya existente. Para "mover, con opción a crear una nueva al mover" ver `moveGameToNewCollectionAction`. */
export async function moveGameToCollectionAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const fromCollectionId = String(formData.get("fromCollectionId") ?? "");
  const toCollectionId = String(formData.get("toCollectionId") ?? "");
  const gameId = String(formData.get("gameId") ?? "");

  if (!fromCollectionId || !toCollectionId || !gameId) return;

  await moveGameToCollection(userId, fromCollectionId, toCollectionId, gameId);
  revalidatePath("/", "layout");
}

/** Mover a una carpeta que no existe todavía: se crea y el juego entra directo, en la misma acción. */
export async function moveGameToNewCollectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const fromCollectionId = String(formData.get("fromCollectionId") ?? "");
  const gameId = String(formData.get("gameId") ?? "");
  const name = String(formData.get("name") ?? "");

  try {
    const toCollectionId = await createCollection(userId, name);
    await moveGameToCollection(userId, fromCollectionId, toCollectionId, gameId);
    revalidatePath("/", "layout");
    return { success: `Movido a «${name}».` };
  } catch (error) {
    if (error instanceof CollectionNameError) return { error: error.message };
    return { error: "No se ha podido mover el juego." };
  }
}

/* ------------------------------------- Amigos ------------------------------------ */

export async function addFriendAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const handle = String(formData.get("handle") ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");

  if (!handle) return { error: "Escribe el usuario de tu amigo." };

  const result = await sendFriendRequest(userId, handle);
  if (!result.ok) return { error: result.error };

  revalidatePath("/amigos");

  return {
    success: result.accepted
      ? `Ya sois amigos: @${handle} te había enviado una solicitud.`
      : `Solicitud enviada a @${handle}.`,
  };
}

export async function acceptFriendAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  await acceptFriendRequest(userId, String(formData.get("requesterId")));
  revalidatePath("/amigos");
}

/**
 * Enviar solicitud desde el propio perfil de la otra persona — ya sabemos
 * su handle (estamos mirándolo), a diferencia de `addFriendAction` (el
 * formulario de /amigos, donde hay que escribirlo). `profilePath` para
 * revalidar esa página en concreto, no solo /amigos: el botón tiene que
 * cambiar de estado sin recargar.
 */
export async function sendFriendRequestFromProfileAction(
  handle: string,
  profilePath: string,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUserId();
  const result = await sendFriendRequest(userId, handle);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(profilePath);
  revalidatePath("/amigos");
  return { ok: true };
}

export async function acceptFriendRequestFromProfileAction(requesterId: string, profilePath: string): Promise<void> {
  const userId = await requireUserId();
  await acceptFriendRequest(userId, requesterId);
  revalidatePath(profilePath);
  revalidatePath("/amigos");
}

export async function removeFriendAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  await removeFriend(userId, String(formData.get("friendId")));
  revalidatePath("/amigos");
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

/** Ver `cerrarOtrasSesiones` en lib/mobileAuth.ts. */
export async function closeOtherSessionsAction(): Promise<void> {
  const userId = await requireUserId();
  const store = await cookies();
  const tokenActual = COOKIES_SESION.map((nombre) => store.get(nombre)?.value).find(Boolean);
  // Sin la cookie no se sabe cuál es "esta" sesión: mejor no borrar nada
  // que cerrar también la del propio navegador sin avisar.
  if (!tokenActual) return;
  await cerrarOtrasSesiones(userId, tokenActual);
  revalidatePath("/ajustes/seguridad");
}

/**
 * `ConfirmForm` (mismo componente que ya usa `unlinkAccountAction` para las
 * cuentas de plataforma) es un formulario "dispara y olvida": no usa
 * `useActionState` ni enseña nada de lo que la acción devuelva. Por eso esto
 * es `Promise<void>`, no `ActionState` — un `{ error: ... }` aquí se
 * perdería en silencio, sin que el usuario viera nunca el aviso. La
 * comprobación de "no te quedes sin ninguna cuenta" es solo una red de
 * seguridad del servidor (la página ya oculta el botón cuando solo queda
 * una cuenta vinculada — ver `userAccounts.length > 1` en
 * ajustes/seguridad/page.tsx): si de verdad se llega aquí con una sola,
 * simplemente no se borra nada.
 */
export async function unlinkAuthAccountAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const provider = String(formData.get("provider"));
  const db = getDb();

  const userAccounts = await db.query.accounts.findMany({
    where: eq(accounts.userId, userId),
  });

  if (userAccounts.length <= 1) return;

  await db.delete(accounts).where(and(eq(accounts.userId, userId), eq(accounts.provider, provider)));
  revalidatePath("/ajustes/seguridad");
}

export async function deleteAccountAction(): Promise<void> {
  const userId = await requireUserId();
  const db = getDb();
  await db.delete(users).where(eq(users.id, userId)); // Cascade borrará perfiles, colecciones, etc.
  await signOut({ redirectTo: "/" });
}

/**
 * Nota de 1 a 5 (entera) o `null` para "sin nota". Auditoría, 28 sept 2026:
 * antes se guardaba el número tal cual llegara — quitar la nota (RatingStars
 * manda 0) dejaba un 0 que la media de la comunidad contaba como voto de
 * cero estrellas, y una petición a mano podía colar un 999 o un -5.
 */
function normalizarNota(rating: number): number | null {
  if (rating === 0) return null;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("La nota tiene que ser de 1 a 5 estrellas.");
  return rating;
}

const RESENA_MAX = 5_000;

export async function rateGameAction(gameId: string, ratingPedido: number) {
  const userId = await requireUserId();
  const db = getDb();
  const rating = normalizarNota(ratingPedido);

  await db
    .update(userGames)
    .set({ rating })
    .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)));

  // Sin nota: fuera también del feed, en vez de quedar "valoró con 0".
  if (rating === null) {
    await db
      .delete(activities)
      .where(and(eq(activities.userId, userId), eq(activities.gameId, gameId), eq(activities.type, "rating")));
    revalidatePath("/", "layout");
    return;
  }

  // Actualiza la actividad de valoración si ya había una para este juego, en
  // vez de insertar otra: `RatingStars` guarda en cada click, así que sin
  // esto, cambiar de opinión de 2 a 5 estrellas dejaba 4 entradas seguidas
  // en el feed de actividad diciendo lo mismo con números distintos.
  const [existente] = await db
    .select({ id: activities.id })
    .from(activities)
    .where(and(eq(activities.userId, userId), eq(activities.gameId, gameId), eq(activities.type, "rating")))
    .limit(1);

  if (existente) {
    await db
      .update(activities)
      .set({ rating, createdAt: new Date() })
      .where(eq(activities.id, existente.id));
  } else {
    await db.insert(activities).values({
      id: crypto.randomUUID(),
      userId,
      type: "rating",
      gameId,
      rating,
    });
  }

  revalidatePath('/', 'layout');
}

export async function writeReviewAction(gameId: string, review: string, dateStr: string) {
  const userId = await requireUserId();
  const db = getDb();

  if (review.length > RESENA_MAX) throw new Error(`La reseña puede tener como mucho ${RESENA_MAX} caracteres.`);
  if (contieneLenguajeOfensivo(review)) {
    throw new Error("Esa reseña contiene lenguaje ofensivo — cámbiala e inténtalo de nuevo.");
  }

  // Una fecha inválida llegaba a la base como `Invalid Date` y reventaba la
  // consulta; ahora se ignora (sin fecha) en vez de fallar entera.
  const fecha = dateStr ? new Date(dateStr) : null;
  const reviewDate = fecha && !Number.isNaN(fecha.getTime()) ? fecha : null;

  await db
    .update(userGames)
    .set({ review, reviewDate })
    .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)));

  const activityId = crypto.randomUUID();
  await db
    .insert(activities)
    .values({
      id: activityId,
      userId,
      type: "review",
      gameId,
      review,
    });

  revalidatePath('/', 'layout');
}

/**
 * Vota lo dura que le pareció a alguien la campaña de un juego (1-5).
 *
 * Solo quien lo tiene en su biblioteca puede votar — igual que las reseñas,
 * que solo tienen efecto sobre la fila de `user_game` del propio dueño. Sin
 * este chequeo cualquiera podría opinar de un juego que no ha tocado.
 */
export async function voteDifficultyAction(gameId: string, value: number): Promise<void> {
  const userId = await requireUserId();

  if (!(await ownsGame(userId, gameId))) return;

  await votarDificultad(userId, gameId, value);
  revalidatePath(`/juego/${gameId}`);
}

export async function toggleActivityReactionAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const activityId = String(formData.get("activityId") ?? "");
  if (!activityId) return;
  await toggleActivityReaction(userId, activityId, String(formData.get("reaction") ?? "aplauso"));
  revalidatePath("/", "layout");
}

/**
 * Estado libre en Comunidad ("¿qué estás cazando?"): una `activity` de tipo
 * "status" sin juego. Mismo filtro de lenguaje que reseñas y comentarios, y
 * como mucho 5 cada 10 minutos por persona.
 */
export async function publicarEstadoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const texto = String(formData.get("texto") ?? "").trim().slice(0, 280);
  if (!texto) return { error: "Escribe algo antes de publicar." };
  const errorOfensivo = errorSiOfensivo(texto);
  if (errorOfensivo) return { error: errorOfensivo };
  if (!(await limitar("estado", userId))) return { error: "Has publicado mucho seguido. Espera unos minutos." };

  await getDb().insert(activities).values({ id: crypto.randomUUID(), userId, type: "status", review: texto });
  revalidatePath("/feed");
  return { success: "Publicado." };
}

/** Solo el autor, y solo sus estados (lo demás sale de la actividad real y no se borra desde aquí). */
export async function borrarEstadoAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const activityId = String(formData.get("activityId") ?? "");
  if (!activityId) return;
  await getDb()
    .delete(activities)
    .where(and(eq(activities.id, activityId), eq(activities.userId, userId), eq(activities.type, "status")));
  revalidatePath("/feed");
}

export async function addActivityCommentAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  if (!(await limitar("comentario", userId))) return;
  const activityId = String(formData.get("activityId") ?? "");
  // El campo del formulario (ActivityFeed.tsx) se llama "comment", no
  // "body" — leer "body" aquí devolvía siempre null, así que `body` salía
  // "" y el guard de abajo cortaba en silencio: el comentario nunca se
  // insertaba, sin ningún error visible para quien escribía.
  const body = String(formData.get("comment") ?? "");
  if (!activityId) return;
  try {
    await addActivityComment(userId, activityId, body);
  } catch (error) {
    // El formulario del feed es "dispara y olvida" (sin estado de vuelta):
    // un comentario ofensivo simplemente no se publica.
    if (!(error instanceof ComentarioOfensivoError)) throw error;
  }
  revalidatePath("/", "layout");
}

export async function deleteActivityAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const profile = await getProfileByUserId(userId);
  if (!profile?.esDesarrollador) return;

  const activityId = String(formData.get("activityId") ?? "");
  if (!activityId) return;

  // We find the activity to also nullify the review on user_game if necessary
  const database = getDb();
  const [activity] = await database
    .select({ gameId: activities.gameId, userId: activities.userId, type: activities.type })
    .from(activities)
    .where(eq(activities.id, activityId))
    .limit(1);

  if (!activity) return;

  await database.delete(activities).where(eq(activities.id, activityId));

  // If this was a review/rating, we should also delete the text from user_games
  if (activity.type === "review") {
    await database.update(userGames).set({ review: null }).where(and(eq(userGames.userId, activity.userId), eq(userGames.gameId, activity.gameId!)));
  }

  revalidatePath("/", "layout");
}

export async function adminDeleteLeagueAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const profile = await getProfileByUserId(userId);
  if (!profile?.esDesarrollador) return;

  const leagueId = String(formData.get("leagueId") ?? "");
  if (!leagueId) return;

  const database = getDb();
  await database.delete(leagues).where(eq(leagues.id, leagueId));

  revalidatePath("/", "layout");
}

export async function adminDeleteClanAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const profile = await getProfileByUserId(userId);
  if (!profile?.esDesarrollador) return;

  const clanId = String(formData.get("clanId") ?? "");
  if (!clanId) return;

  const { clans } = await import("@/db/schema");
  const database = getDb();
  await database.delete(clans).where(eq(clans.id, clanId));

  revalidatePath("/", "layout");
}

/**
 * Forzar el @handle de OTRO usuario, solo para el admin (`esDesarrollador`).
 * Pensado para el caso real de handles ofensivos creados antes de que el
 * filtro los detectara (p. ej. `maricon439`, 29 sept 2026): el filtro ya
 * bloquea que se creen nuevos, pero no toca los que ya existen — esto le da
 * al admin una forma de corregirlos sin tener que tocar la base a mano.
 */
export async function adminSetHandleAction(formData: FormData): Promise<void> {
  const adminUserId = await requireUserId();
  const adminProfile = await getProfileByUserId(adminUserId);
  if (!adminProfile?.esDesarrollador) return;

  const targetUserId = String(formData.get("targetUserId") ?? "");
  const handle = String(formData.get("handle") ?? "").trim().toLowerCase();
  if (!targetUserId) return;
  const volver = (msg: string) =>
    formData.get("volver") === "moderacion"
      ? `/admin?tab=moderation&handleMsg=${msg}`
      : `/admin/usuarios/${targetUserId}?handleMsg=${msg}`;

  if (!HANDLE_RE.test(handle)) redirect(volver("formato"));
  if (await isHandleTaken(handle, targetUserId)) redirect(volver("cogido"));
  if (contieneLenguajeOfensivo(handle)) redirect(volver("ofensivo"));

  await setHandle(targetUserId, handle);
  revalidatePath("/", "layout");
  redirect(volver("ok"));
}

const CAMPOS_VACIABLES = ["name", "firstName", "lastName", "profileTitle", "statusText"] as const;

/** Moderación: vacía un texto libre ofensivo de otro usuario (el handle no, ese se cambia). */
export async function adminVaciarCampoAction(formData: FormData): Promise<void> {
  const adminUserId = await requireUserId();
  const adminProfile = await getProfileByUserId(adminUserId);
  if (!adminProfile?.esDesarrollador) return;

  const targetUserId = String(formData.get("targetUserId") ?? "");
  const campo = String(formData.get("campo") ?? "") as (typeof CAMPOS_VACIABLES)[number];
  if (!targetUserId || !CAMPOS_VACIABLES.includes(campo)) return;

  const database = getDb();
  await database.update(users).set({ [campo]: null }).where(eq(users.id, targetUserId));
  revalidatePath("/", "layout");
}

/* ---------------------------------- Juegos manuales --------------------------------- */

import { cookies } from "next/headers";

export async function updateLanguageAction(locale: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, { path: "/", maxAge: 31536000 }); // 1 year

  // Si hay sesión iniciada, guardarlo también en base de datos para que le persiga
  const session = await auth();
  if (session?.user?.id) {
    const database = getDb();
    await database.update(users).set({ language: locale }).where(eq(users.id, session.user.id));
  }
  
  revalidatePath("/", "layout");
}

export interface AddManualGameInput {
  igdbId: number;
  title: string;
  coverUrl?: string;
  pegi?: string;
  genres?: string[];
  developer?: string;
  publisher?: string;
  deviceLabel: string;
  completed: boolean;
}

export async function addManualGameAction(input: AddManualGameInput): Promise<ActionState> {
  const userId = await requireUserId();

  if (!input.title.trim() || !Number.isFinite(input.igdbId)) {
    return { error: "Elige un juego de los resultados de búsqueda." };
  }
  if (!input.deviceLabel.trim()) {
    return { error: "Di en qué lo has jugado (Switch, PS1, retro...)." };
  }

  await addManualGame(userId, {
    ...input,
    deviceLabel: input.deviceLabel.trim(),
  });

  revalidatePath("/", "layout");

  return { success: `${input.title} añadido a tu biblioteca.` };
}

export async function addToWishlistAction(input: AddManualGameInput): Promise<ActionState> {
  const userId = await requireUserId();

  if (!input.title.trim() || !Number.isFinite(input.igdbId)) {
    return { error: "Elige un juego de los resultados." };
  }

  await addManualGame(userId, {
    ...input,
    deviceLabel: input.deviceLabel.trim() || "Deseados",
  }, true);

  revalidatePath("/", "layout");

  return { success: `${input.title} añadido a tu lista de deseados.` };
}

export async function setManualGameCompletedAction(gameId: string, completed: boolean): Promise<void> {
  const userId = await requireUserId();
  await setManualGameCompleted(userId, gameId, completed);
  revalidatePath("/", "layout");
}

/* ------------------------------------- Ocultar ------------------------------------ */

/**
 * Guarda de golpe el set completo de funciones ocultas (el formulario manda
 * todas las que quedaron marcadas) — no hay "ocultar una a una" desde aquí,
 * es una única lista que se reemplaza entera. Ver lib/navPreferences.ts.
 */
export async function setHiddenNavItemsAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const items = formData.getAll("navKey").map(String);
  await setHiddenNavItems(userId, items);
  revalidatePath("/", "layout");
}

export async function setAvisosActivosAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  await setAvisosActivos(userId, formData.getAll("categoria").map(String));
  revalidatePath("/ajustes");
}

export async function setPanelOcultoAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  await setPanelOculto(userId, formData.getAll("navKey").map(String));
  revalidatePath("/");
}

/* ---------------------------------- Modo enfoque --------------------------------- */

/**
 * Vuelve a pedir los trofeos de UN juego a su plataforma.
 *
 * Es lo que hace útil el modo enfoque como segunda pantalla: acabas de sacar
 * un trofeo en la tele y quieres verlo aquí sin esperar al cron ni
 * resincronizar la biblioteca entera (que son decenas de segundos). Esto es
 * una sola llamada, la del juego que tienes delante. Lógica movida a
 * `refrescarJuego` (src/lib/profiles.ts) para reutilizarla también desde
 * `/api/mobile/*`.
 */
export async function refrescarJuegoAction(gameId: string) {
  const userId = await requireUserId();
  const resultado = await refrescarJuego(userId, gameId);
  revalidatePath("/", "layout");
  return resultado;
}

export async function setFavoritesAction(gameIds: string[]) {
  const userId = await requireUserId();
  const db = getDb();
  
  await db
    .update(users)
    .set({ favorites: gameIds })
    .where(eq(users.id, userId));

  revalidatePath('/', 'layout');
}

/**
 * Vídeo de YouTube de guía para un trofeo — ver `buscarVideoGuiaTrofeo` en
 * lib/videoGuides.ts (compartida con `api/mobile/games/.../guide`, para no
 * duplicar la lógica de caché entre web y móvil).
 */
export async function searchTrophyGuideAction(
  gameTitle: string,
  trophyName: string,
  gameId?: string,
  trophyId?: string,
) {
  // Sin sesión a propósito (ver lib/videoGuides.ts), así que el límite va
  // por usuario si lo hay y si no por IP.
  const session = await auth();
  if (!(await limitar("guiaVideo", session?.user?.id ?? await ipActual()))) return null;
  return buscarVideoGuiaTrofeo(gameTitle, trophyName, gameId, trophyId);
}

/**
 * "Buscar otro vídeo" — ver `rebuscarVideoGuiaTrofeo` en lib/videoGuides.ts.
 * Requiere sesión (no anónimo) para no dejar que cualquiera dispare
 * búsquedas de scraping sin límite — el dato en sí es compartido entre
 * todos, no privado de quien lo pide.
 */
export async function rebuscarVideoGuiaAction(gameId: string, trophyId: string): Promise<string | null> {
  const userId = await requireUserId();
  if (!(await limitar("guiaVideoRebuscar", userId))) return null;
  return rebuscarVideoGuiaTrofeo(gameId, trophyId);
}

export async function submitExpressReviewAction(gameId: string, ratingPedido: number, review: string) {
  const userId = await requireUserId();
  const db = getDb();
  const rating = normalizarNota(ratingPedido);

  if (review.length > RESENA_MAX) throw new Error(`La reseña puede tener como mucho ${RESENA_MAX} caracteres.`);
  if (contieneLenguajeOfensivo(review)) {
    throw new Error("Esa reseña contiene lenguaje ofensivo — cámbiala e inténtalo de nuevo.");
  }

  await db
    .update(userGames)
    .set({ rating, review, reviewDate: new Date() })
    .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)));

  // Igual que en rateGameAction: si editas tu reseña, se actualiza la
  // actividad que ya había en vez de amontonar una nueva.
  const [existente] = await db
    .select({ id: activities.id })
    .from(activities)
    .where(and(eq(activities.userId, userId), eq(activities.gameId, gameId), eq(activities.type, "review")))
    .limit(1);

  if (existente) {
    await db
      .update(activities)
      .set({ rating, review, createdAt: new Date() })
      .where(eq(activities.id, existente.id));
  } else {
    await db.insert(activities).values({
      id: crypto.randomUUID(),
      userId,
      type: "review",
      gameId,
      rating,
      review,
    });
  }

  revalidatePath("/", "layout");
}

export async function pinTrophyAction(gameId: string, trophyId: string) {
  const userId = await requireUserId();
  const db = getDb();

  const profile = await getProfileByUserId(userId);
  let showcase = profile?.showcaseTrophies || [];
  
  const existingIndex = showcase.findIndex(t => t.gameId === gameId && t.trophyId === trophyId);
  if (existingIndex >= 0) {
    showcase = showcase.filter((_, i) => i !== existingIndex);
  } else {
    if (showcase.length >= 3) {
      return { error: "Solo puedes fijar un máximo de 3 trofeos." };
    }
    showcase.push({ gameId, trophyId });
  }

  await db
    .update(users)
    .set({ showcaseTrophies: showcase })
    .where(eq(users.id, userId));

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Contador manual de un trofeo ("gana 50 partidas", "encuentra las 100
 * plumas") — ver `setManualTrophyProgress` en lib/profiles.ts. `target: null`
 * lo borra, para poder "quitar el contador" sin dejar un 0/0 raro.
 */
export async function actualizarContadorManualAction(
  gameId: string,
  trophyId: string,
  current: number,
  target: number | null,
): Promise<{ error?: string }> {
  const userId = await requireUserId();

  if (target != null && (!Number.isFinite(target) || target <= 0)) {
    return { error: "La meta tiene que ser un número mayor que 0." };
  }
  if (!Number.isFinite(current) || current < 0) {
    return { error: "El contador no puede ser negativo." };
  }

  await setManualTrophyProgress(userId, gameId, trophyId, Math.round(current), target != null ? Math.round(target) : null);
  revalidatePath("/", "layout");
  return {};
}

/* --------------------------------- Guías escritas --------------------------------- */

const GUIA_MAX_TITULO = 120;
const GUIA_MAX_TEXTO = 20_000;
const GUIA_MAX_RESPUESTA = 2_000;

export async function createGuideAction(gameId: string, title: string, body: string): Promise<{ error?: string; id?: string }> {
  const userId = await requireUserId();
  if (!(await limitar("comentario", userId))) return { error: "Has publicado mucho seguido. Espera un momento." };

  const tituloLimpio = title.trim();
  const textoLimpio = body.trim();
  if (!tituloLimpio || !textoLimpio) {
    return { error: "Ponle un título y algo de texto." };
  }
  // Sin tope, una guía podía ocupar lo que dejara el cuerpo de la petición
  // (~1 MB) — y se pinta entera en la página de guías.
  if (tituloLimpio.length > GUIA_MAX_TITULO || textoLimpio.length > GUIA_MAX_TEXTO) {
    return { error: `Como mucho ${GUIA_MAX_TITULO} caracteres de título y ${GUIA_MAX_TEXTO} de texto.` };
  }
  if (contieneLenguajeOfensivo(tituloLimpio) || contieneLenguajeOfensivo(textoLimpio)) {
    return { error: "Esa guía contiene lenguaje ofensivo — cámbiala e inténtalo de nuevo." };
  }

  const id = await createGuide(userId, gameId, tituloLimpio, textoLimpio);
  revalidatePath(`/juego/${gameId}/guias`);
  return { id };
}

export async function replyToGuideAction(guideId: string, gameId: string, body: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  if (!(await limitar("comentario", userId))) return { error: "Has respondido mucho seguido. Espera un momento." };

  const textoLimpio = body.trim();
  if (!textoLimpio) return { error: "Escribe algo antes de responder." };
  if (textoLimpio.length > GUIA_MAX_RESPUESTA) return { error: `Como mucho ${GUIA_MAX_RESPUESTA} caracteres.` };
  if (contieneLenguajeOfensivo(textoLimpio)) {
    return { error: "Esa respuesta contiene lenguaje ofensivo — cámbiala e inténtalo de nuevo." };
  }

  await replyToGuide(userId, guideId, textoLimpio);
  revalidatePath(`/juego/${gameId}/guias/${guideId}`);
  return {};
}

export async function deleteGuideAction(guideId: string, gameId: string): Promise<void> {
  const userId = await requireUserId();
  await deleteGuide(userId, guideId);
  revalidatePath(`/juego/${gameId}/guias`);
}

/* ---------------------------- Guías escritas de trofeo (TrophyGuideModal) --------------------------- */

/**
 * El idioma con el que se guarda no es una elección del formulario: sale de
 * `users.language` (por defecto "es-ES"), la misma preferencia de la
 * plataforma — de momento siempre "es" porque no hay más interfaz que esa,
 * pero ya sale de la persona, no a pelo en el código.
 */
export async function saveTrophyGuideAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const gameId = String(formData.get("gameId") ?? "");
  const trophyId = String(formData.get("trophyId") ?? "");
  const body = String(formData.get("body") ?? "");

  if (!gameId || !trophyId) return { error: "Falta el trofeo." };

  const db = getDb();
  const [dbUser] = await db.select({ language: users.language }).from(users).where(eq(users.id, userId)).limit(1);
  const idioma = (dbUser?.language ?? "es-ES").slice(0, 2);

  try {
    await upsertTrophyGuide(userId, gameId, trophyId, body, idioma);
    revalidatePath(`/juego/${gameId}`);
    return { success: "Guía publicada." };
  } catch (error) {
    if (error instanceof TrophyGuideError) return { error: error.message };
    return { error: "No se ha podido guardar la guía." };
  }
}

/** Lo que necesita el modal para pintarse: las guías que hay y, si el visitante ha iniciado sesión, cuál de ellas es la suya (para "editar" en vez de "publicar"). */
export async function getTrophyGuidesAction(
  gameId: string,
  trophyId: string,
): Promise<{ guides: TrophyGuideRow[]; currentUserId: string | null }> {
  const session = await auth();
  const guides = await listTrophyGuides(gameId, trophyId);
  return { guides, currentUserId: session?.user?.id ?? null };
}

export async function deleteTrophyGuideAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const gameId = String(formData.get("gameId") ?? "");
  const trophyId = String(formData.get("trophyId") ?? "");

  if (!gameId || !trophyId) return;

  await deleteTrophyGuide(userId, gameId, trophyId);
  revalidatePath(`/juego/${gameId}`);
}

/* ------------------------- Puesta al día por tandas ------------------------ */

export interface PuestaAlDia {
  /** Juegos refrescados en esta tanda. */
  hechos: number;
  /** Los que siguen pendientes después de esta tanda. */
  restantes: number;
  error?: string;
}

/**
 * Refresca de golpe unos cuantos juegos pendientes de la biblioteca.
 *
 * La biblioteca sabe cuántos trofeos tiene cada juego, pero el detalle (qué
 * trofeo y cuándo) solo llega al pedirlo juego a juego. Hasta ahora eso solo
 * pasaba al abrir cada ficha o cuando el cron rellenaba unos cuantos por
 * pasada — con una biblioteca grande, días de espera y ninguna forma de
 * acelerarlo a mano.
 *
 * Va en tandas acotadas por TIEMPO, no solo por número, igual que el cron
 * (`api/cron/sync/route.ts`): cada juego es una llamada a PSN o Steam y no
 * se sabe de antemano cuánto tardará, así que se van haciendo hasta agotar
 * el presupuesto y se devuelve cuántos quedan para que la interfaz pueda
 * ofrecer otra tanda. Sin esto, una biblioteca de 300 juegos agotaría el
 * tiempo de la función a medias y no se guardaría el progreso.
 *
 * Xbox queda fuera (lo filtra `juegosPendientes`): OpenXBL da 150
 * peticiones/hora COMPARTIDAS entre todos los usuarios de Paragon, así que
 * una puesta al día masiva pedida por una sola persona dejaría sin cuota a
 * las demás.
 */
export async function ponerseAlDiaAction(): Promise<PuestaAlDia> {
  const userId = await requireUserId();

  const POR_TANDA = 12;
  /** Presupuesto de tiempo de una tanda. Corto a propósito: es una acción
   * con alguien esperando delante, no un proceso de fondo. */
  const PRESUPUESTO_MS = 20_000;

  const profile = await getProfileByUserId(userId);
  const pendientes = await juegosPendientes(userId, POR_TANDA);

  const arranque = Date.now();
  let hechos = 0;

  for (const gameId of pendientes) {
    if (Date.now() - arranque > PRESUPUESTO_MS) break;

    const { platform } = parseGameKey(gameId);
    // `juegosPendientes` ya filtra a PSN/Steam en SQL, pero la guarda se
    // queda: es lo que impide que un cambio futuro en esa consulta cuele
    // aqui juegos manuales (que no tienen nada que sincronizar) o de Xbox
    // (cuota compartida) sin que nadie se entere.
    if (platform !== "psn" && platform !== "steam") continue;

    const account = accountFor(profile, platform);
    if (!account) continue;

    try {
      await syncGameTrophies(userId, { platform, accountId: account.accountId }, gameId);
      hechos += 1;
    } catch {
      // Un juego que falla (retirado de la tienda, API con un mal rato) no
      // puede cortar la tanda entera: se salta y se sigue con el siguiente.
    }
  }

  // Se recuentan DESPUÉS de la tanda, no se restan a ojo: los que fallaron
  // siguen pendientes de verdad y tienen que seguir contando como tales.
  const salud = await saludSincronizacion(userId);
  const restantes = salud
    .filter((s) => s.plataforma === "psn" || s.plataforma === "steam")
    .reduce((n, s) => n + s.sinDetalle + s.caducados, 0);

  if (hechos > 0) revalidatePath("/", "layout");

  return { hechos, restantes };
}

/* ---------------------------------- Time to Beat (HLTB) --------------------------------- */

import { syncGameHltb } from "@/lib/hltb";

export async function syncHltbAction(gameId: string, title: string): Promise<void> {
  await requireUserId();
  // Call the HLTB service
  await syncGameHltb(gameId, title);
  revalidatePath("/planificador");
}

/* ---------------------------------- Anclar juego (objetivo actual) --------------------------------- */

/**
 * Ancla o desancla un juego como "el objetivo ahora mismo" — el platino al
 * que le estás dando prioridad, visible en tu propio perfil y en el de
 * quien te visite. Solo uno a la vez: anclar otro desancla automáticamente
 * el anterior (no tendría sentido enseñar dos "objetivos actuales" a la
 * vez), así que esto es un UPDATE de toda la biblioteca del usuario, no un
 * simple toggle de una fila — pero solo dos columnas, no cuesta más que
 * cualquier otro cambio de esta pantalla.
 *
 * Mismo patrón de propiedad que `rateGameAction`/`writeReviewAction`: el
 * `where` va siempre contra `userGames.userId = requireUserId()`, así que
 * nadie puede anclar (ni desanclar) un juego en la biblioteca de otro.
 */
export async function togglePinGameAction(gameId: string): Promise<{ pinned: boolean }> {
  const userId = await requireUserId();
  const result = await togglePinnedGame(userId, gameId);
  revalidatePath("/", "layout");
  return result;
}

/* ---------------------------------- Cerrojo de Hitos --------------------------------- */

/**
 * Reserva (o quita la reserva de) este juego para tu próximo platino en
 * número redondo — ver lib/milestones.ts. Solo uno a la vez: reservar uno
 * nuevo sustituye al anterior, igual que anclar un juego (togglePinGameAction
 * arriba) — no hace falta una constraint en la base, es una sola columna en
 * `users`, no una fila por juego.
 */
export async function toggleReservarHitoAction(gameId: string): Promise<{ reservado: boolean }> {
  const userId = await requireUserId();
  const result = await toggleReservedMilestone(userId, gameId);
  revalidatePath("/", "layout");
  return result;
}

/* ---------------------------------- Notas privadas por juego --------------------------------- */

/**
 * Guarda (o borra, si llega vacía) tu nota privada sobre un juego — un
 * recordatorio de progreso ("me falta el coleccionable 14 del capítulo 3"),
 * nunca pública. Mismo patrón de propiedad que `rateGameAction`/
 * `writeReviewAction`: el `where` va siempre contra tu propio `userId`.
 *
 * Sin actividad ni notificación de por medio a propósito — a diferencia de
 * `writeReviewAction`, esto no es contenido para el feed de nadie.
 */
export async function saveGameNotesAction(gameId: string, notes: string): Promise<void> {
  const userId = await requireUserId();
  await saveGameNotes(userId, gameId, notes);
  revalidatePath("/", "layout");
}

const FORMATOS_ADQUISICION = ["fisico", "digital", "ps_plus", "game_pass", "prestado", "gratis"] as const;

/**
 * De dónde tienes el juego y cuánto pagaste — los dos campos de
 * `userGames.acquisitionFormat`/`pricePaid` (schema.ts), rellenados a mano
 * por el usuario. `format: null` borra el formato; `price: null` borra el
 * precio — cada uno se puede quitar sin tocar el otro.
 */
export async function actualizarAdquisicionAction(
  gameId: string,
  format: string | null,
  price: number | null,
): Promise<{ error?: string }> {
  const userId = await requireUserId();

  if (format != null && !FORMATOS_ADQUISICION.includes(format as (typeof FORMATOS_ADQUISICION)[number])) {
    return { error: "Formato no válido." };
  }
  if (price != null && (!Number.isFinite(price) || price < 0)) {
    return { error: "El precio no puede ser negativo." };
  }

  const db = getDb();
  await db
    .update(userGames)
    .set({ acquisitionFormat: format as (typeof FORMATOS_ADQUISICION)[number] | null, pricePaid: price })
    .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)));

  revalidatePath("/", "layout");
  return {};
}

/* ------------------------------------------- Ligas ------------------------------------------ */

const UNIDADES_DURACION: LeagueDurationUnit[] = ["dias", "semanas", "meses", "anios"];

export async function createLeagueAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "");
  const durationValueRaw = String(formData.get("durationValue") ?? "");
  const durationUnitRaw = String(formData.get("durationUnit") ?? "");

  const durationValue = Number(durationValueRaw);
  const durationUnit = UNIDADES_DURACION.includes(durationUnitRaw as LeagueDurationUnit) ? (durationUnitRaw as LeagueDurationUnit) : null;
  const duration = durationValue > 0 && durationUnit ? { value: durationValue, unit: durationUnit } : undefined;

  const errorOfensivo = errorSiOfensivo(name);
  if (errorOfensivo) return { error: errorOfensivo };

  const league = await createLeague(userId, name, duration);
  if (!league) return { error: "Ponle un nombre a la liga." };

  revalidatePath("/ligas");
  redirect(`/ligas/${league.id}`);
}

export async function acceptLeagueInviteAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const leagueId = String(formData.get("leagueId") ?? "");
  if (!leagueId) return;

  await acceptLeagueInvite(leagueId, userId);
  revalidatePath("/ligas");
  revalidatePath(`/ligas/${leagueId}`);
}

export async function declineLeagueInviteAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const leagueId = String(formData.get("leagueId") ?? "");
  if (!leagueId) return;

  await declineLeagueInvite(leagueId, userId);
  revalidatePath("/ligas");
  // Se llama tanto desde /ligas (lista de invitaciones) como desde
  // /ligas/{id} (al abrir el enlace de la propia invitación) — en el
  // segundo caso, quedarse en esa página tras rechazarla ya no tiene nada
  // que enseñar, así que siempre vuelve a la lista.
  redirect("/ligas");
}

export async function addLeagueMemberAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const leagueId = String(formData.get("leagueId") ?? "");
  const friendUserId = String(formData.get("friendUserId") ?? "");
  if (!leagueId || !friendUserId) return;

  try {
    await addLeagueMember(leagueId, userId, friendUserId);
  } catch (error) {
    if (!(error instanceof NotFriendsError)) throw error;
    // Solo puede pasar si alguien manipula el formulario a mano (la lista
    // que se ve en la web solo ofrece amigos reales) — sin aviso al usuario,
    // no hay nada que explicarle que no supiera ya.
  }
  revalidatePath(`/ligas/${leagueId}`);
}

export async function removeLeagueMemberAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const leagueId = String(formData.get("leagueId") ?? "");
  const targetUserId = String(formData.get("targetUserId") ?? "");
  if (!leagueId || !targetUserId) return;

  await removeLeagueMember(leagueId, userId, targetUserId);
  revalidatePath(`/ligas/${leagueId}`);
  revalidatePath("/ligas");
}

export async function deleteLeagueAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const leagueId = String(formData.get("leagueId") ?? "");
  if (!leagueId) return;

  await deleteLeague(leagueId, userId);
  revalidatePath("/ligas");
  redirect("/ligas");
}

/** Fija el juego de reto de la liga — `gameId` vacío lo quita. */
export async function setLeagueChallengeAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const leagueId = String(formData.get("leagueId") ?? "");
  const gameId = String(formData.get("gameId") ?? "");
  if (!leagueId) return;

  await setLeagueChallenge(leagueId, userId, gameId || null);
  revalidatePath(`/ligas/${leagueId}`);
}

/* ---------------------------------- Alertas de precio --------------------------------- */

/** Ver lib/priceAlerts.ts. `precio` en euros (Steam España). */
export async function guardarAlertaPrecioAction(
  steamAppId: string,
  gameId: string,
  titulo: string,
  precio: number,
): Promise<{ error?: string }> {
  const userId = await requireUserId();
  if (!/^\d{1,10}$/.test(steamAppId) || !gameId || gameId.length > 100) return { error: "Juego no válido." };
  if (!Number.isFinite(precio) || precio < 0.01 || precio > 999) return { error: "Pon un precio entre 0,01 y 999 €." };
  await guardarAlertaPrecio(userId, {
    steamAppId,
    gameId,
    titulo: titulo.trim().slice(0, 120) || "Tu juego",
    precioObjetivo: Math.round(precio * 100) / 100,
  });
  revalidatePath(`/juego/${gameId}`);
  return {};
}

export async function borrarAlertaPrecioAction(steamAppId: string, gameId: string): Promise<void> {
  const userId = await requireUserId();
  await borrarAlertaPrecio(userId, steamAppId);
  revalidatePath(`/juego/${gameId}`);
}

/* ---------------------------------- Objetivos con fecha --------------------------------- */

/** Ver lib/goals.ts. `fecha` en ISO de día ("2026-10-31") o `null` para quitarla. */
export async function setObjetivoFechaAction(gameId: string, fecha: string | null): Promise<void> {
  const userId = await requireUserId();
  if (fecha !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(new Date(fecha).getTime()))) return;
  // Solo juegos de su propia biblioteca: `ownsGame` con el id específico.
  if (!(await ownsGame(userId, gameId))) return;
  await setObjetivoFecha(userId, gameId, fecha);
  revalidatePath("/planificador");
}

/* ---------------------------------- Sesiones de trofeos online --------------------------------- */

/** Ver lib/sesiones.ts. `fechaHora` en ISO (el navegador convierte su hora local). */
export async function crearSesionAction(datos: {
  gameId: string;
  trofeo: string;
  descripcion: string;
  fechaHora: string;
  plazas: number;
}): Promise<{ error?: string; id?: string }> {
  const userId = await requireUserId();
  if (!(await limitar("comentario", userId))) return { error: "Espera un momento antes de crear otra sesión." };
  try {
    const id = await crearSesion(userId, { ...datos, fechaHora: new Date(datos.fechaHora) });
    revalidatePath("/sesiones");
    return { id };
  } catch (e) {
    if (e instanceof SesionError) return { error: e.message };
    throw e;
  }
}

export async function apuntarseSesionAction(sessionId: string, apuntar: boolean): Promise<{ error?: string }> {
  const userId = await requireUserId();
  try {
    if (apuntar) await apuntarse(userId, sessionId);
    else await salirse(userId, sessionId);
  } catch (e) {
    if (e instanceof SesionError) return { error: e.message };
    throw e;
  }
  revalidatePath("/sesiones");
  return {};
}

export async function cancelarSesionAction(sessionId: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  try {
    await cancelarSesion(userId, sessionId);
  } catch (e) {
    if (e instanceof SesionError) return { error: e.message };
    throw e;
  }
  revalidatePath("/sesiones");
  return {};
}

/* ---------------------------------- Platinar juntos --------------------------------- */

/** Ver lib/coop.ts. */
export async function proponerRetoAction(datos: {
  invitadoId: string;
  miGameId: string;
  suGameId: string;
  fecha: string;
}): Promise<{ error?: string }> {
  const userId = await requireUserId();
  if (!(await limitar("comentario", userId))) return { error: "Espera un momento antes de proponer otro reto." };
  try {
    await proponerReto(userId, datos);
  } catch (e) {
    if (e instanceof CoopError) return { error: e.message };
    throw e;
  }
  revalidatePath("/amigos");
  return {};
}

export async function responderRetoAction(retoId: string, aceptar: boolean): Promise<{ error?: string }> {
  const userId = await requireUserId();
  try {
    await responderReto(userId, retoId, aceptar);
  } catch (e) {
    if (e instanceof CoopError) return { error: e.message };
    throw e;
  }
  revalidatePath("/amigos");
  return {};
}

/* ---------------------------------- Retos entre amigos --------------------------------- */

/** Ver lib/retosAmigos.ts. `error` es un código: el texto lo pone la interfaz. */
export async function crearRetoAmigosAction(datos: { invitados: string[]; dias: number; titulo?: string }): Promise<{ error?: string }> {
  const userId = await requireUserId();
  if (!(await limitar("comentario", userId))) return { error: "espera" };
  try {
    await crearRetoAmigos(userId, datos);
  } catch (e) {
    if (e instanceof RetoAmigosError) return { error: e.codigo };
    throw e;
  }
  revalidatePath("/amigos");
  return {};
}

export async function responderRetoAmigosAction(challengeId: string, aceptar: boolean): Promise<{ error?: string }> {
  const userId = await requireUserId();
  try {
    await responderRetoAmigos(userId, challengeId, aceptar);
  } catch (e) {
    if (e instanceof RetoAmigosError) return { error: e.codigo };
    throw e;
  }
  revalidatePath("/amigos");
  return {};
}

export async function cancelarRetoAmigosAction(challengeId: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  try {
    await cancelarRetoAmigos(userId, challengeId);
  } catch (e) {
    if (e instanceof RetoAmigosError) return { error: e.codigo };
    throw e;
  }
  revalidatePath("/amigos");
  return {};
}

/* ---------------------------------- Vitrinas temáticas --------------------------------- */

/** Ver lib/vitrinas.ts. */
export async function crearVitrinaAction(datos: {
  titulo: string;
  tipo: "manual" | "desarrolladora" | "raros";
  filtro?: string;
  gameIds?: string[];
}): Promise<{ error?: string }> {
  const userId = await requireUserId();
  try {
    await crearVitrina(userId, datos);
  } catch (e) {
    if (e instanceof VitrinaError) return { error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  return {};
}

export async function borrarVitrinaAction(id: string): Promise<void> {
  const userId = await requireUserId();
  await borrarVitrina(userId, id);
  revalidatePath("/", "layout");
}

/* ---------------------------------- Horas ignoradas --------------------------------- */

/** Ver lib/horasIgnoradas.ts. Solo juegos de la propia biblioteca. */
export async function setHorasIgnoradasAction(gameId: string, ignorar: boolean): Promise<void> {
  const userId = await requireUserId();
  if (!(await ownsGame(userId, gameId))) return;
  await setHorasIgnoradas(userId, gameId, ignorar);
  revalidatePath("/", "layout");
}

/* ------------------------------ Apariencia ------------------------------ */

const TAMANOS_TEXTO_VALIDOS = ["", "grande", "enorme", "pequeno"];

/**
 * Guarda acento/estilo/tamaño de texto en la cuenta (antes solo vivían en el
 * localStorage de un navegador). Sin sesión no hace nada — y a propósito no
 * usa `requireUserId`, que redirige: esto se llama "disparar y olvidar" desde
 * el selector y una redirección ahí sacaría a la persona de la página.
 */
export async function guardarAparienciaAction(ap: { acento?: string; acentoLibre?: string; estilo?: string; tamanoTexto?: string }): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  const acento = /^(accent-[a-z]+)?$/.test(ap.acento ?? "") ? (ap.acento ?? "") : "";
  const acentoLibre = /^(#[0-9a-f]{6})?$/i.test(ap.acentoLibre ?? "") ? (ap.acentoLibre ?? "") : "";
  let estilo = /^(estilo-[a-z0-9]+)?$/.test(ap.estilo ?? "") ? (ap.estilo ?? "") : "";
  const tamanoTexto = TAMANOS_TEXTO_VALIDOS.includes(ap.tamanoTexto ?? "") ? (ap.tamanoTexto ?? "") : "";
  if (estilo && ESTILO_REQUISITOS[estilo] !== undefined) {
    const nivel = await getParagonLevel(userId);
    if (nivel.level < ESTILO_REQUISITOS[estilo]) estilo = "";
  }

  await getDb().update(users).set({ apariencia: { acento, acentoLibre, estilo, tamanoTexto } }).where(eq(users.id, userId));
}
