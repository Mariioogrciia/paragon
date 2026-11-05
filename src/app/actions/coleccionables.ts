"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { borrarColeccionables, getColeccionables, guardarColeccionables, type ListaColeccionables } from "@/lib/coleccionables";
import { leerLista } from "@/lib/coleccionablesReglas";
import { setManualTrophyProgress } from "@/lib/profiles";
import { limitar } from "@/lib/rateLimit";

const idValido = (v: unknown, max = 200): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

export async function cargarColeccionablesAction(gameId: string, trophyId: string) {
  const session = await auth();
  if (!session?.user?.id || !idValido(gameId) || !idValido(trophyId)) return { propia: null, comunidad: null };
  return getColeccionables(session.user.id, gameId, trophyId);
}

/**
 * Guarda la lista entera (nombres + marcados). `textoPegado`, si viene, se
 * convierte en los nombres (lib/coleccionablesReglas.ts → leerLista).
 */
export async function guardarColeccionablesAction(
  gameId: string,
  trophyId: string,
  datos: { nombres?: string[]; textoPegado?: string; marcados: number[]; total: number },
): Promise<{ ok: true; lista: ListaColeccionables } | { ok: false }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !idValido(gameId) || !idValido(trophyId)) return { ok: false };
  if (!(await limitar("perfil", userId))) return { ok: false };
  const nombres = typeof datos.textoPegado === "string" ? leerLista(datos.textoPegado.slice(0, 40_000)) : (Array.isArray(datos.nombres) ? datos.nombres : []).filter((n): n is string => typeof n === "string").map((n) => n.slice(0, 120));
  const lista = await guardarColeccionables(userId, gameId, trophyId, { nombres, marcados: Array.isArray(datos.marcados) ? datos.marcados : [], total: Number(datos.total) || 1 });
  revalidatePath("/", "layout");
  return { ok: true, lista };
}

/** Quita la lista y el contador. */
export async function quitarColeccionablesAction(gameId: string, trophyId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id || !idValido(gameId) || !idValido(trophyId)) return;
  await borrarColeccionables(session.user.id, gameId, trophyId);
  await setManualTrophyProgress(session.user.id, gameId, trophyId, 0, null);
  revalidatePath("/", "layout");
}
