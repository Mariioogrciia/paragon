import "server-only";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { db } from "@/db";
import { gameTrophies, gameTrophyI18n, gameTrophyI18nEstado, games } from "@/db/schema";
import { fetchDefinicionesPsn } from "@/lib/psn/client";
import { fetchDefinicionesSteam } from "@/lib/steam/client";
import { fetchAchievements as fetchLogrosXbox } from "@/lib/xbl/client";
import { parseGameKey } from "@/lib/types";
import { CODIGO_PLATAFORMA, IDIOMA_BASE, esIdioma, type Idioma } from "@/lib/idiomasTrofeo";

/**
 * Nombres y descripciones de trofeos en el idioma de la interfaz (1 oct
 * 2026).
 *
 * `game_trophy.name/detail` guarda UN idioma por juego: el de la primera
 * sincronización (PSN y Xbox en inglés, Steam y Epic en español). Aquí se
 * pide a la propia plataforma el mismo juego en otro idioma —NO hay
 * traducción automática: si la plataforma no lo tiene (muchos juegos de
 * Steam/Xbox no están localizados) se queda como está— y se guarda en
 * `game_trophy_i18n` para que lo lea cualquiera con ese idioma sin volver a
 * preguntar. Epic y los juegos manuales no se traducen (Epic solo se puede
 * leer desde la extensión del navegador, ver lib/declarado.ts).
 *
 * El nombre ORIGINAL sigue siendo la referencia para todo lo que empareja
 * por texto (trofeos perdibles de PowerPyx, búsqueda en inglés...): esto
 * solo cambia lo que se enseña.
 */

export interface TrofeoTraducido {
  name: string;
  detail: string;
  groupName: string | null;
}

export async function idiomaActual(): Promise<Idioma> {
  const locale = await getLocale();
  return esIdioma(locale) ? locale : "es";
}

const DIA = 86_400_000;
/** Cuánto esperar a la plataforma antes de servir la página sin traducir (se completará en la siguiente visita). */
const ESPERA_MAX_MS = 5_000;

/** Misma petición simultánea (mismo juego e idioma) = una sola llamada a la plataforma. */
const enCurso = new Map<string, Promise<void>>();

/** Solo lo guardado, sin llamar a ninguna plataforma: para listas (siguiente trofeo, recientes...). */
export async function traduccionesEnCache(
  pares: { gameId: string; trophyId: string }[],
  idioma: Idioma,
): Promise<Map<string, TrofeoTraducido>> {
  const resultado = new Map<string, TrofeoTraducido>();
  if (pares.length === 0) return resultado;
  const quiero = new Set(pares.map((p) => `${p.gameId}\u0000${p.trophyId}`));
  const filas = await db
    .select()
    .from(gameTrophyI18n)
    .where(and(eq(gameTrophyI18n.lang, idioma), inArray(gameTrophyI18n.gameId, [...new Set(pares.map((p) => p.gameId))])));
  for (const f of filas) {
    if (quiero.has(`${f.gameId}\u0000${f.trophyId}`)) resultado.set(`${f.gameId}:${f.trophyId}`, { name: f.name, detail: f.detail, groupName: f.groupName });
  }
  return resultado;
}

/**
 * Traducciones de TODOS los trofeos de un juego al idioma pedido; si no
 * están guardadas (o han caducado) las pide a la plataforma. Devuelve un
 * mapa por `trophyId`, vacío si el idioma es el base de esa plataforma o
 * no hay nada que traducir.
 *
 * `xboxAccountId`: Xbox solo da los logros de un jugador concreto, así que
 * hace falta el xuid de alguien que tenga el juego (el dueño de la ficha).
 */
export async function traducirTrofeos(
  gameId: string,
  idioma: Idioma,
  opciones: { xboxAccountId?: string } = {},
): Promise<Map<string, TrofeoTraducido>> {
  const { platform } = parseGameKey(gameId);
  const codigo = CODIGO_PLATAFORMA[platform]?.[idioma];
  if (!codigo || IDIOMA_BASE[platform] === idioma) return new Map();

  const [estado] = await db
    .select()
    .from(gameTrophyI18nEstado)
    .where(and(eq(gameTrophyI18nEstado.gameId, gameId), eq(gameTrophyI18nEstado.lang, idioma)))
    .limit(1);

  const [{ total }] = await db.select({ total: count() }).from(gameTrophies).where(eq(gameTrophies.gameId, gameId));
  const edad = estado ? Date.now() - estado.checkedAt.getTime() : Infinity;
  // Reciente = no insistir; completo = vale mucho tiempo; incompleto (un
  // DLC nuevo, o trofeos que la plataforma no localiza) = reintentar cada semana.
  const fresco = estado && (edad < DIA || (estado.found >= Number(total) && edad < 180 * DIA) || edad < 7 * DIA);

  if (!fresco) {
    const clave = `${gameId}\u0000${idioma}`;
    let trabajo = enCurso.get(clave);
    if (!trabajo) {
      trabajo = pedirYGuardar(gameId, platform, idioma, codigo, opciones.xboxAccountId).finally(() => enCurso.delete(clave));
      enCurso.set(clave, trabajo);
    }
    // Si la plataforma tarda, se sirve lo que haya y la petición termina sola en segundo plano.
    await Promise.race([trabajo.catch(() => undefined), new Promise((r) => setTimeout(r, ESPERA_MAX_MS))]);
  }

  const filas = await db
    .select()
    .from(gameTrophyI18n)
    .where(and(eq(gameTrophyI18n.gameId, gameId), eq(gameTrophyI18n.lang, idioma)));
  return new Map(filas.map((f) => [f.trophyId, { name: f.name, detail: f.detail, groupName: f.groupName }]));
}

async function pedirYGuardar(gameId: string, platform: string, idioma: Idioma, codigo: string, xboxAccountId?: string): Promise<void> {
  const { nativeId } = parseGameKey(gameId);
  let definiciones: { trophyId: string; name: string; detail: string; groupName?: string }[] = [];

  try {
    if (platform === "psn") {
      const [fila] = await db.select({ service: games.service }).from(games).where(eq(games.id, gameId)).limit(1);
      definiciones = await fetchDefinicionesPsn(nativeId, (fila?.service as "trophy" | "trophy2" | null) ?? "trophy2", codigo);
    } else if (platform === "steam") {
      definiciones = await fetchDefinicionesSteam(nativeId, codigo);
    } else if (platform === "xbox") {
      // Sin cuenta de Xbox con el juego no se puede pedir: se intentará en otra visita.
      if (!xboxAccountId) return;
      definiciones = (await fetchLogrosXbox(xboxAccountId, nativeId, codigo)).map((t) => ({ trophyId: t.id, name: t.name, detail: t.detail }));
    }
  } catch (error) {
    // Un fallo de la plataforma no deja marcado "ya comprobado": se reintenta en la próxima visita.
    console.error("[trofeosIdioma]", gameId, idioma, error);
    return;
  }

  // Solo trofeos que ya existen en el juego, y con nombre.
  const conocidos = new Set(
    (await db.select({ id: gameTrophies.trophyId }).from(gameTrophies).where(eq(gameTrophies.gameId, gameId))).map((r) => r.id),
  );
  const validas = definiciones.filter((d) => conocidos.has(d.trophyId) && d.name.trim());

  for (let i = 0; i < validas.length; i += 200) {
    const lote = validas.slice(i, i + 200).map((d) => ({
      gameId,
      trophyId: d.trophyId,
      lang: idioma,
      name: d.name.trim().slice(0, 300),
      detail: d.detail.trim().slice(0, 1000),
      groupName: d.groupName?.trim().slice(0, 200) || null,
    }));
    await db
      .insert(gameTrophyI18n)
      .values(lote)
      .onConflictDoUpdate({
        target: [gameTrophyI18n.gameId, gameTrophyI18n.trophyId, gameTrophyI18n.lang],
        set: { name: sql`excluded."name"`, detail: sql`excluded."detail"`, groupName: sql`excluded."groupName"` },
      });
  }

  await db
    .insert(gameTrophyI18nEstado)
    .values({ gameId, lang: idioma, found: validas.length, checkedAt: new Date() })
    .onConflictDoUpdate({
      target: [gameTrophyI18nEstado.gameId, gameTrophyI18nEstado.lang],
      set: { found: validas.length, checkedAt: new Date() },
    });
}
