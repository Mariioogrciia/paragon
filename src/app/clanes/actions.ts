"use server";
import { auth } from "@/auth";
import { createClan, joinClan, leaveClan, getUserClan, inviteToClan, acceptClanInvite, declineClanInvite, setClanEmblema, ClanError, editarClan, cambiarRango, expulsarDelClan } from "@/lib/clans";
import { RANGOS, type Rango } from "@/lib/clanRangos";

type Resultado = { error?: string };

/**
 * Ejecuta una acción de clan y devuelve su error de reglas como texto. Antes
 * se lanzaban y en producción React escondía el mensaje: al unirte a un clan
 * estando ya en otro salía "Minified React error #441".
 */
async function comoResultado(accion: () => Promise<unknown>): Promise<Resultado> {
  try {
    await accion();
    return {};
  } catch (e) {
    if (e instanceof ClanError) return { error: e.message };
    throw e;
  }
}
import { textoAEmblema } from "@/lib/clanEmblema";
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
  const { games, xpMisiones } = await getLibrary(profile);
  const nivel = paragonProgress(games, xpMisiones).level;

  if (nivel < 5) {
    throw new Error("Necesitas ser al menos Nivel 5 de Paragon para crear un clan.");
  }

  const existing = await getUserClan(session.user.id);
  if (existing) throw new Error("Ya perteneces a un clan. Abandónalo primero.");

  await createClan(session.user.id, name, tag, desc);
  revalidatePath("/clanes");
  revalidatePath(`/u/${profile.handle}`);
}

export async function joinClanAction(clanId: string): Promise<Resultado> {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const r = await comoResultado(() => joinClan(userId, clanId));
  if (r.error) return r;
  revalidatePath("/clanes", "layout");
  const profile = await getProfileByUserId(userId);
  if (profile) revalidatePath(`/u/${profile.handle}`);
  return {};
}

export async function leaveClanAction(clanId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  await leaveClan(session.user.id, clanId);
  revalidatePath("/clanes");
  const profile = await getProfileByUserId(session.user.id);
  if (profile) revalidatePath(`/u/${profile.handle}`);
}

export async function inviteToClanAction(clanId: string, invitedUserId: string): Promise<Resultado> {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const r = await comoResultado(() => inviteToClan(clanId, userId, invitedUserId));
  if (!r.error) revalidatePath(`/clanes`);
  return r;
}

export async function acceptClanInviteAction(clanId: string): Promise<Resultado> {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const r = await comoResultado(() => acceptClanInvite(userId, clanId));
  if (r.error) return r;
  revalidatePath("/clanes", "layout");
  const profile = await getProfileByUserId(userId);
  if (profile) revalidatePath(`/u/${profile.handle}`);
  return {};
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

/** Cambia el escudo del clan (solo el líder). `emblema` en el formato de lib/clanEmblema.ts. */
export async function setEmblemaAction(clanId: string, emblema: string): Promise<{ error?: "login" | "invalido" | "lider" }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "login" };
  const e = textoAEmblema(emblema);
  if (!e) return { error: "invalido" };
  if (!(await setClanEmblema(session.user.id, clanId, e))) return { error: "lider" };
  revalidatePath("/clanes", "layout");
  return {};
}

/* ---------------------------------- Rangos (lib/clanRangos.ts) --------------------------------- */

/** Nombre y descripción (líder y colíderes). */
export async function editarClanAction(clanId: string, name: string, description: string): Promise<Resultado> {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;
  const r = await comoResultado(() => editarClan(userId, clanId, { name, description }));
  if (!r.error) revalidatePath("/clanes", "layout");
  return r;
}

/** Ascender, degradar o pasar el liderazgo ("owner"). */
export async function cambiarRangoAction(clanId: string, objetivoId: string, rango: string): Promise<Resultado> {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  if (!(RANGOS as readonly string[]).includes(rango)) return { error: "Rango no válido" };
  const userId = session.user.id;
  const r = await comoResultado(() => cambiarRango(userId, clanId, objetivoId, rango as Rango));
  if (!r.error) revalidatePath("/clanes", "layout");
  return r;
}

export async function expulsarAction(clanId: string, objetivoId: string): Promise<Resultado> {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;
  const r = await comoResultado(() => expulsarDelClan(userId, clanId, objetivoId));
  if (!r.error) revalidatePath("/clanes", "layout");
  return r;
}
