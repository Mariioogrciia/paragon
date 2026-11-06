import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { errorMovil } from "@/lib/mensajesApi";
import { borrarColeccionables, getColeccionables, guardarColeccionables } from "@/lib/coleccionables";
import { leerLista } from "@/lib/coleccionablesReglas";
import { setManualTrophyProgress } from "@/lib/profiles";

/**
 * Lista de coleccionables de un trofeo para la app (6 nov 2026): lo mismo que
 * ChecklistColeccionables.tsx en la web (lib/coleccionables.ts). Marcar una
 * casilla mueve también el contador manual del trofeo.
 */
type Params = { params: Promise<{ gameId: string; trophyId: string }> };
const idValido = (v: string) => v.length > 0 && v.length <= 200;

export async function GET(req: Request, { params }: Params) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  const { gameId, trophyId } = await params;
  if (!idValido(gameId) || !idValido(trophyId)) return errorMovil(req, "Datos no válidos", 400);
  const { propia, comunidad } = await getColeccionables(userId, gameId, trophyId);
  return NextResponse.json({ nombres: propia?.nombres ?? [], marcados: propia?.marcados ?? [], comunidad: comunidad ?? [] });
}

/** `{ nombres?, textoPegado?, marcados, total }`: guarda la lista entera. */
export async function PUT(req: Request, { params }: Params) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  if (!(await limitar("perfil", userId))) return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  const { gameId, trophyId } = await params;
  if (!idValido(gameId) || !idValido(trophyId)) return errorMovil(req, "Datos no válidos", 400);
  const cuerpo = (await req.json().catch(() => null)) as { nombres?: unknown; textoPegado?: unknown; marcados?: unknown; total?: unknown } | null;
  if (!cuerpo) return errorMovil(req, "Datos no válidos", 400);
  const nombres =
    typeof cuerpo.textoPegado === "string"
      ? leerLista(cuerpo.textoPegado.slice(0, 40_000))
      : (Array.isArray(cuerpo.nombres) ? cuerpo.nombres : []).filter((n): n is string => typeof n === "string").map((n) => n.slice(0, 120));
  const marcados = (Array.isArray(cuerpo.marcados) ? cuerpo.marcados : []).filter((n): n is number => typeof n === "number");
  const lista = await guardarColeccionables(userId, gameId, trophyId, { nombres, marcados, total: Number(cuerpo.total) || 1 });
  return NextResponse.json({ nombres: lista.nombres, marcados: lista.marcados, total: lista.total });
}

/** Quita la lista y pone el contador a cero. */
export async function DELETE(req: Request, { params }: Params) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  const { gameId, trophyId } = await params;
  if (!idValido(gameId) || !idValido(trophyId)) return errorMovil(req, "Datos no válidos", 400);
  await borrarColeccionables(userId, gameId, trophyId);
  await setManualTrophyProgress(userId, gameId, trophyId, 0, null);
  return NextResponse.json({ ok: true });
}
