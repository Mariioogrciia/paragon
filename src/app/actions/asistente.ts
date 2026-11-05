"use server";

import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { preguntarAParagon, type RespuestaAsistente, type TurnoAsistente } from "@/lib/asistente";
import { dentroDelLimite } from "@/lib/rateLimit";
import { esIdioma } from "@/lib/idiomasTrofeo";

/** Cuántas preguntas por persona (lib/asistente.ts, coste controlado). */
const POR_DIA = 20;
const POR_MINUTO = 4;

export async function preguntarAction(pregunta: string, historial: TurnoAsistente[]): Promise<RespuestaAsistente | { ok: false; motivo: "limite" | "sesion" }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, motivo: "sesion" };
  const limpia = pregunta.trim();
  if (!limpia) return { ok: false, motivo: "fallo" };
  const [minuto, dia] = await Promise.all([
    dentroDelLimite(`asistente:min:${userId}`, POR_MINUTO, 60),
    dentroDelLimite(`asistente:dia:${userId}`, POR_DIA, 86_400),
  ]);
  if (!minuto || !dia) return { ok: false, motivo: "limite" };
  const historialValido = (Array.isArray(historial) ? historial : [])
    .filter((t) => (t?.rol === "user" || t?.rol === "assistant") && typeof t.texto === "string")
    .slice(-6);
  const locale = await getLocale();
  return preguntarAParagon(userId, limpia, historialValido, esIdioma(locale) ? locale : "es");
}
