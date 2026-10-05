import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { userTrophies } from "@/db/schema";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { accountFor, getProfileByUserId, resyncPlatform } from "@/lib/profiles";
import type { PlataformaVinculable } from "@/lib/types";
import { errorMovil } from "@/lib/mensajesApi";

// Epic no: su web bloquea al servidor y solo la extensión puede leerla.
const SINCRONIZABLES: PlataformaVinculable[] = ["psn", "steam", "xbox"];
// El mismo respiro que el botón de la web (SYNC_COOLDOWN_MS en actions.ts).
const ESPERA_MS = 2 * 60 * 1000;

async function contarTrofeos(userId: string): Promise<number> {
  const [fila] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(userTrophies)
    .where(and(eq(userTrophies.userId, userId), eq(userTrophies.earned, true)));
  return Number(fila?.n ?? 0);
}

/**
 * Sincronizar una plataforma desde la app, como el botón "Sincronizar" de
 * cada fila en /ajustes/plataformas. Responde `{ nuevos }`: los trofeos que
 * han entrado con esta pasada.
 */
export async function POST(req: Request, { params }: { params: Promise<{ platform: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);

  const { platform } = await params;
  if (platform === "epic") return errorMovil(req, "Esa plataforma se sincroniza con la extensión del navegador.", 400);
  if (!(SINCRONIZABLES as string[]).includes(platform)) return errorMovil(req, "Plataforma no válida", 400);
  if (!(await limitar("resync", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }

  const profile = await getProfileByUserId(userId);
  const cuenta = accountFor(profile, platform as PlataformaVinculable);
  if (!cuenta) return errorMovil(req, "No tienes esa plataforma vinculada.", 404);
  if (cuenta.syncedAt && Date.now() - cuenta.syncedAt.getTime() < ESPERA_MS) {
    return errorMovil(req, "Ya se sincronizó hace muy poco. Espera un par de minutos.", 429);
  }

  const antes = await contarTrofeos(userId);
  await resyncPlatform(userId, platform as PlataformaVinculable);
  const nuevos = Math.max(0, (await contarTrofeos(userId)) - antes);
  return NextResponse.json({ nuevos });
}
