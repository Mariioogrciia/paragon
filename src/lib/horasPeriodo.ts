import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Horas jugadas EN un periodo. PSN y Steam solo dan el total acumulado de
 * cada juego, nunca cuándo se jugó; así que Paragon guarda ese total cada
 * día que cambia (`playtime_snapshot`) y las horas de un periodo salen de
 * restar el total de hoy menos el del inicio del periodo.
 *
 * Solo hay registro desde el 29 de septiembre de 2026 (foto inicial de
 * `scripts/crear-tabla-registro-horas.mts`): para un periodo que empieza
 * antes, se resta desde el primer registro y la pantalla lo avisa
 * (`inicioRegistro`), en vez de inventarse unas horas que no se saben.
 */

/** Cron: apunta el total de hoy de cada juego cuyo total ha cambiado desde el último registro. */
export async function registrarHorasDelDia(): Promise<number> {
  const filas = await db.execute(sql`
    insert into playtime_snapshot ("userId", "gameId", fecha, minutos)
    select ug."userId", ug."gameId", current_date, ug."playtimeMinutes"
    from user_game ug
    left join lateral (
      select s.minutos from playtime_snapshot s
      where s."userId" = ug."userId" and s."gameId" = ug."gameId"
      order by s.fecha desc limit 1
    ) ultimo on true
    where ug."playtimeMinutes" is not null
      and not ug."isWishlist"
      and ultimo.minutos is distinct from ug."playtimeMinutes"
    on conflict ("userId", "gameId", fecha) do update set minutos = excluded.minutos
    returning 1
  `);
  return filas.length;
}

/**
 * Minutos jugados desde `desde` por cada juego del usuario, y desde cuándo
 * hay registro. Un juego sin ningún registro todavía (recién añadido, antes
 * de que pase el cron) cuenta 0: no se sabe cuánto de su total es de este
 * periodo.
 */
export async function minutosDesde(userId: string, desde: Date): Promise<{ minutos: Map<string, number>; inicioRegistro: Date | null }> {
  const dia = desde.toISOString().slice(0, 10);
  const [filas, inicio] = await Promise.all([
    db.execute<{ gameId: string; actual: number; base: number | null }>(sql`
      select ug."gameId", ug."playtimeMinutes" as actual,
        coalesce(
          (select s.minutos from playtime_snapshot s
            where s."userId" = ug."userId" and s."gameId" = ug."gameId" and s.fecha <= ${dia}::date
            order by s.fecha desc limit 1),
          (select s.minutos from playtime_snapshot s
            where s."userId" = ug."userId" and s."gameId" = ug."gameId"
            order by s.fecha asc limit 1)
        ) as base
      from user_game ug
      where ug."userId" = ${userId} and ug."playtimeMinutes" is not null and not ug."isWishlist"
    `),
    db.execute<{ inicio: string | null }>(sql`select min(fecha)::text as inicio from playtime_snapshot where "userId" = ${userId}`),
  ]);
  const minutos = new Map<string, number>();
  for (const f of filas) {
    if (f.base === null) continue;
    const delta = Number(f.actual) - Number(f.base);
    if (delta > 0) minutos.set(f.gameId, delta);
  }
  const inicioTexto = inicio[0]?.inicio;
  return { minutos, inicioRegistro: inicioTexto ? new Date(`${inicioTexto}T00:00:00Z`) : null };
}
