import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { limitar } from "@/lib/rateLimit";
import { completarDetalleSteam } from "@/lib/sync";

/** Segundos de la función; un lote cabe de sobra (el presupuesto real de `completarDetalleSteam` son 35 s). */
export const maxDuration = 60;

/**
 * Trae un lote de logros de Steam que faltan (ver `completarDetalleSteam`).
 * Lo llama en bucle `CompletarSteam` (cliente) tras vincular la cuenta,
 * hasta que `restantes` llega a 0.
 */
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!(await limitar("completarSteam", userId))) {
    return NextResponse.json({ error: "Demasiadas peticiones seguidas." }, { status: 429 });
  }
  return NextResponse.json(await completarDetalleSteam(userId));
}
