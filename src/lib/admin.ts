import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  games,
  notifications,
  platformAccounts,
  syncRuns,
  userBadges,
  userGames,
  users,
} from "@/db/schema";

/**
 * Datos para `/admin` — la única pantalla que ve solo quien hace Paragon
 * (ver `esDesarrollador` en profiles.ts). Nada de esto es sensible por sí
 * mismo (son las mismas cifras que ya se agregan en otros sitios, solo que
 * aquí sin filtrar por usuario), pero no tiene sentido enseñárselo a nadie
 * más: son métricas de la plataforma, no de un perfil.
 */

export interface AdminOverview {
  usuarios: number;
  cuentasPorPlataforma: { platform: string; total: number }[];
  juegosEnCatalogo: number;
  juegosConPegi: number;
  trofeosRegistrados: number;
  avisosGenerados: number;
  avisosUltimos7Dias: number;
  usuariosNuevosUltimos7Dias: number;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const [usuariosRow] = await db.select({ n: sql<number>`count(*)` }).from(users);

  const cuentasPorPlataforma = await db
    .select({ platform: platformAccounts.platform, total: sql<number>`count(*)` })
    .from(platformAccounts)
    .groupBy(platformAccounts.platform)
    .orderBy(sql`count(*) desc`);

  const [catalogoRow] = await db
    .select({
      total: sql<number>`count(*)`,
      conPegi: sql<number>`count(*) filter (where ${games.pegi} is not null)`,
    })
    .from(games);

  const [trofeosRow] = await db
    .select({ n: sql<number>`coalesce(sum(${userGames.earnedTotal}), 0)` })
    .from(userGames);

  const [avisosRow] = await db
    .select({
      total: sql<number>`count(*)`,
      ultimos7: sql<number>`count(*) filter (where ${notifications.createdAt} >= now() - interval '7 days')`,
    })
    .from(notifications);

  const [usuariosNuevosRow] = await db
    .select({ n: sql<number>`count(*) filter (where ${users.createdAt} >= now() - interval '7 days')` })
    .from(users);

  return {
    usuarios: Number(usuariosRow?.n ?? 0),
    cuentasPorPlataforma: cuentasPorPlataforma.map((r) => ({ platform: r.platform, total: Number(r.total) })),
    juegosEnCatalogo: Number(catalogoRow?.total ?? 0),
    juegosConPegi: Number(catalogoRow?.conPegi ?? 0),
    trofeosRegistrados: Number(trofeosRow?.n ?? 0),
    avisosGenerados: Number(avisosRow?.total ?? 0),
    avisosUltimos7Dias: Number(avisosRow?.ultimos7 ?? 0),
    usuariosNuevosUltimos7Dias: Number(usuariosNuevosRow?.n ?? 0),
  };
}

export interface AdminSyncRun {
  id: string;
  handle: string | null;
  platform: string;
  games: number;
  newTrophies: number;
  createdAt: Date;
}

/** Últimas sincronizaciones de TODOS los usuarios, no de uno — para ver si el cron va bien. */
export async function getRecentSyncRuns(limit = 30): Promise<AdminSyncRun[]> {
  return db
    .select({
      id: syncRuns.id,
      handle: users.handle,
      platform: syncRuns.platform,
      games: syncRuns.games,
      newTrophies: syncRuns.newTrophies,
      createdAt: syncRuns.createdAt,
    })
    .from(syncRuns)
    .innerJoin(users, eq(users.id, syncRuns.userId))
    .orderBy(desc(syncRuns.createdAt))
    .limit(limit);
}

export interface AdminUserRow {
  userId: string;
  handle: string | null;
  displayName: string | null;
  createdAt: Date;
  cuentas: string[];
  juegos: number;
  platinos: number;
  insignias: number;
}

/** Un usuario por fila: para ver de un vistazo quién usa la plataforma y cuánto. */
export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const filas = await db
    .select({
      userId: users.id,
      handle: users.handle,
      displayName: users.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  const [cuentas, juegosPorUsuario, insigniasPorUsuario] = await Promise.all([
    db
      .select({ userId: platformAccounts.userId, platform: platformAccounts.platform })
      .from(platformAccounts),
    db
      .select({
        userId: userGames.userId,
        juegos: sql<number>`count(*) filter (where ${userGames.isWishlist} = false)`,
        platinos: sql<number>`
          coalesce(sum(CAST(${userGames.earned}->>'platinum' AS INTEGER)), 0)
          + count(*) filter (where ${games.platform} = 'steam' and ${userGames.progressPercent} = 100)
        `,
      })
      .from(userGames)
      .innerJoin(games, eq(games.id, userGames.gameId))
      .groupBy(userGames.userId),
    db
      .select({ userId: userBadges.userId, n: sql<number>`count(*)` })
      .from(userBadges)
      .groupBy(userBadges.userId),
  ]);

  const cuentasPorUsuario = new Map<string, string[]>();
  for (const c of cuentas) {
    cuentasPorUsuario.set(c.userId, [...(cuentasPorUsuario.get(c.userId) ?? []), c.platform]);
  }
  const juegosMap = new Map(juegosPorUsuario.map((j) => [j.userId, j]));
  const insigniasMap = new Map(insigniasPorUsuario.map((i) => [i.userId, Number(i.n)]));

  return filas.map((f) => ({
    userId: f.userId,
    handle: f.handle,
    displayName: f.displayName,
    createdAt: f.createdAt,
    cuentas: cuentasPorUsuario.get(f.userId) ?? [],
    juegos: Number(juegosMap.get(f.userId)?.juegos ?? 0),
    platinos: Number(juegosMap.get(f.userId)?.platinos ?? 0),
    insignias: insigniasMap.get(f.userId) ?? 0,
  }));
}
