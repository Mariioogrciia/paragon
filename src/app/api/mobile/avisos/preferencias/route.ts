import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { errorMovil } from "@/lib/mensajesApi";
import { CATEGORIAS_AVISO, getAvisosDesactivados, setAvisosActivos } from "@/lib/avisosPreferencias";
import { discordUserIdDe, setDiscordDmEnabled } from "@/lib/discordBot";

/**
 * Qué avisos recibir, desde la app (20 oct 2026): lo mismo que Ajustes →
 * Avisos en la web (lib/avisosPreferencias.ts) más los DM de Discord.
 * GET → el estado. PUT `{ activas?: string[], discordDm?: boolean }` → guarda
 * lo que venga y devuelve el estado nuevo. Ver CONTRACT.md.
 */
async function estado(userId: string) {
  const [off, discordId, [fila]] = await Promise.all([
    getAvisosDesactivados(userId).catch(() => new Set<string>()),
    discordUserIdDe(userId),
    db.select({ dm: users.discordDmEnabled }).from(users).where(eq(users.id, userId)).limit(1),
  ]);
  return {
    categorias: CATEGORIAS_AVISO.map((c) => ({ clave: c.clave, activa: !off.has(c.clave) })),
    discord: { vinculado: discordId !== null, activo: Boolean(fila?.dm) && discordId !== null },
  };
}

export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  return NextResponse.json(await estado(userId));
}

export async function PUT(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  if (!(await limitar("escritura", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }

  const body = (await req.json().catch(() => null)) as { activas?: unknown; discordDm?: unknown } | null;
  // null (lo que manda la app para "sin cambios") cuenta como no venir.
  const activas = body?.activas ?? undefined;
  const discordDm = body?.discordDm ?? undefined;
  if (
    !body ||
    (activas !== undefined && (!Array.isArray(activas) || activas.length > 20 || !activas.every((c) => typeof c === "string"))) ||
    (discordDm !== undefined && typeof discordDm !== "boolean")
  ) {
    return errorMovil(req, "Datos no válidos", 400);
  }

  if (discordDm === true && !(await discordUserIdDe(userId))) {
    return errorMovil(req, "Tu cuenta no inició sesión con Discord — sin eso el bot no sabe a quién escribir.", 400);
  }
  if (Array.isArray(activas)) await setAvisosActivos(userId, activas as string[]);
  if (typeof discordDm === "boolean") await setDiscordDmEnabled(userId, discordDm);

  return NextResponse.json(await estado(userId));
}
