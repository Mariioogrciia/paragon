/**
 * Reglas de la vigilancia del servidor (17 oct 2026, ver lib/vigilancia.ts),
 * aparte para probarlas sin red ni base. Qué respuesta de cada servicio es
 * un problema del que avisar al desarrollador, y con qué texto.
 *
 * Solo se avisa de lo que hay que arreglar a mano: una clave que falta o que
 * el servicio ya no acepta, un cupo agotado, o que la sincronización falle
 * para todo el mundo. Una caída suelta de Steam o de OpenXBL no es cosa
 * nuestra y se arregla sola: no se avisa (sería un aviso al día por nada).
 */

export type Servicio = "steam" | "xbox" | "igdb";
export type Problema = "falta" | "clave" | "cupo";

/** `status`: el HTTP de la comprobación; `null` si ni siquiera hubo respuesta (red). */
export function clasificarRespuesta(servicio: Servicio, status: number | null): Problema | null {
  if (status === null || status >= 500) return null;
  if (status === 401 || status === 403) return "clave";
  // Twitch (IGDB) responde 400 cuando el client_id o el secreto no valen.
  if (servicio === "igdb" && status === 400) return "clave";
  if (status === 429) return "cupo";
  return null;
}

const NOMBRE: Record<Servicio, { nombre: string; variable: string }> = {
  steam: { nombre: "Steam", variable: "STEAM_API_KEY" },
  xbox: { nombre: "Xbox (OpenXBL)", variable: "XBL_API_KEY" },
  igdb: { nombre: "IGDB (Twitch)", variable: "IGDB_CLIENT_ID / IGDB_CLIENT_SECRET" },
};

export function textoProblema(servicio: Servicio, problema: Problema): { titulo: string; texto: string } {
  const { nombre, variable } = NOMBRE[servicio];
  if (problema === "falta") {
    return { titulo: `⚠️ Falta ${variable}`, texto: `El servidor no tiene la clave de ${nombre}: esa parte de Paragon está parada. Añádela en Vercel → Settings → Environment Variables.` };
  }
  if (problema === "clave") {
    return { titulo: `⚠️ ${nombre} rechaza la clave`, texto: `${nombre} ya no acepta ${variable} (caducada o revocada). Genera una nueva, cámbiala en Vercel y vuelve a desplegar.` };
  }
  return { titulo: `⚠️ Cupo de ${nombre} agotado`, texto: `${nombre} responde "demasiadas peticiones": la sincronización de esa plataforma va a fallar hasta que se renueve el cupo. Si pasa a menudo, toca un plan mayor o menos llamadas por pasada.` };
}

/**
 * La sincronización falla para todos: en una pasada con al menos dos
 * personas, ninguna salió bien. Una sola cuenta que falla (perfil privado,
 * PSN caída un momento) es normal; todas a la vez, no.
 */
export function fallanTodas(resultados: { error?: string }[]): string | null {
  if (resultados.length < 2) return null;
  if (resultados.some((r) => r.error === undefined)) return null;
  return resultados[0]?.error ?? "error desconocido";
}
