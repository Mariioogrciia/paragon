import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { gameTrophies, games, userTrophies } from "@/db/schema";
import { trophyScore } from "@/lib/trophyScore";
import type { TrophyGrade } from "@/lib/types";

export { trophyScore } from "@/lib/trophyScore";

/**
 * Puntuación unificada entre plataformas ("Paragon Score") — no toca el
 * nivel Paragon que ya existe (`lib/level.ts`, `paragonProgress`): ese solo
 * cuenta metales de PSN (`game.earned`) y ya está enganchado en la navbar,
 * la tarjeta del perfil y el Wrap con un histórico de bugs de
 * desincronización entre esos tres sitios (ver HANDOFF.md) — tocarlo a
 * fondo para meter Xbox/Steam ahí es un riesgo real que no hace falta
 * correr. Esto es una cifra NUEVA y aparte, pensada para comparar entre
 * plataformas de verdad.
 *
 * El problema que resuelve: PSN pesa por metal (bronce/plata/oro/platino),
 * Xbox por Gamerscore (ya oficial, lo pone Microsoft), Steam no pesa nada
 * — un logro cualquiera vale igual que el más raro del juego. Con eso, un
 * ranking mezclando plataformas no es justo.
 *
 * La escala común es la que ya usa `XP_POR_GRADO` de PSN (bronce 10 / plata
 * 25 / oro 50 / platino 200) — no una inventada aparte:
 * - PSN: su `grade` de siempre, sin cambios.
 * - Xbox: el Gamerscore real del logro (`game_trophy.xp`, puesto por
 *   Microsoft) tal cual, sin convertir — un Gamerscore de 10-50 ya cae en
 *   el mismo rango que bronce/plata/oro de PSN por pura coincidencia de
 *   escalas, y es un dato oficial, no una estimación.
 * - Steam: SIN peso propio — se estima por `rarityPercent` (más raro =
 *   más difícil), en los mismos tramos que ya usa `rarity()` en
 *   lib/design.ts para "Común/Raro/Muy raro/Ultra raro". Un solo logro,
 *   por raro que sea, nunca llega al peso de un platino entero (que es
 *   completar TODO el juego, no un logro suelto) — el tramo más alto se
 *   queda por debajo de `XP_POR_GRADO.platinum`.
 *
 * Es una estimación, no un hecho verificable — se dice así en la interfaz
 * en cualquier sitio que la enseñe, igual que la dificultad estimada por
 * rareza.
 */

// La fórmula en sí (trophyScore) vive en lib/trophyScore.ts, sin
// "server-only" — la reexporta el `export { trophyScore }` de arriba para
// que quien ya importaba desde aquí no se rompa.

export interface ParagonScoreBreakdown {
  total: number;
  porPlataforma: { platform: string; puntos: number; trofeos: number }[];
}

/**
 * Puntuación total de un usuario, sumando trofeo a trofeo con la fórmula de
 * arriba — a diferencia del nivel Paragon (que suma por el resumen
 * `game.earned`, solo PSN), esto recorre `user_trophy` de verdad, así que
 * cuenta Steam y Xbox trofeo a trofeo, no solo "juego completado".
 */
export async function getParagonScore(userId: string): Promise<ParagonScoreBreakdown> {
  const rows = await db
    .select({
      platform: games.platform,
      grade: gameTrophies.grade,
      xp: gameTrophies.xp,
      rarityPercent: userTrophies.rarityPercent,
    })
    .from(userTrophies)
    .innerJoin(games, eq(games.id, userTrophies.gameId))
    .innerJoin(
      gameTrophies,
      and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)),
    )
    .where(and(eq(userTrophies.userId, userId), eq(userTrophies.earned, true)));

  const porPlataforma = new Map<string, { puntos: number; trofeos: number }>();

  for (const row of rows) {
    const puntos = trophyScore({
      platform: row.platform,
      grade: row.grade as TrophyGrade | null,
      xp: row.xp,
      rarityPercent: row.rarityPercent,
    });

    const actual = porPlataforma.get(row.platform) ?? { puntos: 0, trofeos: 0 };
    actual.puntos += puntos;
    actual.trofeos += 1;
    porPlataforma.set(row.platform, actual);
  }

  const lista = Array.from(porPlataforma.entries())
    .map(([platform, v]) => ({ platform, puntos: v.puntos, trofeos: v.trofeos }))
    .sort((a, b) => b.puntos - a.puntos);

  return {
    total: lista.reduce((sum, p) => sum + p.puntos, 0),
    porPlataforma: lista,
  };
}
