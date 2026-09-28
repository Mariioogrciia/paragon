"use server";
import { auth } from "@/auth";
import { createClan, joinClan, leaveClan, getUserClan, inviteToClan, acceptClanInvite, declineClanInvite } from "@/lib/clans";
import { getLibrary } from "@/lib/profiles";
import { getProfileByUserId } from "@/lib/profiles";
import { paragonProgress } from "@/lib/level";
import { revalidatePath } from "next/cache";
import { GuerraError, responderGuerra, retarClan } from "@/lib/clanWars";
import { limitar } from "@/lib/rateLimit";

export async function createClanAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const name = formData.get("name")?.toString();
  const tag = formData.get("tag")?.toString();
  const desc = formData.get("description")?.toString() || "";

  if (!name || !tag) throw new Error("Nombre y etiqueta requeridos");
  if (tag.length > 5) throw new Error("La etiqueta debe tener 5 caracteres máximo");

  // Requisito: Nivel 5
  const profile = await getProfileByUserId(session.user.id);
  if (!profile) throw new Error("Perfil no encontrado");
  const { games } = await getLibrary(profile);
  const nivel = paragonProgress(games).level;

  if (nivel < 5) {
    throw new Error("Necesitas ser al menos Nivel 5 de Paragon para crear un clan.");
  }

  const existing = await getUserClan(session.user.id);
  if (existing) throw new Error("Ya perteneces a un clan. Abandónalo primero.");

  await createClan(session.user.id, name, tag, desc);
  revalidatePath("/clanes");
  revalidatePath(`/u/${profile.handle}`);
}

export async function joinClanAction(clanId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  await joinClan(session.user.id, clanId);
  revalidatePath("/clanes");
  
  const profile = await getProfileByUserId(session.user.id);
  if (profile) revalidatePath(`/u/${profile.handle}`);
}

export async function leaveClanAction(clanId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  await leaveClan(session.user.id, clanId);
  revalidatePath("/clanes");
  const profile = await getProfileByUserId(session.user.id);
  if (profile) revalidatePath(`/u/${profile.handle}`);
}

export async function inviteToClanAction(clanId: string, invitedUserId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  await inviteToClan(clanId, session.user.id, invitedUserId);
  revalidatePath(`/clanes`);
}

export async function acceptClanInviteAction(clanId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  await acceptClanInvite(session.user.id, clanId);
  revalidatePath("/clanes");
  const profile = await getProfileByUserId(session.user.id);
  if (profile) revalidatePath(`/u/${profile.handle}`);
}

export async function declineClanInviteAction(clanId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  await declineClanInvite(session.user.id, clanId);
  revalidatePath("/clanes");
}

/* ---------------------------------- Guerra de clanes --------------------------------- */

/** Ver lib/clanWars.ts. Devuelve el error como texto (los errores de reglas no son fallos). */
export async function retarClanAction(retadorId: string, retadoId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  if (!(await limitar("comentario", session.user.id))) return { error: "Espera un momento antes de volver a intentarlo." };
  try {
    await retarClan(session.user.id, retadorId, retadoId);
  } catch (e) {
    if (e instanceof GuerraError) return { error: e.message };
    throw e;
  }
  revalidatePath("/clanes", "layout");
  return {};
}

export async function responderGuerraAction(guerraId: string, aceptar: boolean): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  try {
    await responderGuerra(session.user.id, guerraId, aceptar);
  } catch (e) {
    if (e instanceof GuerraError) return { error: e.message };
    throw e;
  }
  revalidatePath("/clanes", "layout");
  return {};
}
