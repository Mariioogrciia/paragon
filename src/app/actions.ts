"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users, userGames, activities, activityComments, activityReactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import {
  CollectionNameError,
  createCollection,
  deleteCollection,
  toggleGameInCollection,
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
import { addManualGame, setManualGameCompleted } from "@/lib/manualGames";
import { marcarTodoLeido } from "@/lib/notifications";
import { ownsGame } from "@/lib/community";
import { votarDificultad } from "@/lib/communityDifficulty";
import type { AccountPlatform } from "@/lib/types";

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

export async function linkEpicAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return linkPlatform("epic", formData);
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

export async function syncNowAction(): Promise<void> {
  const userId = await requireUserId();
  await resyncLibraries(userId);
  revalidatePath("/", "layout");
}

export async function syncPlatformAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const platform = String(formData.get("platform")) as AccountPlatform;
  if (!["psn", "steam", "google", "xbox", "epic", "ubisoft"].includes(platform)) return;
  await resyncPlatform(userId, platform);
  revalidatePath("/", "layout");
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

  const activityId = crypto.randomUUID();
  await db
    .insert(activities)
    .values({
      id: activityId,
      userId,
      type: "rating",
      gameId,
      rating,
    });

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
  const body = String(formData.get("body") ?? "").trim().slice(0, 500);
  if (!activityId || !body) return;
  await getDb().insert(activityComments).values({ id: crypto.randomUUID(), activityId, userId, body });
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

  // Guardar en el feed de actividad
  const id = crypto.randomUUID();
  await db
    .insert(activities)
    .values({
      id,
      userId,
      type: "review",
      gameId,
      rating,
      review,
    });

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
