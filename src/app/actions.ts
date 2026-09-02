"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users, userGames } from "@/db/schema";
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
  isHandleTaken,
  linkAccount,
  removeFriend,
  resyncLibraries,
  sendFriendRequest,
  setHandle,
  setProfileInfo,
  unlinkAccount,
} from "@/lib/profiles";
import { PsnProfileNotFoundError } from "@/lib/psn/client";
import { PsnAuthError, PsnNotConfiguredError } from "@/lib/psn/auth";
import {
  SteamNotConfiguredError,
  SteamPrivateProfileError,
  SteamProfileNotFoundError,
} from "@/lib/steam/client";
import type { Platform } from "@/lib/types";

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
  Platform,
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
};

async function linkPlatform(
  platform: Platform,
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

export async function unlinkAccountAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const platform = String(formData.get("platform") ?? "") as Platform;

  if (platform !== "psn" && platform !== "steam") return;

  await unlinkAccount(userId, platform);
  revalidatePath("/", "layout");
}

export async function syncNowAction(): Promise<void> {
  const userId = await requireUserId();
  await resyncLibraries(userId);
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

  revalidatePath('/', 'layout');
}
