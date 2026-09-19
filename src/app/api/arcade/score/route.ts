import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { arcadeScores, users } from "@/db/schema";
import { avatarUrlSql } from "@/lib/avatarSql";

const GAME = "cazador";
// Tope defensivo, no una promesa de "así de lejos se puede llegar de
// verdad" — el juego corre entero en el cliente (Canvas, sin validación de
// físicas en el servidor), así que esto es solo para que un POST directo
// con un número inventado no reviente el ranking para todo el mundo.
const PUNTUACION_MAXIMA = 999_999;

/**
 * Ranking del easter egg de /offline (Cazador de Platinos) — mejor
 * puntuación por usuario, no cada partida suelta, para que el top 10 no se
 * llene con la misma persona repetida. `mia` (mi mejor puntuación + mi
 * puesto) solo si hay sesión; el ranking en sí es público.
 */
export async function GET() {
  const db = getDb();
  const session = await auth();

  const top = await db.execute<{
    userId: string;
    name: string | null;
    handle: string | null;
    avatarUrl: string | null;
    score: number;
  }>(sql`
    select mejores."userId", u.name, u.handle,
      ${avatarUrlSql(users.id, users.image, users.avatarPersonalizado)} as "avatarUrl",
      mejores.score
    from (
      select "userId", max(score) as score
      from ${arcadeScores}
      where game = ${GAME}
      group by "userId"
    ) mejores
    join ${users} u on u.id = mejores."userId"
    order by mejores.score desc
    limit 10
  `);

  let mia: { score: number; puesto: number | null } | null = null;
  if (session?.user?.id) {
    const [fila] = await db
      .select({ score: sql<number>`max(${arcadeScores.score})` })
      .from(arcadeScores)
      .where(and(eq(arcadeScores.userId, session.user.id), eq(arcadeScores.game, GAME)));

    if (fila?.score != null) {
      const [{ puesto }] = await db.execute<{ puesto: number }>(sql`
        select count(*) + 1 as puesto
        from (
          select "userId", max(score) as score
          from ${arcadeScores}
          where game = ${GAME}
          group by "userId"
        ) mejores
        where mejores.score > ${fila.score}
      `);
      mia = { score: fila.score, puesto: Number(puesto) };
    }
  }

  return NextResponse.json({ top, mia });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const score = Number(body?.score);
  if (!Number.isFinite(score) || score < 0 || score > PUNTUACION_MAXIMA) {
    return NextResponse.json({ error: "Puntuación inválida" }, { status: 400 });
  }

  const db = getDb();
  await db.insert(arcadeScores).values({
    userId: session.user.id,
    game: GAME,
    score: Math.round(score),
  });

  const [mejor] = await db
    .select({ score: sql<number>`max(${arcadeScores.score})` })
    .from(arcadeScores)
    .where(and(eq(arcadeScores.userId, session.user.id), eq(arcadeScores.game, GAME)))
    .orderBy(desc(arcadeScores.score));

  return NextResponse.json({ ok: true, esNuevoRecord: mejor?.score === Math.round(score) });
}
