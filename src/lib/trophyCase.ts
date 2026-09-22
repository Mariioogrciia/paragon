import "server-only";
import { getDb } from "@/db";
import { trophyCaseAwards, leagues, users } from "@/db/schema";
import { eq, and, lt, isNotNull, desc, inArray } from "drizzle-orm";
import { getLigaMensual } from "@/lib/ligas";
import { getLeagueRankings } from "@/lib/leagues";
import { avatarUrlSql } from "@/lib/avatarSql";

/**
 * Palmarés: repartir el Top 3 de la Liga Mensual cuando el mes cambia, y el
 * premio de ganador cuando una Liga privada llega a su `endsAt` — ver el
 * comentario de `trophyCaseAwards` en db/schema.ts.
 *
 * Las dos funciones de aquí abajo se llaman desde el propio cron de
 * sincronización (`/api/cron/sync`, que ya corre cada 15 min de verdad vía
 * cron-job.org — ver su comentario) en vez de tener un cron propio: el plan
 * Hobby de Vercel no da crons ilimitados, y estas comprobaciones son
 * baratas (unas pocas consultas con LIMIT) e IDEMPOTENTES — el índice único
 * `(userId, kind, periodo)` con `onConflictDoNothing` hace que llamarlas de
 * más nunca duplique un premio ya concedido.
 */

function periodoDe(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * El ganador ABSOLUTO del mes que acaba de terminar (solo el 1º, nada de
 * Top 3 — decisión deliberada: un palmarés donde casi cualquiera acaba con
 * alguna copa deja de significar nada), si todavía no se ha repartido. Se
 * calcula sobre el mes ANTERIOR a `ahora`, nunca sobre el actual — el mes
 * en curso sigue en juego, cerrarlo antes de tiempo congelaría el ranking
 * para quien lleve la delantera esta semana.
 */
export async function cerrarLigaMensualSiToca(ahora: Date = new Date()): Promise<number> {
  const db = getDb();
  const mesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const periodo = periodoDe(mesAnterior);

  const yaRepartido = await db
    .select({ id: trophyCaseAwards.id })
    .from(trophyCaseAwards)
    .where(and(eq(trophyCaseAwards.kind, "liga_mensual"), eq(trophyCaseAwards.periodo, periodo)))
    .limit(1);
  if (yaRepartido.length > 0) return 0;

  const ranking = await getLigaMensual(mesAnterior);
  const ganador = ranking.find((u) => u.points > 0);
  if (!ganador) return 0;

  const nombreMes = mesAnterior.toLocaleString("es-ES", { month: "long", year: "numeric" });
  const titulo = `Liga Mensual · ${nombreMes}`;

  await db
    .insert(trophyCaseAwards)
    .values({ userId: ganador.userId, kind: "liga_mensual" as const, rank: 1, periodo, titulo })
    .onConflictDoNothing();

  return 1;
}

/**
 * Ganador de cada Liga privada cuya `endsAt` ya ha pasado y todavía no
 * tiene premio concedido. Solo el puesto 1: a diferencia de la Liga
 * Mensual (Top 3 entre todo el mundo), una liga de amigos se gana o no.
 */
export async function cerrarLigasPrivadasVencidas(ahora: Date = new Date()): Promise<number> {
  const db = getDb();

  const vencidas = await db
    .select({ id: leagues.id, name: leagues.name })
    .from(leagues)
    .where(and(isNotNull(leagues.endsAt), lt(leagues.endsAt, ahora)));
  if (vencidas.length === 0) return 0;

  const yaConcedidas = await db
    .select({ periodo: trophyCaseAwards.periodo })
    .from(trophyCaseAwards)
    .where(
      and(
        eq(trophyCaseAwards.kind, "liga_privada"),
        inArray(trophyCaseAwards.periodo, vencidas.map((l) => l.id)),
      ),
    );
  const concedidasSet = new Set(yaConcedidas.map((r) => r.periodo));

  let repartidos = 0;
  for (const liga of vencidas) {
    if (concedidasSet.has(liga.id)) continue;

    const ranking = await getLeagueRankings(liga.id);
    const ganador = ranking.find((r) => r.points > 0);
    if (!ganador) continue;

    await db
      .insert(trophyCaseAwards)
      .values({ userId: ganador.userId, kind: "liga_privada", rank: 1, periodo: liga.id, titulo: liga.name })
      .onConflictDoNothing();
    repartidos++;
  }

  return repartidos;
}

export interface TrophyCaseAward {
  kind: "liga_mensual" | "liga_privada";
  rank: number;
  titulo: string;
  earnedAt: string;
}

/** Palmarés de un usuario, para el perfil público — ver components/TrophyCase.tsx. */
export async function getUserTrophyCase(userId: string): Promise<TrophyCaseAward[]> {
  const db = getDb();
  const rows = await db
    .select({
      kind: trophyCaseAwards.kind,
      rank: trophyCaseAwards.rank,
      titulo: trophyCaseAwards.titulo,
      earnedAt: trophyCaseAwards.earnedAt,
    })
    .from(trophyCaseAwards)
    .where(eq(trophyCaseAwards.userId, userId))
    .orderBy(desc(trophyCaseAwards.earnedAt));

  return rows.map((r) => ({ ...r, earnedAt: r.earnedAt.toISOString() }));
}

export interface MonthlyLeagueChampion {
  periodo: string;
  titulo: string;
  rank: number;
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
}

/** Historial de la Liga Mensual, meses ya cerrados — para /ligas. */
export async function getMonthlyLeagueHistory(limitMeses: number): Promise<MonthlyLeagueChampion[]> {
  const db = getDb();
  const rows = await db
    .select({
      periodo: trophyCaseAwards.periodo,
      titulo: trophyCaseAwards.titulo,
      rank: trophyCaseAwards.rank,
      userId: users.id,
      handle: users.handle,
      name: users.name,
      image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
    })
    .from(trophyCaseAwards)
    .innerJoin(users, eq(users.id, trophyCaseAwards.userId))
    .where(eq(trophyCaseAwards.kind, "liga_mensual"))
    .orderBy(desc(trophyCaseAwards.periodo), trophyCaseAwards.rank);

  const periodos = [...new Set(rows.map((r) => r.periodo))].slice(0, limitMeses);
  const periodosSet = new Set(periodos);
  return rows.filter((r) => periodosSet.has(r.periodo));
}
