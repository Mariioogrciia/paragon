"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { cambiarRetirado } from "@/lib/retirados";
import type { TipoMarca } from "@/lib/retiradosReglas";

/** Marcar (o desmarcar) una consola o un juego como "ya no lo tengo" (lib/retirados.ts). */
const TIPOS: TipoMarca[] = ["dispositivo", "juego", "instalado", "oculto_perfil", "fecha_objetivo"];

export async function cambiarRetiradoAction(tipo: TipoMarca, valor: string, retirado: boolean): Promise<{ ok: boolean }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !TIPOS.includes(tipo) || typeof valor !== "string") return { ok: false };
  await cambiarRetirado(userId, tipo, valor, Boolean(retirado));
  revalidatePath("/", "layout");
  return { ok: true };
}
