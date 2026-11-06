import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { errorMovil } from "@/lib/mensajesApi";
import { dentroDelLimite } from "@/lib/rateLimit";
import { asistenteActivo, preguntarAParagon, type TurnoAsistente } from "@/lib/asistente";
import { idiomaDeCabecera } from "@/lib/idiomasTrofeo";

/** Mismos topes que la web (app/actions/asistente.ts). */
const POR_DIA = 20;
const POR_MINUTO = 4;

/**
 * "Pregúntale a Paragon" desde la app (6 nov 2026, lib/asistente.ts).
 * `{ pregunta, historial: [{ rol, texto }] }` → `{ ok, texto }` o
 * `{ ok: false, motivo }` (inactivo, limite, rechazo, fallo).
 * GET dice si el asistente está encendido, para enseñar o no la entrada.
 */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  return NextResponse.json({ activo: asistenteActivo() });
}

export async function POST(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) return errorMovil(req, "No autenticado", 401);
  const cuerpo = (await req.json().catch(() => null)) as { pregunta?: unknown; historial?: unknown } | null;
  const pregunta = typeof cuerpo?.pregunta === "string" ? cuerpo.pregunta.trim().slice(0, 1000) : "";
  if (!pregunta) return NextResponse.json({ ok: false, motivo: "fallo" });
  const [minuto, dia] = await Promise.all([
    dentroDelLimite(`asistente:min:${userId}`, POR_MINUTO, 60),
    dentroDelLimite(`asistente:dia:${userId}`, POR_DIA, 86_400),
  ]);
  if (!minuto || !dia) return NextResponse.json({ ok: false, motivo: "limite" });
  const historial = (Array.isArray(cuerpo?.historial) ? (cuerpo.historial as TurnoAsistente[]) : [])
    .filter((t) => (t?.rol === "user" || t?.rol === "assistant") && typeof t.texto === "string")
    .map((t) => ({ rol: t.rol, texto: t.texto.slice(0, 4000) }))
    .slice(-6);
  return NextResponse.json(await preguntarAParagon(userId, pregunta, historial, idiomaDeCabecera(req.headers.get("accept-language"))));
}
