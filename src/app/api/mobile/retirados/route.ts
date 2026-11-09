import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { errorMovil } from "@/lib/mensajesApi";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { cambiarRetirado, getRetirados } from "@/lib/retirados";
import { dispositivosDeBiblioteca } from "@/lib/retiradosReglas";

/**
 * Consolas y juegos que ya no tienes, para la app (8 nov 2026, lib/retirados.ts).
 * GET: las consolas de tu biblioteca (con `retirado`) y los juegos ocultos.
 * PUT `{ tipo: "dispositivo" | "juego", valor, retirado }` → lo mismo actualizado.
 */
async function estado(userId: string) {
  const perfil = await getProfileByUserId(userId);
  const [games, retirados] = await Promise.all([perfil ? getLibrary(perfil).then((l) => l.games) : Promise.resolve([]), getRetirados(userId)]);
  return {
    consolas: dispositivosDeBiblioteca(games).map((c) => ({ ...c, retirado: retirados.dispositivos.has(c.dispositivo) })),
    juegos: games.filter((g) => retirados.juegos.has(g.id)).map((g) => ({ id: g.id, titulo: g.title, iconUrl: g.iconUrl ?? null })),
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
  const cuerpo = (await req.json().catch(() => null)) as { tipo?: unknown; valor?: unknown; retirado?: unknown } | null;
  const tipos = ["dispositivo", "juego", "instalado", "oculto_perfil", "fecha_objetivo"] as const;
  if (!cuerpo || !tipos.includes(cuerpo.tipo as (typeof tipos)[number]) || typeof cuerpo.valor !== "string") {
    return errorMovil(req, "Datos no válidos", 400);
  }
  await cambiarRetirado(userId, cuerpo.tipo as (typeof tipos)[number], cuerpo.valor, cuerpo.retirado === true);
  return NextResponse.json(await estado(userId));
}
