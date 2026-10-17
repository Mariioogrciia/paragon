import "server-only";
import { avisarAlDesarrolladorUnaVez, idDesarrollador, primeraVez } from "@/lib/avisoDesarrollador";
import { clasificarRespuesta, fallanTodas, textoProblema, type Problema, type Servicio } from "@/lib/vigilanciaReglas";

/**
 * Vigilancia del servidor (17 oct 2026): avisa al desarrollador (push, DM y
 * campana) cuando algo que hay que arreglar a mano se rompe, en vez de
 * enterarse cuando alguien protesta. Lo llama el cron en cada pasada:
 * - Una vez por hora, comprueba las claves de Steam, Xbox (OpenXBL) e IGDB
 *   con una llamada barata cada una (PSN va aparte, lib/credencialPsn.ts).
 * - En cada pasada, si la sincronización ha fallado para todos.
 * Cada problema se avisa una vez al día como mucho. Las reglas (qué es un
 * problema y su texto) están en lib/vigilanciaReglas.ts.
 *
 * Lo que esto no ve: que el cron deje de llamarse (de eso avisa GitHub por
 * correo cuando falla el workflow, y Admin → Sistema enseña la última
 * pasada) y los errores sueltos de las páginas (Vercel → Logs).
 */

const TIPO_HORA = "vigilancia-hora";
const TIPO_AVISO = "vigilancia";
const RUTA = "/admin?tab=system";

async function estado(url: string, init?: RequestInit): Promise<number | null> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8_000), cache: "no-store" });
    return res.status;
  } catch {
    return null;
  }
}

/** Qué le pasa a cada servicio ahora mismo (solo los que tienen algo). */
async function comprobarServicios(): Promise<[Servicio, Problema][]> {
  const problemas: [Servicio, Problema][] = [];

  const steam = process.env.STEAM_API_KEY;
  if (!steam) problemas.push(["steam", "falta"]);
  else {
    // Un perfil público cualquiera (el de Gabe Newell): solo importa si Steam acepta la clave.
    const p = clasificarRespuesta(
      "steam",
      await estado(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${encodeURIComponent(steam)}&steamids=76561197960287930`),
    );
    if (p) problemas.push(["steam", p]);
  }

  const xbl = process.env.XBL_API_KEY;
  if (!xbl) problemas.push(["xbox", "falta"]);
  else {
    const p = clasificarRespuesta("xbox", await estado("https://xbl.io/api/v2/account", { headers: { "X-Authorization": xbl, Accept: "application/json" } }));
    if (p) problemas.push(["xbox", p]);
  }

  const igdbId = process.env.IGDB_CLIENT_ID;
  const igdbSecreto = process.env.IGDB_CLIENT_SECRET;
  if (!igdbId || !igdbSecreto) problemas.push(["igdb", "falta"]);
  else {
    const url = `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(igdbId)}&client_secret=${encodeURIComponent(igdbSecreto)}&grant_type=client_credentials`;
    const p = clasificarRespuesta("igdb", await estado(url, { method: "POST" }));
    if (p) problemas.push(["igdb", p]);
  }

  return problemas;
}

/** Lo llama el cron con los resultados de su pasada. Devuelve de qué ha avisado. Nunca lanza. */
export async function vigilarServidor(resultados: { error?: string }[], ahora = new Date()): Promise<string[]> {
  const avisados: string[] = [];
  try {
    const desarrollador = await idDesarrollador();
    if (!desarrollador) return avisados;
    const dia = ahora.toISOString().slice(0, 10);

    const error = fallanTodas(resultados);
    if (error) {
      const enviado = await avisarAlDesarrolladorUnaVez(desarrollador, TIPO_AVISO, `sync-todos-${dia}`, {
        titulo: "⚠️ La sincronización falla para todos",
        texto: `En la última pasada del cron no se sincronizó nadie (${resultados.length} cuentas). Primer error: ${error.slice(0, 200)}`,
        ruta: RUTA,
      });
      if (enviado) avisados.push("sync-todos");
    }

    // Las claves, una vez por hora: cada comprobación gasta una llamada.
    if (!(await primeraVez(desarrollador, TIPO_HORA, ahora.toISOString().slice(0, 13)))) return avisados;
    for (const [servicio, problema] of await comprobarServicios()) {
      const enviado = await avisarAlDesarrolladorUnaVez(desarrollador, TIPO_AVISO, `${servicio}-${problema}-${dia}`, {
        ...textoProblema(servicio, problema),
        ruta: RUTA,
      });
      if (enviado) avisados.push(`${servicio}-${problema}`);
    }
  } catch (error) {
    console.error("[vigilancia]", error);
  }
  return avisados;
}
