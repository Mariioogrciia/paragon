import { getDb } from "@/db";
import { users, userTrophies, gameTrophies, userGames, games, leagues, leagueMembers } from "@/db/schema";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { avatarUrlSql } from "@/lib/avatarSql";
import { areFriends } from "@/lib/profiles";

/**
 * Ligas creadas por un usuario, solo entre amigos — distintas de la "Liga
 * Mensual" global (lib/ligas.ts, todo el mundo, sin tabla propia). Mismo
 * cálculo de puntos que esa (platino 100/oro 50/plata 25/resto 10), pero
 * acotado a los miembros de CADA liga en vez de a todos los usuarios.
 */

export class NotFriendsError extends Error {}

export interface LeagueSummary {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
}

export interface LeagueStandingRow {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  points: number;
}

export interface LeagueDetail {
  id: string;
  name: string;
  ownerId: string;
  standings: LeagueStandingRow[];
  challenge: LeagueChallenge | null;
}

/**
 * El "reto" de la liga — un juego concreto para picarse a ver quién llega
 * antes al platino, aparte de la clasificación por puntos del mes.
 */
export interface ChallengeStandingRow {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  progressPercent: number;
  hasPlatinum: boolean;
  /** ISO — fecha del platino, o del 100% en Steam (sin grado "platinum" propio, ver `esPlatinoEquivalente`). `null` mientras no lo tenga. */
  platinumAt: string | null;
}

export interface LeagueChallenge {
  gameId: string;
  title: string;
  iconUrl: string | null;
  standings: ChallengeStandingRow[];
}

const pointsSql = sql<number>`
  SUM(
    CASE
      WHEN ${gameTrophies.grade} = 'platinum' THEN 100
      WHEN ${gameTrophies.grade} = 'gold' THEN 50
      WHEN ${gameTrophies.grade} = 'silver' THEN 25
      ELSE 10
    END
  )
`;

function monthBounds() {
  const now = new Date();
  return {
    startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
    startOfNextMonth: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

/** Crea una liga con el creador ya como único miembro — se invita al resto con `addLeagueMember`. */
export async function createLeague(ownerId: string, name: string): Promise<LeagueSummary | null> {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return null;

  const db = getDb();
  const id = crypto.randomUUID();
  await db.insert(leagues).values({ id, name: trimmed, ownerId });
  await db.insert(leagueMembers).values({ leagueId: id, userId: ownerId });

  return { id, name: trimmed, ownerId, memberCount: 1 };
}

/** Ligas de las que `userId` es miembro (propias o a las que le han añadido). */
export async function listUserLeagues(userId: string): Promise<LeagueSummary[]> {
  const db = getDb();
  const memberships = await db
    .select({ leagueId: leagueMembers.leagueId })
    .from(leagueMembers)
    .where(eq(leagueMembers.userId, userId));
  const leagueIds = memberships.map((m) => m.leagueId);
  if (leagueIds.length === 0) return [];

  const rows = await db
    .select({
      id: leagues.id,
      name: leagues.name,
      ownerId: leagues.ownerId,
      memberCount: sql<number>`count(*)`,
    })
    .from(leagues)
    .innerJoin(leagueMembers, eq(leagueMembers.leagueId, leagues.id))
    .where(inArray(leagues.id, leagueIds))
    .groupBy(leagues.id, leagues.name, leagues.ownerId, leagues.createdAt)
    .orderBy(leagues.createdAt);

  return rows.map((r) => ({ ...r, memberCount: Number(r.memberCount) }));
}

/**
 * Clasificación del reto de una liga (progreso + fecha del platino) para un
 * juego concreto, acotada a `memberIds` — reutiliza `userGames` (ya tiene
 * `progressPercent`/`earned` por usuario, ver `clasificacionAmigos` en
 * lib/rankings.ts, mismo patrón) en vez de recalcular con `getLibrary()`.
 */
async function getChallengeStandings(gameId: string, memberIds: string[]): Promise<LeagueChallenge | null> {
  const db = getDb();
  const [game] = await db
    .select({ id: games.id, title: games.title, iconUrl: games.iconUrl, platform: games.platform })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);
  if (!game) return null;

  const progressRows = await db
    .select({
      userId: users.id,
      handle: users.handle,
      name: users.name,
      image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
      progressPercent: userGames.progressPercent,
      // Solo PSN guarda el desglose por metal (`userGames.earned`) — en
      // Steam/Xbox esto sale siempre 0, de ahí el `|| progressPercent===100`
      // de abajo para no dejarlos sin "ya lo tiene" nunca.
      earnedPlatinum: sql<number>`coalesce((${userGames.earned}->>'platinum')::int, 0)`,
    })
    .from(userGames)
    .innerJoin(users, eq(users.id, userGames.userId))
    .where(and(eq(userGames.gameId, gameId), inArray(userGames.userId, memberIds)));

  // Miembros que ni siquiera tienen este juego en su biblioteca: 0% aparte,
  // mismo criterio que "miembro sin trofeos este mes" en getLeagueDetail.
  const withRow = new Set(progressRows.map((r) => r.userId));
  const missingIds = memberIds.filter((id) => !withRow.has(id));
  const missingProfiles = missingIds.length === 0 ? [] : await db
    .select({
      userId: users.id,
      handle: users.handle,
      name: users.name,
      image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
    })
    .from(users)
    .where(inArray(users.id, missingIds));

  const completedIds = progressRows
    .filter((r) => Number(r.earnedPlatinum) > 0 || (game.platform === "steam" && r.progressPercent === 100))
    .map((r) => r.userId);

  // Solo se pide la fecha a quien ya lo tiene completado — el resto no la
  // necesita, y evita una consulta más ancha de lo que hace falta.
  const platinumConditions = [
    eq(userTrophies.gameId, gameId),
    eq(userTrophies.earned, true),
    inArray(userTrophies.userId, completedIds),
  ];
  // Steam no tiene grado "platinum" (ver esPlatinoEquivalente, lib/stats.ts)
  // — ahí MAX(earnedAt) sobre TODOS los logros conseguidos de ese juego es
  // el momento real en que llegó al 100%, no una aproximación peor.
  if (game.platform !== "steam") platinumConditions.push(eq(gameTrophies.grade, "platinum"));

  const dateRows = completedIds.length === 0 ? [] : await db
    .select({ userId: userTrophies.userId, at: sql<Date>`max(${userTrophies.earnedAt})` })
    .from(userTrophies)
    .innerJoin(gameTrophies, and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)))
    .where(and(...platinumConditions))
    .groupBy(userTrophies.userId);
  const platinumDates = new Map(dateRows.map((r) => [r.userId, r.at]));

  const standings: ChallengeStandingRow[] = [
    ...progressRows.map((r) => {
      const hasPlatinum = Number(r.earnedPlatinum) > 0 || (game.platform === "steam" && r.progressPercent === 100);
      return {
        userId: r.userId,
        handle: r.handle,
        name: r.name,
        image: r.image,
        progressPercent: r.progressPercent,
        hasPlatinum,
        platinumAt: platinumDates.get(r.userId)?.toISOString() ?? null,
      };
    }),
    ...missingProfiles.map((p) => ({ ...p, progressPercent: 0, hasPlatinum: false, platinumAt: null })),
  ].sort((a, b) => {
    // Primero quien ya lo tiene, ordenados por quién llegó antes; luego por
    // progreso, para que se note quién le pisa los talones al líder.
    if (a.hasPlatinum && b.hasPlatinum) return new Date(a.platinumAt!).getTime() - new Date(b.platinumAt!).getTime();
    if (a.hasPlatinum) return -1;
    if (b.hasPlatinum) return 1;
    return b.progressPercent - a.progressPercent;
  });

  return { gameId: game.id, title: game.title, iconUrl: game.iconUrl, standings };
}

/**
 * Clasificación de una liga (mes en curso) + datos de la liga — `null` si no
 * existe o si `requestingUserId` no es miembro (autorización: ver la
 * clasificación de una liga en la que no estás no tiene sentido).
 */
export async function getLeagueDetail(leagueId: string, requestingUserId: string): Promise<LeagueDetail | null> {
  const db = getDb();
  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
  if (!league) return null;

  const memberRows = await db
    .select({ userId: leagueMembers.userId })
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, leagueId));
  const memberIds = memberRows.map((m) => m.userId);
  if (!memberIds.includes(requestingUserId)) return null;

  const { startOfMonth, startOfNextMonth } = monthBounds();

  const scored = await db
    .select({
      userId: users.id,
      handle: users.handle,
      name: users.name,
      image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
      points: pointsSql,
    })
    .from(userTrophies)
    .innerJoin(users, eq(users.id, userTrophies.userId))
    .innerJoin(
      gameTrophies,
      and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)),
    )
    .where(
      and(
        eq(userTrophies.earned, true),
        gte(userTrophies.earnedAt, startOfMonth),
        lte(userTrophies.earnedAt, startOfNextMonth),
        inArray(userTrophies.userId, memberIds),
      ),
    )
    .groupBy(users.id);

  // El INNER JOIN con userTrophies deja fuera a cualquier miembro sin ni un
  // trofeo este mes — se añaden a mano con 0 puntos, para que la liga
  // enseñe a TODOS sus miembros, no solo a quien ya ha cazado algo.
  const scoredIds = new Set(scored.map((r) => r.userId));
  const missingIds = memberIds.filter((id) => !scoredIds.has(id));
  const missingProfiles = missingIds.length === 0 ? [] : await db
    .select({
      userId: users.id,
      handle: users.handle,
      name: users.name,
      image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
    })
    .from(users)
    .where(inArray(users.id, missingIds));

  const standings: LeagueStandingRow[] = [
    ...scored.map((r) => ({ ...r, points: Number(r.points ?? 0) })),
    ...missingProfiles.map((p) => ({ ...p, points: 0 })),
  ].sort((a, b) => b.points - a.points);

  const challenge = league.challengeGameId ? await getChallengeStandings(league.challengeGameId, memberIds) : null;

  return { id: league.id, name: league.name, ownerId: league.ownerId, standings, challenge };
}

/** Fija (o quita, con `gameId: null`) el juego de reto de la liga — solo el dueño. */
export async function setLeagueChallenge(leagueId: string, ownerId: string, gameId: string | null): Promise<boolean> {
  const db = getDb();
  const [league] = await db.select({ ownerId: leagues.ownerId }).from(leagues).where(eq(leagues.id, leagueId)).limit(1);
  if (!league || league.ownerId !== ownerId) return false;

  await db.update(leagues).set({ challengeGameId: gameId }).where(eq(leagues.id, leagueId));
  return true;
}

/**
 * Añade un amigo a la liga — solo el dueño puede invitar, y solo a alguien
 * que ya sea su amigo de verdad (relación `accepted`), no a cualquiera.
 */
export async function addLeagueMember(leagueId: string, ownerId: string, friendUserId: string): Promise<boolean> {
  const db = getDb();
  const [league] = await db.select({ ownerId: leagues.ownerId }).from(leagues).where(eq(leagues.id, leagueId)).limit(1);
  if (!league || league.ownerId !== ownerId) return false;
  if (!(await areFriends(ownerId, friendUserId))) throw new NotFriendsError();

  await db.insert(leagueMembers).values({ leagueId, userId: friendUserId }).onConflictDoNothing();
  return true;
}

/** El dueño puede quitar a cualquiera (menos a sí mismo — para eso está `deleteLeague`); cualquier otro miembro solo puede quitarse a sí mismo (salir). */
export async function removeLeagueMember(leagueId: string, requestingUserId: string, targetUserId: string): Promise<boolean> {
  const db = getDb();
  const [league] = await db.select({ ownerId: leagues.ownerId }).from(leagues).where(eq(leagues.id, leagueId)).limit(1);
  if (!league) return false;

  const isOwner = league.ownerId === requestingUserId;
  const isSelf = requestingUserId === targetUserId;
  if (!isOwner && !isSelf) return false;
  if (isOwner && targetUserId === league.ownerId) return false;

  await db.delete(leagueMembers).where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, targetUserId)));
  return true;
}

/** Borra la liga entera (cascada sobre league_member) — solo el dueño. */
export async function deleteLeague(leagueId: string, ownerId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.delete(leagues).where(and(eq(leagues.id, leagueId), eq(leagues.ownerId, ownerId))).returning({ id: leagues.id });
  return result.length > 0;
}
