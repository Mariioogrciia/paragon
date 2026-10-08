import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { games, userGames } from "@/db/schema";
import { dificultadDesdeRareza } from "@/lib/difficulty";
import { precioSteamEs, type PrecioSteam } from "@/lib/steamPrecio";

/**
 * "Platinos de oferta" (8 oct 2026): juegos de Steam rebajados cuyo 100 % es
 * asequible — lo que un comparador de precios no sabe y Paragon sí.
 *
 * - Ofertas: CheapShark (Steam, ordenadas por "Deal Rating"), sin clave.
 * - Dificultad: el logro más raro según los porcentajes GLOBALES de Steam
 *   (API pública, sin clave), con la misma escala que el resto de Paragon
 *   (`dificultadDesdeRareza`). No depende de que alguien de aquí tenga el
 *   juego: con pocos usuarios, las horas de HowLongToBeat o los votos de
 *   dificultad (22 juegos y 1 voto, 8 oct) dejarían la lista vacía.
 * - Precio en euros: Steam España, solo de los que se enseñan.
 * - Horas al 100 %: las de HowLongToBeat si ya las tenemos guardadas.
 */

export interface PlatinoOferta {
  steamAppId: string;
  titulo: string;
  caratula: string;
  /** Steam España, en euros; null si Steam no lo da (entonces van los dólares). */
  precio: PrecioSteam | null;
  precioUsd: number;
  ahorro: number;
  logros: number;
  /** % de jugadores que tienen el logro más raro. */
  logroMasRaro: number;
  dificultad: { nivel: number; etiqueta: string; color: string };
  horas: number | null;
  /** Ficha en Paragon si alguien ya lo tiene; si no, null (se enlaza a Steam). */
  gameId: string | null;
  url: string;
}

const UA = "Paragon/1.0 (+https://github.com/Mariioogrciia/paragon)";
/**
 * Hasta "Difícil" (logro más raro ≥ 3 %): casi todos los juegos tienen algún
 * logro rarísimo, y con ≥ 6 % de 60 ofertas quedaban 4 (8 oct 2026).
 */
const NIVEL_MAXIMO = 6;

interface DealCheapShark {
  title: string;
  steamAppID: string | null;
  salePrice: string;
  savings: string;
}

async function pagina(n: number): Promise<DealCheapShark[]> {
  try {
    const res = await fetch(`https://www.cheapshark.com/api/1.0/deals?storeID=1&pageSize=60&pageNumber=${n}&sortBy=Deal%20Rating&onSale=true`, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": UA },
      next: { revalidate: 21_600 },
    });
    return res.ok ? ((await res.json()) as DealCheapShark[]) : [];
  } catch (error) {
    console.error("[platinosOferta] CheapShark", error);
    return [];
  }
}

/** Las 120 mejores ofertas de Steam (dos páginas). */
async function ofertas(): Promise<DealCheapShark[]> {
  return (await Promise.all([pagina(0), pagina(1)])).flat();
}

/** Nº de logros y % del más raro (global de Steam). null si no tiene logros. */
async function rarezaSteam(appId: string): Promise<{ logros: number; minimo: number } | null> {
  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${appId}&format=json`,
      { signal: AbortSignal.timeout(8_000), next: { revalidate: 86_400 } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { achievementpercentages?: { achievements?: { percent: number | string }[] } };
    const lista = json.achievementpercentages?.achievements ?? [];
    if (lista.length === 0) return null;
    return { logros: lista.length, minimo: Math.min(...lista.map((a) => Number(a.percent))) };
  } catch {
    return null;
  }
}

/** De `n` en `n`, para no lanzar 60 peticiones a la vez. */
async function enTandas<T, R>(lista: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const salida: R[] = [];
  for (let i = 0; i < lista.length; i += n) salida.push(...(await Promise.all(lista.slice(i, i + n).map(fn))));
  return salida;
}

/**
 * Las mejores, de la más fácil a la más difícil (y a igualdad, la más
 * rebajada). Con `userId`, sin los juegos de Steam que ya tiene.
 */
export async function platinosDeOferta(userId: string | null, limite = 12): Promise<PlatinoOferta[]> {
  const vistos = new Set<string>();
  const deals = (await ofertas()).filter((d) => {
    if (!d.steamAppID || !/^\d+$/.test(d.steamAppID) || vistos.has(d.steamAppID)) return false;
    vistos.add(d.steamAppID);
    return true;
  });
  if (deals.length === 0) return [];

  const ids = deals.map((d) => d.steamAppID!);
  const [rarezas, enBase, mios] = await Promise.all([
    enTandas(ids, 8, rarezaSteam),
    db
      .select({ id: games.id, nativeId: games.nativeId, hltb: games.hltb })
      .from(games)
      .where(and(eq(games.platform, "steam"), inArray(games.nativeId, ids))),
    userId
      ? db
          .select({ nativeId: games.nativeId })
          .from(userGames)
          .innerJoin(games, eq(games.id, userGames.gameId))
          .where(and(eq(userGames.userId, userId), eq(userGames.isWishlist, false), eq(games.platform, "steam"), inArray(games.nativeId, ids)))
      : Promise.resolve([]),
  ]);
  const base = new Map(enBase.map((g) => [g.nativeId, g]));
  const loTengo = new Set(mios.map((g) => g.nativeId));

  const candidatos = deals
    .map((d, i) => ({ d, r: rarezas[i] }))
    .filter((x): x is { d: DealCheapShark; r: { logros: number; minimo: number } } => x.r !== null && !loTengo.has(x.d.steamAppID!))
    .map(({ d, r }) => ({ d, r, dif: dificultadDesdeRareza(r.minimo, false) }))
    .filter((x) => x.dif.nivel <= NIVEL_MAXIMO)
    .sort((a, b) => a.dif.nivel - b.dif.nivel || Number(b.d.savings) - Number(a.d.savings))
    .slice(0, limite);

  const eur = await enTandas(candidatos, 4, (c) => precioSteamEs(c.d.steamAppID!));

  return candidatos.map(({ d, r, dif }, i) => {
    const appId = d.steamAppID!;
    const enParagon = base.get(appId);
    return {
      steamAppId: appId,
      titulo: d.title,
      caratula: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
      precio: eur[i],
      precioUsd: Number(d.salePrice),
      ahorro: eur[i]?.descuento || Math.round(Number(d.savings)),
      logros: r.logros,
      logroMasRaro: Math.round(r.minimo * 10) / 10,
      dificultad: { nivel: dif.nivel, etiqueta: dif.etiqueta, color: dif.color },
      horas: enParagon?.hltb?.completionist ?? null,
      gameId: enParagon?.id ?? null,
      url: `https://store.steampowered.com/app/${appId}/`,
    };
  });
}
