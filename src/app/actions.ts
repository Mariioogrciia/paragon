"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users, userGames, activities, activityComments, activityReactions, platformAccounts } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth, signIn, signOut } from "@/auth";
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
  getProfileByUserId,
  isHandleTaken,
  linkAccount,
  removeFriend,
  resyncLibraries,
  resyncPlatform,
  sendFriendRequest,
  setHandle,
  setProfileInfo,
  unlinkAccount,
} from "@/lib/profiles";
import { syncGameTrophies } from "@/lib/sync";
import { parseGameKey } from "@/lib/types";
import { PsnProfileNotFoundError } from "@/lib/psn/client";
import { PsnAuthError, PsnNotConfiguredError } from "@/lib/psn/auth";
import {
  SteamNotConfiguredError,
  SteamPrivateProfileError,
  SteamProfileNotFoundError,
} from "@/lib/steam/client";
import { XblNotConfiguredError, XblProfileNotFoundError } from "@/lib/xbl/client";
import { addManualGame, setManualGameCompleted } from "@/lib/manualGames";
import { createGuide, deleteGuide, replyToGuide } from "@/lib/guides";
import { upsertTrophyGuide, deleteTrophyGuide, listTrophyGuides, TrophyGuideError, type TrophyGuideRow } from "@/lib/trophyGuides";
import { marcarTodoLeido } from "@/lib/notifications";
import { ownsGame } from "@/lib/community";
import { juegosPendientes, saludSincronizacion } from "@/lib/syncHealth";
import { votarDificultad } from "@/lib/communityDifficulty";
import { getGameRecommendations, type GameRecommendation } from "@/lib/recommendations";
import type { AccountPlatform } from "@/lib/types";
import { setDiscordWebhookUrl, esWebhookDiscordValido, enviarWebhookDePrueba } from "@/lib/discordWebhook";
import { guardarSuscripcionPush, borrarSuscripcionPush, enviarPush } from "@/lib/webPush";

export interface ActionState {
  error?: string;
  success?: string;
}

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");
  return session.user.id;
}

/** Traduce los fallos de las plataformas a algo que un humano pueda accionar. */
function describeError(error: unknown): string {
  if (error instanceof PsnNotConfiguredError)
    return "El servidor no tiene configurado el acceso a PSN (falta PSN_NPSSO).";
  if (error instanceof PsnAuthError) return error.message;
  if (error instanceof PsnProfileNotFoundError) return error.message;

  if (error instanceof SteamNotConfiguredError) return error.message;
  if (error instanceof SteamProfileNotFoundError) return error.message;
  if (error instanceof SteamPrivateProfileError) return error.message;

  if (error instanceof XblNotConfiguredError) return error.message;
  if (error instanceof XblProfileNotFoundError) return error.message;

  return "No se ha podido contactar con la plataforma. Inténtalo en un momento.";
}

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

  await setProfileInfo(userId, name, image || null);
  revalidatePath("/", "layout");

  return { success: "Perfil actualizado correctamente." };
}

/* ------------------------------ Webhook de Discord ----------------------------- */

export async function setDiscordWebhookAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const url = String(formData.get("url") ?? "").trim();

  try {
    await setDiscordWebhookUrl(userId, url || null);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo guardar." };
  }

  revalidatePath("/ajustes");
  return url ? { success: "Webhook guardado. Los logros nuevos se anuncian ahí." } : { success: "Webhook quitado." };
}

export async function testDiscordWebhookAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUserId();
  const url = String(formData.get("url") ?? "").trim();

  if (!url) return { error: "Pega primero la URL del webhook." };
  if (!esWebhookDiscordValido(url)) {
    return { error: "Eso no parece una URL de webhook de Discord." };
  }

  const ok = await enviarWebhookDePrueba(url);
  return ok
    ? { success: "Mensaje de prueba enviado — revisa el canal de Discord." }
    : { error: "Discord no aceptó el mensaje. Comprueba que el webhook sigue existiendo." };
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

/** Qué hay que escribir en cada plataforma, y qué decir cuando no se puede leer. */
const PLATFORM_COPY: Record<
  AccountPlatform,
  { field: string; missing: string; privado: (nombre: string) => string }
> = {
  psn: {
    field: "onlineId",
    missing: "Escribe tu ID de PlayStation.",
    privado: (nombre) =>
      `Perfil ${nombre} encontrado, pero PlayStation no nos deja leer sus trofeos. ` +
      `Tiene que ser amigo en PSN de la cuenta del servidor, o tener los trofeos en público.`,
  },
  steam: {
    field: "steamId",
    missing: "Escribe tu usuario de Steam, tu SteamID64 o la URL de tu perfil.",
    privado: (nombre) =>
      `Perfil ${nombre} encontrado, pero es privado. En Steam: Perfil → Editar perfil → ` +
      `Privacidad, y pon "Mi perfil" y "Detalles del juego" en público.`,
  },
  google: {
    field: "email",
    missing: "Escribe tu correo electrónico asociado a Google Play.",
    privado: (nombre) => `Perfil privado.`,
  },
  xbox: {
    field: "gamertag",
    missing: "Escribe tu Gamertag de Xbox.",
    privado: (nombre) => `Perfil privado o no encontrado.`,
  },
  epic: {
    field: "username",
    missing: "Escribe tu nombre de usuario de Epic Games.",
    privado: (nombre) => `Perfil privado o no encontrado.`,
  },
  ubisoft: {
    field: "username",
    missing: "Escribe tu nombre de usuario de Ubisoft Connect.",
    privado: (nombre) => `Perfil privado o no encontrado.`,
  },
};

async function linkPlatform(
  platform: AccountPlatform,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const copy = PLATFORM_COPY[platform];
  const input = String(formData.get(copy.field) ?? "").trim();

  if (!input) return { error: copy.missing };

  try {
    const cuenta = await linkAccount(userId, platform, input);
    revalidatePath("/", "layout");

    if (!cuenta.legible) return { error: copy.privado(cuenta.username) };

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

export async function linkGoogleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return linkPlatform("google", formData);
}

export async function linkXboxAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return linkPlatform("xbox", formData);
}

export async function linkEpicOAuthAction(): Promise<void> {
  const userId = await requireUserId();
  // Al iniciar sesión, Auth.js redirigirá a Epic Games, y al volver pasará por el linkAccount de auth.ts
  await signIn("epic", { redirectTo: "/ajustes/plataformas" });
}

export async function linkUbisoftAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return linkPlatform("ubisoft", formData);
}

export async function unlinkAccountAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const platform = String(formData.get("platform") ?? "") as AccountPlatform;

  if (!["psn", "steam", "google", "xbox", "epic", "ubisoft"].includes(platform)) return;

  await unlinkAccount(userId, platform);
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
  platform?: AccountPlatform,
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

  await resyncLibraries(userId);
  revalidatePath("/", "layout");
  return { success: "Sincronizado." };
}

export async function syncPlatformAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const platform = String(formData.get("platform")) as AccountPlatform;
  if (!["psn", "steam", "google", "xbox", "epic", "ubisoft"].includes(platform)) {
    return { error: "Plataforma no válida." };
  }

  const espera = esperaRestante(await ultimaSincronizacion(userId, platform));
  if (espera) return espera;

  await resyncPlatform(userId, platform);
  revalidatePath("/", "layout");
  return { success: "Sincronizado." };
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

export async function removeFriendAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  await removeFriend(userId, String(formData.get("friendId")));
  revalidatePath("/amigos");
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function rateGameAction(gameId: string, rating: number) {
  const userId = await requireUserId();
  const db = getDb();

  await db
    .update(userGames)
    .set({ rating })
    .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)));

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
  
  const reviewDate = dateStr ? new Date(dateStr) : null;

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
  const database = getDb();
  const [existing] = await database.select({ userId: activityReactions.userId }).from(activityReactions).where(and(eq(activityReactions.activityId, activityId), eq(activityReactions.userId, userId))).limit(1);
  if (existing) {
    await database.delete(activityReactions).where(and(eq(activityReactions.activityId, activityId), eq(activityReactions.userId, userId)));
  } else {
    await database.insert(activityReactions).values({ activityId, userId });
  }
  revalidatePath("/", "layout");
}

export async function addActivityCommentAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const activityId = String(formData.get("activityId") ?? "");
  // El campo del formulario (ActivityFeed.tsx) se llama "comment", no
  // "body" — leer "body" aquí devolvía siempre null, así que `body` salía
  // "" y el guard de abajo cortaba en silencio: el comentario nunca se
  // insertaba, sin ningún error visible para quien escribía.
  const body = String(formData.get("comment") ?? "").trim().slice(0, 500);
  if (!activityId || !body) return;
  await getDb().insert(activityComments).values({ id: crypto.randomUUID(), activityId, userId, body });
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

/* ---------------------------------- Juegos manuales --------------------------------- */

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

/* ------------------------------------- Avisos ------------------------------------ */

export async function marcarLeidoAction(): Promise<void> {
  const userId = await requireUserId();
  await marcarTodoLeido(userId);
  revalidatePath("/", "layout");
}

/* ---------------------------------- Modo enfoque --------------------------------- */

export interface RefrescoJuego {
  /** Trofeos nuevos desde la última comprobación. Negativo nunca: solo suben. */
  nuevos: number;
  error?: string;
}

/**
 * Vuelve a pedir los trofeos de UN juego a su plataforma.
 *
 * Es lo que hace útil el modo enfoque como segunda pantalla: acabas de sacar
 * un trofeo en la tele y quieres verlo aquí sin esperar al cron ni
 * resincronizar la biblioteca entera (que son decenas de segundos). Esto es
 * una sola llamada, la del juego que tienes delante.
 */
export async function refrescarJuegoAction(gameId: string): Promise<RefrescoJuego> {
  const userId = await requireUserId();
  const db = getDb();

  const [antes] = await db
    .select({ earnedTotal: userGames.earnedTotal })
    .from(userGames)
    .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)))
    .limit(1);

  if (!antes) return { nuevos: 0, error: "Ese juego no está en tu biblioteca." };

  const profile = await getProfileByUserId(userId);
  const { platform } = parseGameKey(gameId);

  if (platform === "manual") {
    return { nuevos: 0, error: "Un juego añadido a mano no tiene nada que sincronizar." };
  }

  const account = accountFor(profile, platform);
  if (!account) return { nuevos: 0, error: "No tienes vinculada esa plataforma." };

  try {
    await syncGameTrophies(userId, { platform, accountId: account.accountId }, gameId);
  } catch (error) {
    return { nuevos: 0, error: describeError(error) };
  }

  const [despues] = await db
    .select({ earnedTotal: userGames.earnedTotal })
    .from(userGames)
    .where(and(eq(userGames.userId, userId), eq(userGames.gameId, gameId)))
    .limit(1);

  revalidatePath("/", "layout");

  return { nuevos: Math.max(0, (despues?.earnedTotal ?? 0) - antes.earnedTotal) };
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

export async function searchTrophyGuideAction(gameTitle: string, trophyName: string) {
  try {
    const query = encodeURIComponent(`${gameTitle} ${trophyName} trophy guide`);
    const res = await fetch(`https://www.youtube.com/results?search_query=${query}`);
    if (!res.ok) return null;
    
    const html = await res.text();
    // YouTube's initial data contains video IDs like "videoId":"XXXXXXXXXXX"
    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    return match ? match[1] : null;
  } catch (error) {
    console.error("Error fetching guide from YouTube", error);
    return null;
  }
}

export async function submitExpressReviewAction(gameId: string, rating: number, review: string) {
  const userId = await requireUserId();
  const db = getDb();
  
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

/* --------------------------------- Guías escritas --------------------------------- */

export async function createGuideAction(gameId: string, title: string, body: string): Promise<{ error?: string; id?: string }> {
  const userId = await requireUserId();

  const tituloLimpio = title.trim();
  const textoLimpio = body.trim();
  if (!tituloLimpio || !textoLimpio) {
    return { error: "Ponle un título y algo de texto." };
  }

  const id = await createGuide(userId, gameId, tituloLimpio, textoLimpio);
  revalidatePath(`/juego/${gameId}/guias`);
  return { id };
}

export async function replyToGuideAction(guideId: string, gameId: string, body: string): Promise<{ error?: string }> {
  const userId = await requireUserId();

  const textoLimpio = body.trim();
  if (!textoLimpio) return { error: "Escribe algo antes de responder." };

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

/* ------------------------------- Ruleta del Backlog ------------------------------ */

/**
 * Respaldo de la Ruleta del Backlog (BacklogRoulette.tsx) para cuando el
 * propio backlog está vacío (0% en todos, o biblioteca corta): en vez de no
 * enseñar nada, tira de recomendaciones por género favorito — mismo dato que
 * ya usa /descubrir/recomendaciones, no una consulta nueva a IGDB.
 */
export async function backlogFallbackAction(): Promise<GameRecommendation[]> {
  const userId = await requireUserId();
  return getGameRecommendations(userId, 20);
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
