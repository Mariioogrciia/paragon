"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { cambiarSeguir, SeguirError } from "@/lib/seguir";
import { limitar } from "@/lib/rateLimit";
import { tr } from "@/lib/mensajesWeb";

/** Seguir o dejar de seguir desde el perfil de alguien (components/BotonSeguir.tsx). */
export async function cambiarSeguirAction(followedId: string, seguir: boolean, ruta: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: await tr("Inicia sesión primero.") };
  if (!(await limitar("perfil", userId))) return { ok: false, error: await tr("Demasiadas peticiones seguidas. Espera un momento.") };
  try {
    await cambiarSeguir(userId, followedId, seguir);
  } catch (error) {
    if (error instanceof SeguirError) return { ok: false, error: await tr(error.message) };
    throw error;
  }
  revalidatePath(ruta);
  revalidatePath("/feed");
  return { ok: true };
}
