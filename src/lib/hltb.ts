import "server-only";
import { HowLongToBeatService, toHours } from "howlongtobeat-ts";
import { getDb } from "@/db";
import { games } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Tiempos de HowLongToBeat — "modo historia" (`main`) y "platino/100%"
 * (`completionist`), que es justo lo que se pidió: horas estimadas por un
 * lado para la historia y por otro para el platino.
 *
 * NO es el paquete npm `howlongtobeat` (el que usó Antigravity al montar
 * esto): HowLongToBeat.com cambió de verdad su API el mes pasado —
 * `/api/search` (lo que usa ese paquete, incluso en su última versión
 * publicada) da 404 siempre, comprobado en vivo. El endpoint real ahora es
 * `/api/search/site`, con un token de seguridad en dos pasos (`GET
 * /api/search/site/init` para sacar un token de un solo uso, luego el
 * `POST` de verdad con ese token en las cabeceras) — reconstruido a mano
 * una vez (ver el historial de esta sesión), pero `howlongtobeat-ts`
 * (github.com/Deadlock-too/howlongtobeat-ts, activamente mantenido,
 * publicado hace 2 semanas explícitamente POR este mismo cambio de API) ya
 * lo hace bien, con reintentos y manejo de 429/403 — usar esa librería en
 * vez de reinventar la rueda de un mecanismo que puede volver a cambiar.
 *
 * Riesgo asumido a propósito, mismo criterio que PowerPyx/OpenXBL: sitio de
 * terceros sin API oficial, el propio paquete avisa de que HowLongToBeat
 * bloquea rangos de IP de centros de datos (como los de Vercel) en el paso
 * de "init" — si eso pasa, se ve como un fallo de red normal más abajo, sin
 * romper nada.
 */
const hltbService = new HowLongToBeatService();

// Umbral mínimo de similitud (0-1, la propia librería la calcula) para
// aceptar un resultado. Sin esto se cogía "el primer resultado" a ciegas —
// el mismo error que ya causó el caso real de "The Witcher 3" emparejando
// con el DLC "Blood and Wine" en PowerPyx (ver lib/powerpyx.ts). Aquí
// `howlongtobeat-ts` ya ordena por similitud (a diferencia del paquete
// viejo, que ordenaba por popularidad de HLTB) — comprobado en vivo: "The
// Witcher 3" devuelve primero "The Witcher 3: Wild Hunt", no una expansión
// — pero se coge el mejor por similitud explícitamente de todas formas, no
// "el primero", por si ese orden cambia. 0.5 es deliberadamente permisivo
// (deja pasar títulos con puntuación/subtítulo distinto) pero descarta
// coincidencias flojas antes que guardar el tiempo de otro juego.
const SIMILITUD_MINIMA = 0.5;

/**
 * Busca un juego en HLTB y guarda sus tiempos en la base de datos.
 * Si no encuentra nada (o el fallo es de RED, no "no existe"), no marca
 * nada como comprobado — se reintenta en la próxima visita, en vez de
 * darlo por perdido para siempre por un fallo pasajero.
 *
 * @param gameId El ID nativo del juego en la base de datos (ej. "psn-NPWR12345_00")
 * @param title El título del juego (ej. "The Witcher 3")
 */
export async function syncGameHltb(gameId: string, title: string) {
  try {
    const resultado = await hltbService.search(title);

    if (!resultado.success) {
      // Fallo de red/HTTP (incluido el bloqueo de IP de centro de datos que
      // el propio paquete documenta) — no es lo mismo que "este juego no
      // está en HLTB", así que no se guarda `hltb: {}` aquí: eso lo dejaría
      // marcado como "ya comprobado" para siempre por un fallo de hoy.
      console.error(`[hltb] ${title}:`, resultado.error);
      return null;
    }

    // Si no hay resultados, guardamos un objeto vacío para no volver a
    // buscarlo — esto SÍ es "no existe", no un fallo de red.
    if (resultado.data.length === 0) {
      const db = getDb();
      await db.update(games).set({ hltb: {} }).where(eq(games.id, gameId));
      return null;
    }

    const mejor = resultado.data.reduce((a, b) => (b.similarity > a.similarity ? b : a));
    if (mejor.similarity < SIMILITUD_MINIMA) {
      const db = getDb();
      await db.update(games).set({ hltb: {} }).where(eq(games.id, gameId));
      return null;
    }

    const hltbData = {
      main: toHours(mejor.mainTime),
      mainExtra: toHours(mejor.mainExtraTime),
      completionist: toHours(mejor.completionistTime),
    };

    const db = getDb();
    await db.update(games).set({ hltb: hltbData }).where(eq(games.id, gameId));

    return hltbData;
  } catch (error) {
    console.error(`Error buscando HLTB para ${title}:`, error);
    return null;
  }
}
