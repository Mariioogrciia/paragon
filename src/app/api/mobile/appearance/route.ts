import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { limitar } from "@/lib/rateLimit";
import { ESTILO_REQUISITOS } from "@/lib/level";
import { getParagonLevel } from "@/lib/paragonLevel";
import { guardarAparienciaCuenta, leerAparienciaCuenta, normalizarApariencia, type AparienciaCuenta } from "@/lib/aparienciaCuenta";
import { paletaDesdeColor } from "@/lib/paletaJuego";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Apariencia de la cuenta para la app Android (4 oct 2026): la misma que
 * elige la web en Ajustes → Apariencia (acento, paletas, color libre,
 * paleta de juego, estilo y tamaño de texto), así cambiarla en un sitio la
 * cambia en el otro. Ver lib/aparienciaCuenta.ts.
 *
 * La paleta "desde tu juego" se devuelve ya calculada (`paleta`), con el
 * mismo algoritmo que la web (lib/paletaJuego.ts), para que la app no tenga
 * que reimplementarlo.
 */
async function respuesta(userId: string, ap: AparienciaCuenta | null) {
  const nivel = await getParagonLevel(userId);
  const juego = ap?.acentoJuego;
  const paleta = juego ? paletaDesdeColor(juego.color) : null;
  return {
    guardada: ap !== null,
    acento: ap?.acento ?? "",
    acentoLibre: ap?.acentoLibre ?? "",
    acentoJuego: juego && paleta ? { ...juego, paleta } : null,
    estilo: ap?.estilo ?? "",
    tamanoTexto: ap?.tamanoTexto ?? "",
    nivel: nivel.level,
    requisitosEstilo: ESTILO_REQUISITOS,
  };
}

export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }
  return NextResponse.json(await respuesta(userId, await leerAparienciaCuenta(userId)));
}

/** Body: `{ acento, acentoLibre, acentoJuego?: { id, color }, estilo, tamanoTexto }`. Devuelve lo guardado de verdad (normalizado). */
export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }
  if (!(await limitar("perfil", userId))) {
    return errorMovil(req, "Demasiadas peticiones seguidas. Espera un momento.", 429);
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return errorMovil(req, "Datos no válidos", 400);
  }
  const ap = await normalizarApariencia(userId, body);
  await guardarAparienciaCuenta(userId, ap);
  return NextResponse.json(await respuesta(userId, ap));
}
