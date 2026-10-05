import "server-only";
import { getDb } from "@/db";
import { trophyCaseAwards, leagues, users } from "@/db/schema";
import { eq, and, lt, isNotNull, desc, inArray } from "drizzle-orm";
import { getLigaMensual } from "@/lib/ligas";
import { getLeagueRankings } from "@/lib/leagues";
import { ganadoresDeLiga, puestosDeLiga } from "@/lib/ligasCierre";
import { avisarUsuario } from "@/lib/avisos";
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
 * Cierra de verdad cada Liga privada cuya `endsAt` ya ha pasado: la marca
 * como terminada (`awarded`, una sola vez), da el premio del palmarés a
 * quien gana (todos los empatados en lo más alto; a diferencia de la Liga
 * Mensual, una liga de amigos se gana o no) y avisa a cada miembro de cómo
 * ha quedado. Las reglas puras, con tests, en lib/ligasCierre.ts. Después de
 * cerrarse, lib/leagues.ts no deja cambiar el reto ni invitar a nadie.
 */
const AVISAR_HASTA_MS = 3 * 86_400_000;

export async function cerrarLigasPrivadasVencidas(ahora: Date = new Date()): Promise<number> {
  const db = getDb();

  // Solo las que aún no se han cerrado: `awarded` se pone al cerrar, así que
  // cada liga se procesa (y avisa) una sola vez.
  const vencidas = await db
    .select({ id: leagues.id, name: leagues.name, endsAt: leagues.endsAt })
    .from(leagues)
    .where(and(isNotNull(leagues.endsAt), lt(leagues.endsAt, ahora), eq(leagues.awarded, false)))
    .limit(25);
  if (vencidas.length === 0) return 0;

  let cerradas = 0;
  for (const liga of vencidas) {
    // Primero se marca: si algo falla después, no se repiten avisos en la siguiente pasada.
    const marcada = await db
      .update(leagues)
      .set({ awarded: true })
      .where(and(eq(leagues.id, liga.id), eq(leagues.awarded, false)))
      .returning({ id: leagues.id });
    if (marcada.length === 0) continue;
    cerradas++;

    const ranking = await getLeagueRankings(liga.id);
    const ganadores = ganadoresDeLiga(ranking);
    const puestos = puestosDeLiga(ranking);

    // Palmarés: todos los empatados en lo más alto.
    if (ganadores.length > 0) {
      await db
        .insert(trophyCaseAwards)
        .values(ganadores.map((userId) => ({ userId, kind: "liga_privada" as const, rank: 1, periodo: liga.id, titulo: liga.name })))
        .onConflictDoNothing();
    }

    // Aviso a cada miembro con su resultado. Las que terminaron hace días (las
    // de antes de que existiera este cierre, 5 oct 2026) se cierran sin avisar:
    // un aviso de una liga de hace meses solo confunde.
    const reciente = !!liga.endsAt && ahora.getTime() - liga.endsAt.getTime() < AVISAR_HASTA_MS;
    if (!reciente) continue;
    const nombres = ganadores.length
      ? await db.select({ id: users.id, name: users.name, handle: users.handle }).from(users).where(inArray(users.id, ganadores))
      : [];
    const nombreGanador = nombres
      .map((u) => (u.handle ? `@${u.handle}` : u.name ?? "alguien"))
      .join(" y ");
    const puntosGanador = ranking.find((r) => ganadores.includes(r.userId))?.points ?? 0;
    const ruta = `/ligas/${liga.id}`;
    await Promise.all(
      ranking.map((r) => {
        const gane = ganadores.includes(r.userId);
        const aviso = gane
          ? {
              titulo: ganadores.length > 1 ? `🏆 ¡Empate en lo más alto de «${liga.name}»!` : `🏆 ¡Has ganado la liga «${liga.name}»!`,
              texto: `La liga ha terminado: ${puntosGanador} puntos. Ya está en tu palmarés.`,
              ruta,
            }
          : {
              titulo: `🏁 Ha terminado la liga «${liga.name}»`,
              texto: ganadores.length
                ? `Ganó ${nombreGanador} con ${puntosGanador} puntos. Tú quedaste ${puestos.get(r.userId)}.º de ${ranking.length}.`
                : "Nadie sumó puntos durante la liga: no hay ganador.",
              ruta,
            };
        return avisarUsuario(r.userId, aviso, "ligas").catch((e) => console.error("[ligas] aviso de cierre", e));
      }),
    );
  }

  return cerradas;
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
