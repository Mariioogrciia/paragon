import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { userTrophies } from "@/db/schema";

/**
 * "Top X% mundial" del Wrap: cuántos usuarios reales tienen MÁS trofeos con
 * fecha este año que tú, en porcentaje sobre el total de gente con al menos
 * uno.
 *
 * Con pocos usuarios reales (Paragon todavía es un grupo pequeño), un "estás
 * en el top 20%" no significa nada — puede ser "eres 1 de 5" disfrazado de
 * estadística. Por eso hay un umbral mínimo: por debajo, esta función
 * devuelve `null` y el Wrap se queda sin esa diapositiva en vez de enseñar un
 * dato que miente por parecer más grande de lo que es.
 */
export const MIN_USUARIOS_PERCENTIL = 20;

export interface PercentilAnio {
  /** "Estás en el top {percentil}%": cuanto más bajo, mejor. */
  percentil: number;
  totalUsuarios: number;
  miTotal: number;
}

export async function percentilTrofeosAnio(userId: string): Promise<PercentilAnio | null> {
  // Son unas pocas decenas/cientos de filas (una por usuario con algún
  // trofeo con fecha este año) — se traen enteras y se comparan en memoria,
  // igual que `rachas()` en lib/history.ts: se lee de un vistazo y no hace
  // falta una función de ventana en SQL para esto.
  const filas = await db.execute<{ userId: string; total: string | number }>(sql`
    select "userId", count(*) as total
    from ${userTrophies}
    where earned = true
      and "earnedAt" is not null
      and date_part('year', "earnedAt") = date_part('year', now())
    group by "userId"
  `);

  const totales = [...filas].map((f) => ({ userId: f.userId, total: Number(f.total) }));
  if (totales.length < MIN_USUARIOS_PERCENTIL) return null;

  const miTotal = totales.find((t) => t.userId === userId)?.total ?? 0;
  const mejores = totales.filter((t) => t.total > miTotal).length;
  // Al menos 1%: "top 0%" no se lee como "el primero", se lee como un error.
  const percentil = Math.max(1, Math.round((mejores / totales.length) * 100));

  return { percentil, totalUsuarios: totales.length, miTotal };
}
