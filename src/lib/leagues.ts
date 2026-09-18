import { getDb } from "@/db";
import { users, userTrophies, gameTrophies, userGames, games, leagues, leagueMembers, leagueStandingSnapshots } from "@/db/schema";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { avatarUrlSql } from "@/lib/avatarSql";
import { areFriends } from "@/lib/profiles";
import { enviarPush } from "@/lib/webPush";
import { enviarPushFcm } from "@/lib/fcm";
import { anunciarInvitacionLiga } from "@/lib/discordBot";

/**
 * Ligas creadas por un usuario, solo entre amigos — distintas de la "Liga
 * Mensual" global (lib/ligas.ts, todo el mundo, sin tabla propia). Mismo
 * cálculo de puntos que esa (platino 100/oro 50/plata 25/resto 10), pero
 * acotado a los miembros de CADA liga en vez de a todos los usuarios, y a
 * la ventana de tiempo de la propia liga (desde que se creó, ver
 * `scoringWindow`) en vez de al mes en curso.
 */

export class NotFriendsError extends Error {}

export type LeagueDurationUnit = "dias" | "semanas" | "meses" | "anios";

export interface LeagueSummary {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  endsAt: string | null;
}

export interface LeagueInvite {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string | null;
}

export interface LeagueStandingRow {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  points: number;
  /** Puestos ganados (positivo) o perdidos (negativo) desde la última foto
   * semanal (`/api/cron/league-snapshot`) — `null` si todavía no hay
   * ninguna foto para este miembro (recién unido, o el cron no ha corrido
   * ni una vez desde que se creó la liga). */
  movimiento: number | null;
}

export interface PendingMemberRow {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
}

export interface LeagueDetail {
  id: string;
  name: string;
  ownerId: string;
  durationValue: number | null;
  durationUnit: LeagueDurationUnit | null;
  endsAt: string | null;
  standings: LeagueStandingRow[];
  /** Solo se rellena si `requestingUserId` es el dueño — para gestionar quién falta por aceptar. */
  pendingMembers: PendingMemberRow[];
  challenge: LeagueChallenge | null;
}

/**
 * El "reto" de la liga — un juego concreto para picarse a ver quién llega
 * antes al platino, aparte de la clasificación por puntos.
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

/**
 * Puntos de cada miembro AUN sin nombre/avatar, para el cron de snapshot
 * semanal (`/api/cron/league-snapshot`) — ese solo necesita el ranking en
 * sí, pedir el perfil de cada uno sería trabajo de sobra. Reutiliza la
 * misma ventana de puntuación (`createdAt`..`endsAt`) que `getLeagueDetail`
 * — dos cálculos de puntos por liga que no coincidieran sería peor que no
 * tener el dato.
 */
export async function getLeagueRankings(leagueId: string): Promise<{ userId: string; points: number }[]> {
  const db = getDb();
  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
  if (!league) return [];

  const memberRows = await db
    .select({ userId: leagueMembers.userId, status: leagueMembers.status })
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, leagueId));
  const memberIds = memberRows.filter((m) => m.status === "accepted").map((m) => m.userId);
  if (memberIds.length === 0) return [];

  const scoreConditions = [
    eq(userTrophies.earned, true),
    gte(userTrophies.earnedAt, league.createdAt),
    inArray(userTrophies.userId, memberIds),
  ];
  if (league.endsAt) scoreConditions.push(lte(userTrophies.earnedAt, league.endsAt));

  const scored = await db
    .select({ userId: userTrophies.userId, points: pointsSql })
    .from(userTrophies)
    .innerJoin(
      gameTrophies,
      and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)),
    )
    .where(and(...scoreConditions))
    .groupBy(userTrophies.userId);

  const puntosPorId = new Map(scored.map((r) => [r.userId, Number(r.points ?? 0)]));
  return memberIds
    .map((userId) => ({ userId, points: puntosPorId.get(userId) ?? 0 }))
    .sort((a, b) => b.points - a.points);
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

/** `from` + N días/semanas/meses/años — para `endsAt` al crear la liga. */
function computeEndsAt(from: Date, value: number, unit: LeagueDurationUnit): Date {
  const d = new Date(from);
  switch (unit) {
    case "dias":
      d.setDate(d.getDate() + value);
      break;
    case "semanas":
      d.setDate(d.getDate() + value * 7);
      break;
    case "meses":
      d.setMonth(d.getMonth() + value);
      break;
    case "anios":
      d.setFullYear(d.getFullYear() + value);
      break;
  }
  return d;
}

/**
 * Crea una liga con el creador ya como único miembro (aceptado — es quien
 * la crea, no alguien invitado) — se invita al resto con `addLeagueMember`.
 * `duration` es opcional: sin ella, la liga no tiene fecha de fin.
 */
export async function createLeague(
  ownerId: string,
  name: string,
  duration?: { value: number; unit: LeagueDurationUnit },
): Promise<LeagueSummary | null> {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return null;

  const db = getDb();
  const id = crypto.randomUUID();
  const createdAt = new Date();
  const endsAt = duration && duration.value > 0 ? computeEndsAt(createdAt, duration.value, duration.unit) : null;

  await db.insert(leagues).values({
    id,
    name: trimmed,
    ownerId,
    createdAt,
    endsAt,
    durationValue: duration?.value ?? null,
    durationUnit: duration?.unit ?? null,
  });
  await db.insert(leagueMembers).values({ leagueId: id, userId: ownerId, status: "accepted" });

  return { id, name: trimmed, ownerId, memberCount: 1, endsAt: endsAt?.toISOString() ?? null };
}

/** Ligas de las que `userId` ya es miembro ACEPTADO (propias o a las que le han añadido) — para invitaciones sin responder, ver `listPendingLeagueInvites`. */
export async function listUserLeagues(userId: string): Promise<LeagueSummary[]> {
  const db = getDb();
  const memberships = await db
    .select({ leagueId: leagueMembers.leagueId })
    .from(leagueMembers)
    .where(and(eq(leagueMembers.userId, userId), eq(leagueMembers.status, "accepted")));
  const leagueIds = memberships.map((m) => m.leagueId);
  if (leagueIds.length === 0) return [];

  const rows = await db
    .select({
      id: leagues.id,
      name: leagues.name,
      ownerId: leagues.ownerId,
      endsAt: leagues.endsAt,
      // Solo cuentan los miembros que ya han aceptado — un invitado sin
      // responder no debería sumar en "cuántos hay" de cara al resto.
      memberCount: sql<number>`count(*) filter (where ${leagueMembers.status} = 'accepted')`,
    })
    .from(leagues)
    .innerJoin(leagueMembers, eq(leagueMembers.leagueId, leagues.id))
    .where(inArray(leagues.id, leagueIds))
    .groupBy(leagues.id, leagues.name, leagues.ownerId, leagues.endsAt, leagues.createdAt)
    .orderBy(leagues.createdAt);

  return rows.map((r) => ({ ...r, memberCount: Number(r.memberCount), endsAt: r.endsAt?.toISOString() ?? null }));
}

/** Invitaciones a ligas todavía sin aceptar ni rechazar. */
export async function listPendingLeagueInvites(userId: string): Promise<LeagueInvite[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: leagues.id,
      name: leagues.name,
      ownerId: leagues.ownerId,
      ownerName: users.name,
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagues.id, leagueMembers.leagueId))
    .innerJoin(users, eq(users.id, leagues.ownerId))
    .where(and(eq(leagueMembers.userId, userId), eq(leagueMembers.status, "pending")))
    .orderBy(leagueMembers.joinedAt);

  return rows;
}

/**
 * La invitación pendiente de `userId` a ESA liga en concreto, si la hay —
 * para que abrir el enlace de una invitación (notificación push, DM de
 * Discord) enseñe algo con qué aceptar/rechazar en vez de un 404 (antes
 * `getLeagueDetail` devolvía `null` sin más para quien no fuera miembro
 * ACEPTADO, sin distinguir "no tienes nada que ver aquí" de "tienes una
 * invitación sin responder").
 */
export async function getPendingLeagueInvite(leagueId: string, userId: string): Promise<LeagueInvite | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: leagues.id, name: leagues.name, ownerId: leagues.ownerId, ownerName: users.name })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagues.id, leagueMembers.leagueId))
    .innerJoin(users, eq(users.id, leagues.ownerId))
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId), eq(leagueMembers.status, "pending")))
    .limit(1);
  return row ?? null;
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
  // mismo criterio que "miembro sin trofeos" en getLeagueDetail.
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
 * Clasificación de una liga (desde que se creó hasta que acaba, o para
 * siempre si no tiene duración — ver `computeEndsAt`) + datos de la liga.
 * `null` si no existe o si `requestingUserId` no es miembro ACEPTADO
 * (autorización: ver la clasificación de una liga que no has aceptado
 * todavía no tiene sentido — para eso está `listPendingLeagueInvites` +
 * `acceptLeagueInvite`).
 */
export async function getLeagueDetail(leagueId: string, requestingUserId: string): Promise<LeagueDetail | null> {
  const db = getDb();
  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
  if (!league) return null;

  const memberRows = await db
    .select({ userId: leagueMembers.userId, status: leagueMembers.status })
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, leagueId));
  const memberIds = memberRows.filter((m) => m.status === "accepted").map((m) => m.userId);
  if (!memberIds.includes(requestingUserId)) return null;

  const scoreConditions = [
    eq(userTrophies.earned, true),
    gte(userTrophies.earnedAt, league.createdAt),
    inArray(userTrophies.userId, memberIds),
  ];
  if (league.endsAt) scoreConditions.push(lte(userTrophies.earnedAt, league.endsAt));

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
    .where(and(...scoreConditions))
    .groupBy(users.id);

  // El INNER JOIN con userTrophies deja fuera a cualquier miembro sin ni un
  // trofeo en la ventana de la liga — se añaden a mano con 0 puntos, para
  // que la liga enseñe a TODOS sus miembros, no solo a quien ya ha cazado algo.
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

  const sinMovimiento: Omit<LeagueStandingRow, "movimiento">[] = [
    ...scored.map((r) => ({ ...r, points: Number(r.points ?? 0) })),
    ...missingProfiles.map((p) => ({ ...p, points: 0 })),
  ].sort((a, b) => b.points - a.points);

  // Movimiento respecto a la última foto semanal — `rankAnteriorPorId`
  // vacío (liga recién creada, cron sin correr todavía) deja `movimiento`
  // en null para todos en vez de fingir un "sin cambios" que no es cierto.
  const fotoAnterior = await db
    .select({ userId: leagueStandingSnapshots.userId, rank: leagueStandingSnapshots.rank })
    .from(leagueStandingSnapshots)
    .where(eq(leagueStandingSnapshots.leagueId, leagueId));
  const rankAnteriorPorId = new Map(fotoAnterior.map((f) => [f.userId, f.rank]));

  const standings: LeagueStandingRow[] = sinMovimiento.map((row, i) => {
    const anterior = rankAnteriorPorId.get(row.userId);
    return { ...row, movimiento: anterior != null ? anterior - (i + 1) : null };
  });

  const challenge = league.challengeGameId ? await getChallengeStandings(league.challengeGameId, memberIds) : null;

  let pendingMembers: PendingMemberRow[] = [];
  if (league.ownerId === requestingUserId) {
    const pendingIds = memberRows.filter((m) => m.status === "pending").map((m) => m.userId);
    if (pendingIds.length > 0) {
      pendingMembers = await db
        .select({
          userId: users.id,
          handle: users.handle,
          name: users.name,
          image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
        })
        .from(users)
        .where(inArray(users.id, pendingIds));
    }
  }

  return {
    id: league.id,
    name: league.name,
    ownerId: league.ownerId,
    durationValue: league.durationValue,
    durationUnit: league.durationUnit,
    endsAt: league.endsAt?.toISOString() ?? null,
    standings,
    pendingMembers,
    challenge,
  };
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
 * Invita a un amigo a la liga — solo el dueño puede invitar, y solo a
 * alguien que ya sea su amigo de verdad (relación `accepted`), no a
 * cualquiera. Entra como "pending": no aparece en la clasificación hasta
 * que acepte (`acceptLeagueInvite`). Avisa por los mismos canales que una
 * solicitud de amistad (Web Push + FCM) y, si tiene Discord vinculado con
 * los DMs activados, también por ahí.
 */
export async function addLeagueMember(leagueId: string, ownerId: string, friendUserId: string): Promise<boolean> {
  const db = getDb();
  const [league] = await db.select({ ownerId: leagues.ownerId, name: leagues.name }).from(leagues).where(eq(leagues.id, leagueId)).limit(1);
  if (!league || league.ownerId !== ownerId) return false;
  if (!(await areFriends(ownerId, friendUserId))) throw new NotFriendsError();

  const inserted = await db
    .insert(leagueMembers)
    .values({ leagueId, userId: friendUserId, status: "pending" })
    .onConflictDoNothing()
    .returning({ userId: leagueMembers.userId });
  if (inserted.length === 0) return true; // ya era miembro (o ya estaba invitado) — no hay nada nuevo que avisar

  const [owner] = await db.select({ name: users.name, handle: users.handle }).from(users).where(eq(users.id, ownerId)).limit(1);
  const nombreDueño = owner?.name ?? owner?.handle ?? "Alguien";
  const aviso = {
    title: "Invitación a una liga",
    body: `${nombreDueño} te ha invitado a la liga "${league.name}" en Paragon.`,
    url: `/ligas/${leagueId}`,
  };
  // La invitación YA está guardada en la base (el insert de arriba) antes
  // de llegar aquí — un fallo avisando por cualquiera de los tres canales
  // nunca debe deshacer eso ni tirar la petición entera abajo, así que se
  // registra el motivo en los logs (para poder diagnosticarlo de verdad
  // luego) en vez de dejar que se propague.
  await Promise.all([
    enviarPush(friendUserId, aviso),
    enviarPushFcm(friendUserId, aviso),
    anunciarInvitacionLiga(friendUserId, league.name, nombreDueño, leagueId),
  ]).catch((error) => {
    console.error("[leagues] fallo avisando de la invitación", error);
  });

  return true;
}

/** El invitado acepta — a partir de aquí sí cuenta en la clasificación. Solo el propio invitado. */
export async function acceptLeagueInvite(leagueId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const result = await db
    .update(leagueMembers)
    .set({ status: "accepted" })
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId), eq(leagueMembers.status, "pending")))
    .returning({ userId: leagueMembers.userId });
  return result.length > 0;
}

/** El invitado rechaza — se borra la fila, como si nunca le hubieran invitado. Solo el propio invitado. */
export async function declineLeagueInvite(leagueId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const result = await db
    .delete(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId), eq(leagueMembers.status, "pending")))
    .returning({ userId: leagueMembers.userId });
  return result.length > 0;
}

/** El dueño puede quitar a cualquiera, aceptado o pendiente (menos a sí mismo — para eso está `deleteLeague`); cualquier otro miembro solo puede quitarse a sí mismo (salir). */
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
