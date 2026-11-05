/**
 * Herramientas de «Pregúntale a Paragon» (lib/asistente.ts) sobre la
 * biblioteca ya cargada: definiciones para la API de Claude y su ejecución,
 * sin base ni red, para poder probarlas (`tests/asistenteHerramientas.test.ts`).
 *
 * Todo devuelve filas cortas en JSON: cuanto menos texto, menos tokens y
 * menos coste por pregunta.
 */
import type Anthropic from "@anthropic-ai/sdk";
import type { Game } from "@/lib/types";
import { esPlatinoEquivalente, summarise } from "@/lib/stats";
import { sugerirPorTiempo } from "@/lib/recomendadorTiempo";
import { platinosAlAlcance } from "@/lib/backlog";
import { CATEGORIAS_GENERO, type CategoriaDna } from "@/lib/trophyDna";

export const HERRAMIENTAS: Anthropic.Beta.BetaTool[] = [
  {
    name: "resumen_perfil",
    description: "Totales del jugador: nivel, platinos, trofeos, juegos, completado medio, racha y juegos por plataforma. Úsala para preguntas generales sobre su perfil.",
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    name: "buscar_juegos",
    description:
      "Busca en la biblioteca del jugador (sin la lista de deseados). Devuelve hasta `limite` juegos con progreso, trofeos, horas jugadas, horas de HowLongToBeat para completarlo y la última vez que se jugó.",
    input_schema: {
      type: "object",
      properties: {
        texto: { type: "string", description: "Parte del título; cadena vacía para no filtrar por título." },
        estado: { type: "string", enum: ["todos", "empezados", "sin_empezar", "completados"], description: "empezados = con algún trofeo y sin terminar." },
        plataforma: { type: "string", enum: ["todas", "psn", "steam", "xbox", "epic", "manual"] },
        orden: { type: "string", enum: ["progreso_desc", "progreso_asc", "ultimo_jugado", "horas_desc", "menos_horas_hltb"] },
        limite: { type: "integer", description: "Entre 1 y 20." },
      },
      required: ["texto", "estado", "plataforma", "orden", "limite"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "sugerir_por_tiempo",
    description: "Qué puede cerrar o avanzar el jugador con el tiempo que tiene hoy, entre sus juegos empezados. Opcionalmente de un tipo de juego.",
    input_schema: {
      type: "object",
      properties: {
        horas: { type: "number", description: "Horas disponibles, por ejemplo 1.5." },
        genero: { type: "string", enum: ["cualquiera", ...CATEGORIAS_GENERO.map((c) => c.key)] },
      },
      required: ["horas", "genero"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "platinos_al_alcance",
    description: "Juegos muy avanzados (75 % o más) que llevan al menos dos meses sin tocarse: los platinos más fáciles de rescatar.",
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
];

export interface Contexto {
  games: Game[];
  nivel: number;
  racha: { actual: number; mejor: number };
}

const fila = (g: Game) => ({
  id: g.id,
  titulo: g.title,
  plataforma: g.platform,
  progreso: g.progressPercent,
  trofeos: `${g.earnedTotal}/${g.definedTotal}`,
  platinado: esPlatinoEquivalente(g),
  horasJugadas: g.playtimeMinutes ? Math.round(g.playtimeMinutes / 6) / 10 : null,
  horasHltbCompletista: g.hltb?.completionist ?? null,
  ultimaVez: g.lastPlayedAt?.slice(0, 10) ?? null,
});

function entero(valor: unknown, min: number, max: number, defecto: number): number {
  const n = typeof valor === "number" && Number.isFinite(valor) ? Math.round(valor) : defecto;
  return Math.max(min, Math.min(max, n));
}

/** Ejecuta una herramienta. Nunca lanza: un error vuelve como texto para que el modelo lo explique. */
export function ejecutarHerramienta(nombre: string, entrada: unknown, ctx: Contexto): { contenido: string; error: boolean } {
  const e = (entrada ?? {}) as Record<string, unknown>;
  const juegos = ctx.games.filter((g) => !g.isWishlist);
  switch (nombre) {
    case "resumen_perfil": {
      const r = summarise(ctx.games);
      return {
        contenido: JSON.stringify({ nivel: ctx.nivel, platinos: r.platinos, trofeos: r.trofeos, juegos: r.juegos, completadoMedio: r.completadoMedio, racha: ctx.racha, porPlataforma: r.porPlataforma }),
        error: false,
      };
    }
    case "buscar_juegos": {
      const texto = typeof e.texto === "string" ? e.texto.toLowerCase().trim() : "";
      let lista = juegos;
      if (texto) lista = lista.filter((g) => g.title.toLowerCase().includes(texto));
      if (typeof e.plataforma === "string" && e.plataforma !== "todas") lista = lista.filter((g) => g.platform === e.plataforma);
      if (e.estado === "empezados") lista = lista.filter((g) => g.earnedTotal > 0 && !esPlatinoEquivalente(g) && g.progressPercent < 100);
      else if (e.estado === "sin_empezar") lista = lista.filter((g) => g.earnedTotal === 0);
      else if (e.estado === "completados") lista = lista.filter((g) => esPlatinoEquivalente(g) || g.progressPercent === 100);
      const orden: Record<string, (a: Game, b: Game) => number> = {
        progreso_desc: (a, b) => b.progressPercent - a.progressPercent,
        progreso_asc: (a, b) => a.progressPercent - b.progressPercent,
        ultimo_jugado: (a, b) => (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""),
        horas_desc: (a, b) => (b.playtimeMinutes ?? 0) - (a.playtimeMinutes ?? 0),
        menos_horas_hltb: (a, b) => (a.hltb?.completionist ?? Infinity) - (b.hltb?.completionist ?? Infinity),
      };
      lista = [...lista].sort(orden[String(e.orden)] ?? orden.ultimo_jugado);
      const limite = entero(e.limite, 1, 20, 10);
      return { contenido: JSON.stringify({ total: lista.length, juegos: lista.slice(0, limite).map(fila) }), error: false };
    }
    case "sugerir_por_tiempo": {
      const horas = typeof e.horas === "number" && e.horas > 0 ? Math.min(e.horas, 24) : 1;
      const genero = CATEGORIAS_GENERO.some((c) => c.key === e.genero) ? (e.genero as CategoriaDna) : undefined;
      const { victoriasRapidas, paraProfundizar } = sugerirPorTiempo(ctx.games, horas, genero);
      const corta = (s: { gameId: string; titulo: string; motivo: string; trofeosRestantes: number }) => ({ id: s.gameId, titulo: s.titulo, motivo: s.motivo, faltan: s.trofeosRestantes });
      return { contenido: JSON.stringify({ victoriasRapidas: victoriasRapidas.slice(0, 5).map(corta), paraProfundizar: paraProfundizar.slice(0, 5).map(corta) }), error: false };
    }
    case "platinos_al_alcance":
      return { contenido: JSON.stringify(platinosAlAlcance(ctx.games).slice(0, 10).map(({ gameId, titulo, progressPercent, trofeosRestantes, ultimaVez, horasHltb }) => ({ id: gameId, titulo, progreso: progressPercent, faltan: trofeosRestantes, ultimaVez, horasHltb: horasHltb ?? null }))), error: false };
    default:
      return { contenido: `Herramienta desconocida: ${nombre}`, error: true };
  }
}
