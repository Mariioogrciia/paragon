import "server-only";
import { desc, eq, sql, and } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  games,
  gameTrophies,
  platformAccounts,
  syncRuns,
  userBadges,
  userGames,
  userTrophies,
  users,
} from "@/db/schema";
import { getLeagueRankings } from "@/lib/leagues";
import { avatarUrlSql } from "@/lib/avatarSql";

/**
 * "Avisos generados": congelado a mano en 8 (0 en los últimos 7 días) —
 * eran los del sistema de campana que se quitó del todo (ver HANDOFF.md,
 * sesión del 9 de septiembre de 2026). La tabla `notification` se borró
 * en el repaso de limpieza del 10 de septiembre: ya no hay de dónde
 * volver a contar esto, así que se congela en el número real que tenía
 * en ese momento en vez de fingir que sigue habiendo datos que contar.
 */
const AVISOS_CONGELADOS = { total: 8, ultimos7: 0 };

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

  const [usuariosNuevosRow] = await db
    .select({ n: sql<number>`count(*) filter (where ${users.createdAt} >= now() - interval '7 days')` })
    .from(users);

  return {
    usuarios: Number(usuariosRow?.n ?? 0),
    cuentasPorPlataforma: cuentasPorPlataforma.map((r) => ({ platform: r.platform, total: Number(r.total) })),
    juegosEnCatalogo: Number(catalogoRow?.total ?? 0),
    juegosConPegi: Number(catalogoRow?.conPegi ?? 0),
    trofeosRegistrados: Number(trofeosRow?.n ?? 0),
    avisosGenerados: AVISOS_CONGELADOS.total,
    avisosUltimos7Dias: AVISOS_CONGELADOS.ultimos7,
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

export interface AdminActivityRow {
  id: string;
  type: string;
  rating: number | null;
  review: string | null;
  createdAt: Date;
  userHandle: string | null;
  userName: string | null;
  gameTitle: string | null;
}

export async function getAdminActivities(limit = 50): Promise<AdminActivityRow[]> {
  const rows = await db
    .select({
      id: activities.id,
      type: activities.type,
      rating: activities.rating,
      review: activities.review,
      createdAt: activities.createdAt,
      userHandle: users.handle,
      userName: users.name,
      gameTitle: games.title,
    })
    .from(activities)
    .innerJoin(users, eq(users.id, activities.userId))
    .leftJoin(games, eq(games.id, activities.gameId))
    // We only fetch reviews (or anything with text) for moderation by default
    // We can also fetch just everything but filter in memory
    .where(sql`${activities.review} IS NOT NULL AND ${activities.review} != ''`)
    .orderBy(desc(activities.createdAt))
    .limit(limit);

  return rows;
}

export interface AdminLeagueRow {
  id: string;
  name: string;
  ownerName: string | null;
  ownerHandle: string | null;
  createdAt: Date;
  endsAt: Date | null;
  awarded: boolean;
  challengeGameTitle: string | null;
  members: number;
}

export async function getAdminLeagues(): Promise<AdminLeagueRow[]> {
  const { leagues, leagueMembers, users, games: gamesTable } = await import("@/db/schema");

  const rows = await db
    .select({
      id: leagues.id,
      name: leagues.name,
      ownerName: users.name,
      ownerHandle: users.handle,
      createdAt: leagues.createdAt,
      endsAt: leagues.endsAt,
      awarded: leagues.awarded,
      challengeGameTitle: gamesTable.title,
      members: sql<number>`count(distinct ${leagueMembers.userId})`,
    })
    .from(leagues)
    .innerJoin(users, eq(users.id, leagues.ownerId))
    .leftJoin(leagueMembers, eq(leagueMembers.leagueId, leagues.id))
    .leftJoin(gamesTable, eq(gamesTable.id, leagues.challengeGameId))
    .groupBy(leagues.id, users.name, users.handle, leagues.createdAt, leagues.endsAt, leagues.awarded, gamesTable.title)
    .orderBy(desc(leagues.createdAt));

  return rows.map(r => ({
    ...r,
    members: Number(r.members)
  }));
}

export interface AdminLeagueMemberRow {
  userId: string;
  handle: string | null;
  name: string | null;
  status: string;
  joinedAt: Date;
  points: number;
}

export interface AdminLeagueDetail {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string | null;
  ownerHandle: string | null;
  createdAt: Date;
  endsAt: Date | null;
  durationValue: number | null;
  durationUnit: string | null;
  awarded: boolean;
  challengeGameTitle: string | null;
  members: AdminLeagueMemberRow[];
}

/**
 * Vista de una liga concreta para admin — a diferencia de
 * `getLeagueDetail` (lib/leagues.ts), que exige que quien pregunta ya sea
 * miembro aceptado (privacidad normal entre amigos), aquí no hay ese
 * filtro: admin ya está gateado por `esDesarrollador` más arriba, y ver
 * cualquier liga (incluida gente "pending" que nunca aceptó) es
 * precisamente el punto de la vista de moderación. Reutiliza
 * `getLeagueRankings` (mismos puntos que ve cualquier miembro) en vez de
 * recalcular la fórmula de puntuación a mano otra vez.
 */
export async function getAdminLeagueDetail(leagueId: string): Promise<AdminLeagueDetail | null> {
  const { leagues, leagueMembers, users, games: gamesTable } = await import("@/db/schema");

  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
  if (!league) return null;

  const [ownerRows, memberRows, challengeRows, rankings] = await Promise.all([
    db.select({ name: users.name, handle: users.handle }).from(users).where(eq(users.id, league.ownerId)).limit(1),
    db
      .select({ userId: leagueMembers.userId, status: leagueMembers.status, joinedAt: leagueMembers.joinedAt, handle: users.handle, name: users.name })
      .from(leagueMembers)
      .innerJoin(users, eq(users.id, leagueMembers.userId))
      .where(eq(leagueMembers.leagueId, leagueId)),
    league.challengeGameId
      ? db.select({ title: gamesTable.title }).from(gamesTable).where(eq(gamesTable.id, league.challengeGameId)).limit(1)
      : Promise.resolve([]),
    getLeagueRankings(leagueId),
  ]);

  const puntosPorId = new Map(rankings.map((r) => [r.userId, r.points]));

  return {
    id: league.id,
    name: league.name,
    ownerId: league.ownerId,
    ownerName: ownerRows[0]?.name ?? null,
    ownerHandle: ownerRows[0]?.handle ?? null,
    createdAt: league.createdAt,
    endsAt: league.endsAt,
    durationValue: league.durationValue,
    durationUnit: league.durationUnit,
    awarded: league.awarded,
    challengeGameTitle: challengeRows[0]?.title ?? null,
    members: memberRows
      .map((m) => ({ ...m, points: puntosPorId.get(m.userId) ?? 0 }))
      .sort((a, b) => b.points - a.points),
  };
}

export interface AdminClanRow {
  id: string;
  name: string;
  tag: string;
  ownerName: string | null;
  ownerHandle: string | null;
  createdAt: Date;
  members: number;
}

export async function getAdminClans(): Promise<AdminClanRow[]> {
  const { clans, clanMembers, users: usersTable } = await import("@/db/schema");

  const rows = await db
    .select({
      id: clans.id,
      name: clans.name,
      tag: clans.tag,
      ownerName: usersTable.name,
      ownerHandle: usersTable.handle,
      createdAt: clans.createdAt,
      members: sql<number>`count(distinct ${clanMembers.userId})`,
    })
    .from(clans)
    .innerJoin(usersTable, eq(usersTable.id, clans.ownerId))
    .leftJoin(clanMembers, eq(clanMembers.clanId, clans.id))
    .groupBy(clans.id, usersTable.name, usersTable.handle, clans.createdAt)
    .orderBy(desc(clans.createdAt));

  return rows.map((r) => ({ ...r, members: Number(r.members) }));
}

export interface AdminRecentTrophyRow {
  id: string;
  userHandle: string | null;
  userName: string | null;
  gameTitle: string | null;
  gameIconUrl: string | null;
  trophyName: string;
  grade: string | null;
  rarityPercent: number | null;
  earnedAt: Date | null;
}

/**
 * Últimos trofeos conseguidos en TODA la plataforma, no de un usuario — es
 * lo más parecido a "qué está pasando ahora mismo" que tiene admin, y de
 * paso enseña los últimos de cada usuario activo sin tener que entrar
 * perfil por perfil. `id` compuesto (no hay PK propia en user_trophy) para
 * la key de React.
 */
export async function getAdminRecentTrophies(limit = 60): Promise<AdminRecentTrophyRow[]> {
  const rows = await db
    .select({
      userId: userTrophies.userId,
      gameId: userTrophies.gameId,
      trophyId: userTrophies.trophyId,
      userHandle: users.handle,
      userName: users.name,
      gameTitle: games.title,
      gameIconUrl: games.iconUrl,
      trophyName: gameTrophies.name,
      grade: gameTrophies.grade,
      rarityPercent: userTrophies.rarityPercent,
      earnedAt: userTrophies.earnedAt,
    })
    .from(userTrophies)
    .innerJoin(users, eq(users.id, userTrophies.userId))
    .innerJoin(games, eq(games.id, userTrophies.gameId))
    .innerJoin(gameTrophies, and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)))
    .where(eq(userTrophies.earned, true))
    .orderBy(desc(userTrophies.earnedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: `${r.userId}:${r.gameId}:${r.trophyId}`,
    userHandle: r.userHandle,
    userName: r.userName,
    gameTitle: r.gameTitle,
    gameIconUrl: r.gameIconUrl,
    trophyName: r.trophyName,
    grade: r.grade,
    rarityPercent: r.rarityPercent,
    earnedAt: r.earnedAt,
  }));
}

export interface AdminUserTrophyRow {
  gameTitle: string | null;
  gameIconUrl: string | null;
  trophyName: string;
  grade: string | null;
  rarityPercent: number | null;
  earnedAt: Date | null;
}

/** Últimos trofeos de UN usuario en concreto — para la ficha de detalle de admin. */
export async function getAdminUserRecentTrophies(userId: string, limit = 20): Promise<AdminUserTrophyRow[]> {
  return db
    .select({
      gameTitle: games.title,
      gameIconUrl: games.iconUrl,
      trophyName: gameTrophies.name,
      grade: gameTrophies.grade,
      rarityPercent: userTrophies.rarityPercent,
      earnedAt: userTrophies.earnedAt,
    })
    .from(userTrophies)
    .innerJoin(games, eq(games.id, userTrophies.gameId))
    .innerJoin(gameTrophies, and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)))
    .where(and(eq(userTrophies.userId, userId), eq(userTrophies.earned, true)))
    .orderBy(desc(userTrophies.earnedAt))
    .limit(limit);
}

export interface AdminUserDetail {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  createdAt: Date;
  cuentas: { platform: string; username: string; isPublic: boolean; lastAttemptedAt: Date | null; syncedAt: Date | null }[];
  juegos: number;
  platinos: number;
  insignias: number;
}

/** Ficha de un usuario para admin — perfil + cuentas vinculadas, sin sus trofeos (aparte, getAdminUserRecentTrophies). */
export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const [userRow] = await db
    .select({
      userId: users.id,
      handle: users.handle,
      name: users.name,
      image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRow) return null;

  const [cuentas, [juegosRow], [insigniasRow]] = await Promise.all([
    db
      .select({
        platform: platformAccounts.platform,
        username: platformAccounts.username,
        isPublic: platformAccounts.isPublic,
        lastAttemptedAt: platformAccounts.lastAttemptedAt,
        syncedAt: platformAccounts.syncedAt,
      })
      .from(platformAccounts)
      .where(eq(platformAccounts.userId, userId)),
    db
      .select({
        juegos: sql<number>`count(*) filter (where ${userGames.isWishlist} = false)`,
        platinos: sql<number>`
          coalesce(sum(CAST(${userGames.earned}->>'platinum' AS INTEGER)), 0)
          + count(*) filter (where ${games.platform} = 'steam' and ${userGames.progressPercent} = 100)
        `,
      })
      .from(userGames)
      .innerJoin(games, eq(games.id, userGames.gameId))
      .where(eq(userGames.userId, userId)),
    db.select({ n: sql<number>`count(*)` }).from(userBadges).where(eq(userBadges.userId, userId)),
  ]);

  return {
    userId: userRow.userId,
    handle: userRow.handle,
    name: userRow.name,
    image: userRow.image,
    createdAt: userRow.createdAt,
    cuentas,
    juegos: Number(juegosRow?.juegos ?? 0),
    platinos: Number(juegosRow?.platinos ?? 0),
    insignias: Number(insigniasRow?.n ?? 0),
  };
}
