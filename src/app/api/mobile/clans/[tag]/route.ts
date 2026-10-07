import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getClanByTag, getClanLeaderboard, getClanActivity, getInvitableFriends, editarClan, ClanError } from "@/lib/clans";
import { normalizarRango, puedeEditarClan, puedeInvitar } from "@/lib/clanRangos";
import { errorMovil } from "@/lib/mensajesApi";
import { clanesRetables, getGuerrasDeClan, type GuerraVista } from "@/lib/clanWars";

/** Una guerra en JSON (fechas ISO), desde el punto de vista del clan de la ficha. */
function guerraJson(g: GuerraVista) {
  return {
    ...g,
    empiezaAt: g.empiezaAt?.toISOString() ?? null,
    terminaAt: g.terminaAt?.toISOString() ?? null,
  };
}

/**
 * Ficha de un clan — mismo dato que `/clanes/[tag]` (web): clan +
 * leaderboard (contribución de cada miembro: lo ganado desde que entró,
 * ya ordenado) + actividad
 * reciente (sin reacciones/comentarios, ver `getClanActivity`) +
 * `amIMember`/`amIOwner` + `invitables` (amigos que el owner puede
 * invitar — solo se calcula si el que pregunta es el owner, igual que la
 * web: "nadie más lo va a ver").
 */
export async function GET(req: Request, { params }: { params: Promise<{ tag: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const { tag } = await params;
  const clan = await getClanByTag(tag);
  if (!clan) {
    return errorMovil(req, "Clan no encontrado", 404);
  }

  const [leaderboard, actividad] = await Promise.all([
    getClanLeaderboard(clan.id),
    getClanActivity(clan.id),
  ]);
  // Puntuación del clan: lo que han ganado sus miembros estando en él.
  const score = leaderboard.reduce((sum, m) => sum + m.contribucion, 0);

  const amIMember = leaderboard.some((m) => m.userId === userId);
  const amIOwner = clan.ownerId === userId;
  // Rango de quien mira (lib/clanRangos.ts): la app enseña solo lo que puede hacer.
  const miRango = amIMember ? normalizarRango(leaderboard.find((m) => m.userId === userId)?.role) : null;
  const invitables = puedeInvitar(miRango) ? await getInvitableFriends(userId, clan.id) : [];
  // Guerra de clanes (como en la web, GuerraDeClanes.tsx): la abierta con
  // puntos en vivo, las 5 últimas terminadas y, si eres el líder y no hay
  // ninguna abierta, a quién puedes retar.
  const guerras = await getGuerrasDeClan(clan.id);
  const retables = amIOwner && !guerras.abierta ? await clanesRetables(clan.id) : [];

  return NextResponse.json({
    clan: { id: clan.id, tag: clan.tag, name: clan.name, description: clan.description, emblema: clan.logoUrl },
    score,
    leaderboard,
    activity: actividad,
    amIMember,
    amIOwner,
    miRango,
    puedoEditar: puedeEditarClan(miRango),
    puedoInvitar: puedeInvitar(miRango),
    invitables,
    guerra: {
      abierta: guerras.abierta ? guerraJson(guerras.abierta) : null,
      historial: guerras.historial.map(guerraJson),
    },
    retables,
  });
}

/** Nombre y descripción — `{ "name": "...", "description": "..." }`. Líder y colíderes. */
export async function PATCH(req: Request, { params }: { params: Promise<{ tag: string }> }) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }
  const { tag } = await params;
  const clan = await getClanByTag(tag);
  if (!clan) {
    return errorMovil(req, "Clan no encontrado", 404);
  }
  const body = await req.json().catch(() => null);
  try {
    await editarClan(userId, clan.id, {
      name: typeof body?.name === "string" ? body.name : clan.name,
      description: typeof body?.description === "string" ? body.description : clan.description,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ClanError) return errorMovil(req, e.message, 400);
    throw e;
  }
}
