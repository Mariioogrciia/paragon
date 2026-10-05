import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { SesionError, crearSesion, juegosParaSesion, listarSesiones } from "@/lib/sesiones";
import { sesionParaMovil } from "@/lib/sesionesMovil";
import { idiomaDeCabecera } from "@/lib/idiomasTrofeo";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Sesiones de trofeos online (lib/sesiones.ts), lo mismo que /sesiones en la
 * web: las próximas (primero las de juegos que tienes) y, para el formulario
 * de organizar, tus juegos sin completar.
 */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);

  const idioma = idiomaDeCabecera(req.headers.get("accept-language"));
  const [sesiones, juegos] = await Promise.all([listarSesiones(userId, idioma), juegosParaSesion(userId)]);
  const ordenadas = [...sesiones].sort((a, b) => Number(b.loTengo) - Number(a.loTengo));
  return NextResponse.json({ sesiones: ordenadas.map(sesionParaMovil), juegos });
}

/**
 * Organizar una sesión — `{ gameId, trophyId | null, trofeo, descripcion,
 * fechaHora (ISO), plazasTotales }`. `trophyId` = elegido de la lista de
 * GET sessions/trophies; null = escrito a mano en `trofeo`. Plazas en total
 * contando a quien organiza (2-16).
 */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  if (!(await limitar("comentario", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.gameId !== "string") return errorMovil(req, "Datos no válidos", 400);
  try {
    const id = await crearSesion(userId, {
      gameId: body.gameId,
      trophyId: typeof body.trophyId === "string" && body.trophyId ? body.trophyId : null,
      trofeo: typeof body.trofeo === "string" ? body.trofeo : "",
      descripcion: typeof body.descripcion === "string" ? body.descripcion : "",
      fechaHora: new Date(String(body.fechaHora ?? "")),
      plazasTotales: Number(body.plazasTotales),
    });
    return NextResponse.json({ id });
  } catch (e) {
    if (e instanceof SesionError) return errorMovil(req, e.message, 400);
    throw e;
  }
}
