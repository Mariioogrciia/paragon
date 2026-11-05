"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { cambiarSuscripcion } from "@/lib/correo";

/** Alta o baja del resumen semanal por correo desde Ajustes → Avisos. */
export async function cambiarCorreoSemanalAction(alta: boolean): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await cambiarSuscripcion(session.user.id, alta);
  revalidatePath("/ajustes/avisos");
}
