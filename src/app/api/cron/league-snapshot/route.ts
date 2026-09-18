import { NextResponse } from "next/server";
import { db } from "@/db";
import { leagues, leagueStandingSnapshots } from "@/db/schema";
import { getLeagueRankings } from "@/lib/leagues";

/**
 * Foto semanal de la clasificación de cada liga — sin esto, el ranking de
 * Ligas no puede enseñar "+2 puestos esta semana" (solo el ranking de
 * AHORA, ver `pointsSql`/`getLeagueDetail`). Cron propio y separado del de
 * sincronización (`/api/cron/sync`) a propósito: ese tiene un presupuesto
 * de tiempo muy ajustado por un incidente real (cron-job.org cortando a
 * los 30s, ver PRESUPUESTO_MS ahí) — meter trabajo nuevo en esa misma
 * función arriesgaría reabrir ese mismo problema. Esta ruta es tan barata
 * (sumar puntos por liga, nada de llamadas a PSN/Steam/Xbox) que corre
 * directa con el cron nativo de Vercel (ver vercel.json), sin necesitar
 * cron-job.org de por medio.
 *
 * Se SOBRESCRIBE la fila de cada (liga, miembro) en vez de acumular
 * historial — solo hace falta "el puesto de hace una semana" para calcular
 * el movimiento; guardar cada semana desde siempre no se usa para nada
 * todavía y solo haría crecer la tabla sin motivo.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    return NextResponse.json({ error: "Falta CRON_SECRET en el servidor." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const todasLasLigas = await db.select({ id: leagues.id }).from(leagues);

  let ligasFotografiadas = 0;
  let filasEscritas = 0;

  for (const liga of todasLasLigas) {
    const ranking = await getLeagueRankings(liga.id);
    if (ranking.length === 0) continue;

    const filas = ranking.map((r, i) => ({
      leagueId: liga.id,
      userId: r.userId,
      rank: i + 1,
      points: r.points,
      capturedAt: new Date(),
    }));

    for (const fila of filas) {
      await db
        .insert(leagueStandingSnapshots)
        .values(fila)
        .onConflictDoUpdate({
          target: [leagueStandingSnapshots.leagueId, leagueStandingSnapshots.userId],
          set: { rank: fila.rank, points: fila.points, capturedAt: fila.capturedAt },
        });
      filasEscritas++;
    }
    ligasFotografiadas++;
  }

  return NextResponse.json({ ok: true, ligasFotografiadas, filasEscritas });
}
