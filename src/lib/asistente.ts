import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { getRetirados } from "@/lib/retirados";
import { sinRetirados } from "@/lib/retiradosReglas";
import { getParagonLevel } from "@/lib/paragonLevel";
import { rachas } from "@/lib/history";
import { ejecutarHerramienta, HERRAMIENTAS, type Contexto } from "@/lib/asistenteHerramientas";
import type { Idioma } from "@/lib/idiomasTrofeo";

/**
 * «Pregúntale a Paragon» (5 nov 2026): preguntas en lenguaje natural sobre
 * tu propia biblioteca («¿qué platino me saco este finde con 6 horas?»),
 * contestadas por Claude con herramientas que leen tus datos
 * (lib/asistenteHerramientas.ts). Nunca ve los datos de nadie más.
 *
 * Coste controlado:
 * - Sin `ANTHROPIC_API_KEY` no existe (la página dice que no está activo).
 * - Esfuerzo `low` (preguntas de chat, no tareas largas) y como mucho
 *   `MAX_VUELTAS` llamadas a herramientas por pregunta.
 * - Límite por persona en la ruta (lib/rateLimit.ts, ver app/actions/asistente.ts).
 * - Herramientas que devuelven filas cortas, y caché de prompt automática
 *   para las instrucciones y las herramientas, que no cambian.
 *
 * Si los clasificadores de seguridad rechazan una pregunta, `fallbacks:
 * "default"` la repite en el modelo que toque; si aun así se rechaza, se
 * contesta con un mensaje amable.
 */

const MODELO = "claude-opus-5-5";
const MAX_VUELTAS = 4;

export function asistenteActivo(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const NOMBRE_IDIOMA: Record<Idioma, string> = { es: "español de España", en: "English", de: "Deutsch", fr: "français", it: "italiano", pt: "português de Portugal" };

function instrucciones(idioma: Idioma, handle: string | null): string {
  return [
    "Eres el asistente de Paragon, una web que junta los trofeos y logros de PlayStation, Steam, Xbox y Epic de cada jugador.",
    "Contestas preguntas del jugador sobre SU biblioteca y su progreso, con las herramientas que tienes. Cualquier dato concreto (juegos, porcentajes, horas, trofeos) sale de una herramienta: si no está, dilo en vez de suponerlo.",
    "Puedes dar consejos generales de caza de trofeos, pero no inventes listas de trofeos de un juego ni guías.",
    "Si la pregunta no tiene que ver con sus juegos o trofeos, di en una frase que solo puedes ayudar con eso.",
    `Contesta en ${NOMBRE_IDIOMA[idioma]}, breve y directo: unas pocas frases o una lista corta. Sin tablas ni encabezados.`,
    handle ? `Para enlazar un juego del jugador, usa la ruta /u/${handle}/<id del juego>.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export interface TurnoAsistente {
  rol: "user" | "assistant";
  texto: string;
}

export type RespuestaAsistente = { ok: true; texto: string } | { ok: false; motivo: "inactivo" | "rechazo" | "fallo" };

export async function preguntarAParagon(userId: string, pregunta: string, historial: TurnoAsistente[], idioma: Idioma): Promise<RespuestaAsistente> {
  if (!asistenteActivo()) return { ok: false, motivo: "inactivo" };
  const profile = await getProfileByUserId(userId);
  if (!profile) return { ok: false, motivo: "fallo" };

  const [{ games }, nivel, racha, retirados] = await Promise.all([getLibrary(profile), getParagonLevel(userId), rachas(userId), getRetirados(userId)]);
  const ctx: Contexto = { games, jugables: sinRetirados(games, retirados), nivel: nivel.level, racha: { actual: racha.actual, mejor: racha.mejor } };

  const client = new Anthropic();
  // Solo los últimos turnos de texto: suficiente para "¿y el segundo?", sin arrastrar toda la charla.
  const mensajes: Anthropic.Beta.BetaMessageParam[] = [
    ...historial.slice(-6).map((t) => ({ role: t.rol, content: t.texto.slice(0, 2000) })),
    { role: "user", content: pregunta.slice(0, 1000) },
  ];

  try {
    for (let vuelta = 0; vuelta <= MAX_VUELTAS; vuelta++) {
      const respuesta = await client.beta.messages.create({
        model: MODELO,
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        cache_control: { type: "ephemeral" },
        system: instrucciones(idioma, profile.handle),
        // En la última vuelta ya sin herramientas: tiene que contestar con lo que tenga.
        tools: vuelta < MAX_VUELTAS ? HERRAMIENTAS : undefined,
        messages: mensajes,
      });

      if (respuesta.stop_reason === "refusal") return { ok: false, motivo: "rechazo" };

      const usos = respuesta.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (respuesta.stop_reason !== "tool_use" || usos.length === 0) {
        const texto = respuesta.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return texto ? { ok: true, texto } : { ok: false, motivo: "fallo" };
      }

      mensajes.push({ role: "assistant", content: respuesta.content });
      // Todas las respuestas de herramientas en un solo mensaje (llamadas en paralelo).
      mensajes.push({
        role: "user",
        content: usos.map((uso) => {
          const r = ejecutarHerramienta(uso.name, uso.input, ctx);
          return { type: "tool_result" as const, tool_use_id: uso.id, content: r.contenido, is_error: r.error };
        }),
      });
    }
    return { ok: false, motivo: "fallo" };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) console.warn("[asistente] límite de la API de Claude");
    else if (error instanceof Anthropic.APIError) console.error("[asistente] API", error.status, error.message);
    else console.error("[asistente]", error);
    return { ok: false, motivo: "fallo" };
  }
}
