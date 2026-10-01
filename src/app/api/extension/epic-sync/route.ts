import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { linkEpicWithExtension, PlatformAccountAlreadyLinkedError } from "@/lib/profiles";
import { EpicPayloadError, parsearDatosEpic } from "@/lib/epic/extensionData";
import { limitar } from "@/lib/rateLimit";

/**
 * Sincroniza Epic con lo que la extensión del navegador ha leído desde la
 * sesión del propio usuario (ver extension/epic.js).
 *
 * Epic bloquea con su protección antibots las consultas que hace el
 * servidor, pero no las de un navegador de verdad: por eso las hace el
 * navegador del usuario y aquí solo se reciben. NO se esquiva nada del lado
 * del servidor.
 *
 * Los datos vienen de un cliente que no controlamos y el servidor no puede
 * comprobar que sean ciertos. Por eso (decisión del usuario, 1 oct 2026):
 * 1) se normalizan campo a campo y con topes (lib/epic/extensionData.ts), y
 * 2) lo de Epic es progreso DECLARADO: no puntúa en el nivel Paragon, ni en
 *    clasificaciones, ligas o temporadas (ver lib/declarado.ts), así que
 *    falsearlo no sirve para ganar a nadie.
 *
 * Auth por Bearer, igual que /api/extension/psn-sync (ver
 * lib/mobileAuth.ts): una extensión no puede depender de la cookie web.
 */

/** Por encima de esto no es una biblioteca normal (Vercel corta en 4,5 MB). */
const MAX_BYTES = 4_000_000;

export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "No autenticado — vuelve a conectar la extensión." }, { status: 401 });
  }
  if (!(await limitar("epicExtension", userId))) {
    return NextResponse.json({ error: "Ya has sincronizado hace un momento. Prueba dentro de unos minutos." }, { status: 429 });
  }

  const texto = await req.text().catch(() => "");
  if (texto.length > MAX_BYTES) {
    return NextResponse.json({ error: "Los datos de Epic son demasiado grandes." }, { status: 413 });
  }

  try {
    const datos = parsearDatosEpic(JSON.parse(texto));
    const resultado = await linkEpicWithExtension(userId, datos);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Datos de Epic no válidos." }, { status: 400 });
    }
    if (error instanceof EpicPayloadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof PlatformAccountAlreadyLinkedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[extension/epic-sync]", error);
    return NextResponse.json({ error: "No se ha podido sincronizar con Epic." }, { status: 500 });
  }
}
