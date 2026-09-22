"use server";
import { auth } from "@/auth";
import { createClan, joinClan, leaveClan, getUserClan } from "@/lib/clans";
import { getLibrary } from "@/lib/profiles";
import { getProfileByUserId } from "@/lib/profiles";
import { paragonProgress } from "@/lib/level";
import { revalidatePath } from "next/cache";

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
