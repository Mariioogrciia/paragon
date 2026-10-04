import { NextResponse } from "next/server";
import { sql, desc } from "drizzle-orm";
import { db } from "@/db";
import { clans, clanMembers } from "@/db/schema";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { createClan, getUserClan } from "@/lib/clans";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { paragonProgress } from "@/lib/level";
import { jsonConEtag } from "@/lib/etag";
import { errorMovil } from "@/lib/mensajesApi";

/** Todos los clanes con su nº de miembros (más miembros primero), + el clan del usuario si tiene uno — misma query que /clanes (web). */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const [allClans, miClan] = await Promise.all([
    db
      .select({
        id: clans.id,
        name: clans.name,
        tag: clans.tag,
        description: clans.description,
        memberCount: sql<number>`count(${clanMembers.userId})`.mapWith(Number),
      })
      .from(clans)
      .leftJoin(clanMembers, sql`${clans.id} = ${clanMembers.clanId}`)
      .groupBy(clans.id)
      .orderBy(desc(sql`count(${clanMembers.userId})`)),
    getUserClan(userId),
  ]);

  return jsonConEtag(req, {
    clans: allClans,
    myClan: miClan ? { tag: miClan.clan.tag, name: miClan.clan.name, role: miClan.role } : null,
  }, userId);
}

/**
 * Crea un clan — `{ "name": "...", "tag": "...", "description"? }`. Mismas
 * reglas que `createClanAction` (web): nivel 5 de Paragon, tag de máximo 5
 * caracteres, no puedes crear uno si ya perteneces a otro. `lib/clans.ts`
 * (`createClan`) filtra lenguaje ofensivo y normaliza el tag a mayúsculas.
 */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }
  if (!(await limitar("comentario", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const tag = typeof body?.tag === "string" ? body.tag.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";

  if (!name || !tag) {
    return errorMovil(req, "Nombre y etiqueta requeridos", 400);
  }
  if (tag.length > 5) {
    return errorMovil(req, "La etiqueta debe tener 5 caracteres máximo", 400);
  }

  const profile = await getProfileByUserId(userId);
  if (!profile) {
    return errorMovil(req, "Perfil no encontrado", 404);
  }
  const { games, xpMisiones } = await getLibrary(profile);
  const nivel = paragonProgress(games, xpMisiones).level;
  if (nivel < 5) {
    return errorMovil(req, "Necesitas ser al menos Nivel 5 de Paragon para crear un clan.", 403);
  }

  const existing = await getUserClan(userId);
  if (existing) {
    return errorMovil(req, "Ya perteneces a un clan. Abandónalo primero.", 409);
  }

  try {
    const clan = await createClan(userId, name, tag, description);
    return NextResponse.json(clan);
  } catch (e) {
    return errorMovil(req, e instanceof Error ? e.message : "No se pudo crear el clan.", 400);
  }
}
