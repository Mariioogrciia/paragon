"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { cambiarRetirado } from "@/lib/retirados";

/** Marcar (o desmarcar) una consola o un juego como "ya no lo tengo" (lib/retirados.ts). */
export async function cambiarRetiradoAction(tipo: "dispositivo" | "juego", valor: string, retirado: boolean): Promise<{ ok: boolean }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || (tipo !== "dispositivo" && tipo !== "juego") || typeof valor !== "string") return { ok: false };
  await cambiarRetirado(userId, tipo, valor, Boolean(retirado));
  revalidatePath("/", "layout");
  return { ok: true };
}
