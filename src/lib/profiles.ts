import "server-only";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  friendships,
  gameTrophies,
  games as gamesTable,
  platformAccounts,
  userGames,
  userTrophies,
  users,
} from "@/db/schema";
import * as psn from "@/lib/psn/client";
import * as steam from "@/lib/steam/client";
import { syncGameTrophies, syncLibrary } from "@/lib/sync";
import {
  type AccountPlatform,
  type Game,
  type GameDetail,
  type Library,
  type PlatformAccount,
  type Player,
  type Trophy,
} from "@/lib/types";

export interface ProfileRow {
  userId: string;
  handle: string | null;
  displayName: string | null;
  image: string | null;
  favorites: string[] | null;
  accounts: PlatformAccount[];
}

/** La cuenta de una plataforma concreta, si la tiene vinculada. */
export function accountFor(
  profile: ProfileRow | null,
  platform: AccountPlatform,
): PlatformAccount | null {
  return profile?.accounts.find((a) => a.platform === platform) ?? null;
}

function toPlayer(row: ProfileRow): Player {
  const psnAccount = accountFor(row, "psn");

  return {
    id: row.userId,
    name: row.displayName ?? row.handle ?? "Sin nombre",
    accounts: row.accounts,
    avatarUrl:
      psnAccount?.avatarUrl ??
      row.accounts.find((a) => a.avatarUrl)?.avatarUrl ??
      row.image ??
      undefined,
    trophyLevel: psnAccount?.level ?? undefined,
  };
}

async function selectProfile(where: ReturnType<typeof eq>): Promise<ProfileRow | null> {
  const [row] = await db
    .select({
      userId: users.id,
      handle: users.handle,
      displayName: users.name,
      image: users.image,
      favorites: users.favorites,
    })
    .from(users)
    .where(where)
    .limit(1);

  if (!row) return null;

  const accounts = await db
    .select({
      platform: platformAccounts.platform,
      accountId: platformAccounts.accountId,
      username: platformAccounts.username,
      level: platformAccounts.level,
      avatarUrl: platformAccounts.avatarUrl,
      isPublic: platformAccounts.isPublic,
      syncedAt: platformAccounts.syncedAt,
    })
    .from(platformAccounts)
    .where(eq(platformAccounts.userId, row.userId));

  return { ...row, accounts };
}

export function getProfileByUserId(userId: string) {
  return selectProfile(eq(users.id, userId));
}

export function getProfileByHandle(handle: string) {
  return selectProfile(eq(users.handle, handle));
}

export async function isHandleTaken(handle: string, exceptUserId?: string) {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.handle, handle))
    .limit(1);

  return Boolean(row) && row.id !== exceptUserId;
}

export async function setHandle(userId: string, handle: string) {
  await db.update(users).set({ handle }).where(eq(users.id, userId));
}

export async function setProfileInfo(userId: string, name: string, image: string | null) {
  await db.update(users).set({ name, image }).where(eq(users.id, userId));
}

export async function getGlobalStats() {
  const result = await db
    .select({
      totalGames: sql<number>`count(distinct ${userGames.gameId})`,
      totalTrophies: sql<number>`sum(${userGames.earnedTotal})`,
      avgCompletion: sql<number>`avg(nullif(${userGames.progressPercent}, 0))`,
      totalPlatinums: sql<number>`sum(CAST(${userGames.earned}->>'platinum' AS INTEGER))`,
    })
    .from(userGames);

  const row = result[0];
  return {
    platinos: Number(row?.totalPlatinums ?? 0),
    juegos: Number(row?.totalGames ?? 0),
    trofeos: Number(row?.totalTrophies ?? 0),
    completadoMedio: Math.round(Number(row?.avgCompletion ?? 0)),
  };
}

/* ------------------------------ Vincular cuentas ----------------------------- */

export interface LinkResult {
  username: string;
  /** Si la plataforma nos deja leer sus juegos. */
  legible: boolean;
  juegos: number;
}

/**
 * Vincula una cuenta de plataforma y trae su biblioteca por primera vez.
 *
 * Cada plataforma tiene su propia forma de decir "no puedo leer esto": PSN
 * solo deja consultar la cuenta del token del servidor y sus amigos; Steam
 * exige que el perfil y los detalles de juego estén en público. Lo
 * comprobamos al vincular, que es cuando se puede explicar, y no al pintar la
 * biblioteca.
 */
export async function linkAccount(
  userId: string,
  platform: AccountPlatform,
  input: string,
): Promise<LinkResult> {
  const resolved =
    platform === "psn"
      ? await resolvePsn(input)
      : platform === "steam"
        ? await resolveSteam(input)
        : await resolveGoogle(input);

  await db
    .insert(platformAccounts)
    .values({
      userId,
      platform,
      accountId: resolved.accountId,
      username: resolved.username,
      level: resolved.level,
      avatarUrl: resolved.avatarUrl,
      isPublic: resolved.legible,
      syncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [platformAccounts.userId, platformAccounts.platform],
      set: {
        accountId: resolved.accountId,
        username: resolved.username,
        level: resolved.level,
        avatarUrl: resolved.avatarUrl,
        isPublic: resolved.legible,
        syncedAt: new Date(),
      },
    });

  const juegos = resolved.legible
    ? await syncLibrary(userId, { platform, accountId: resolved.accountId })
    : 0;

  return { username: resolved.username, legible: resolved.legible, juegos };
}

interface Resolved {
  accountId: string;
  username: string;
  level: number | null;
  avatarUrl: string | null;
  legible: boolean;
}

async function resolvePsn(onlineId: string): Promise<Resolved> {
  const profile = await psn.resolveProfile(onlineId);

  return {
    accountId: profile.accountId,
    username: profile.onlineId,
    level: profile.trophyLevel,
    avatarUrl: profile.avatarUrl ?? null,
    legible: await psn.canReadTrophies(profile.accountId),
  };
}

async function resolveSteam(input: string): Promise<Resolved> {
  const profile = await steam.resolveProfile(input);

  return {
    accountId: profile.steamId,
    username: profile.personaName,
    level: null,
    avatarUrl: profile.avatarUrl ?? null,
    // Ser público de perfil no basta: "Detalles del juego" es otro ajuste, y
    // es el que decide si la biblioteca se puede leer.
    legible: profile.isPublic && (await steam.canReadLibrary(profile.steamId)),
  };
}

async function resolveGoogle(input: string): Promise<Resolved> {
  // Mock resolver for Google Play games using email. 
  // In a real app we'd use OAuth or an API.
  return {
    accountId: input,
    username: input.split('@')[0] || input,
    level: null,
    avatarUrl: null,
    legible: true,
  };
}

/** Vuelve a traer las bibliotecas de todas las cuentas vinculadas. */
export async function resyncLibraries(userId: string): Promise<number> {
  const profile = await getProfileByUserId(userId);
  if (!profile) return 0;

  let total = 0;

  for (const account of profile.accounts) {
    if (!account.isPublic) continue;

    total += await syncLibrary(userId, {
      platform: account.platform,
      accountId: account.accountId,
    });

    await db
      .update(platformAccounts)
      .set({ syncedAt: new Date() })
      .where(
        and(
          eq(platformAccounts.userId, userId),
          eq(platformAccounts.platform, account.platform),
        ),
      );
  }

  return total;
}

export async function unlinkAccount(userId: string, platform: AccountPlatform) {
  await db
    .delete(platformAccounts)
    .where(
      and(
        eq(platformAccounts.userId, userId),
        eq(platformAccounts.platform, platform),
      ),
    );
}

/* ---------------------------------- Datos de juego --------------------------------- */

/**
 * Biblioteca de un usuario, leída de NUESTRA base.
 *
 * Nunca se consulta a las plataformas aquí. Es lo que permite que un amigo vea
 * este perfil: Steam o PSN solo nos dejarían leer ciertas cuentas, pero lo que
 * ya guardamos es nuestro. Salen los juegos de todas las plataformas juntos.
 */
export async function getLibrary(profile: ProfileRow): Promise<Library> {
  const rows = await db
    .select({
      id: gamesTable.id,
      platform: gamesTable.platform,
      title: gamesTable.title,
      deviceLabel: gamesTable.deviceLabel,
      iconUrl: gamesTable.iconUrl,
      service: gamesTable.service,
      definedTotal: gamesTable.definedTotal,
      defined: gamesTable.defined,
      developer: gamesTable.developer,
      publisher: gamesTable.publisher,
      genres: gamesTable.genres,
      earnedTotal: userGames.earnedTotal,
      earned: userGames.earned,
      progressPercent: userGames.progressPercent,
      lastPlayedAt: userGames.lastPlayedAt,
      playtimeMinutes: userGames.playtimeMinutes,
      rating: userGames.rating,
      review: userGames.review,
      reviewDate: userGames.reviewDate,
    })
    .from(userGames)
    .innerJoin(gamesTable, eq(gamesTable.id, userGames.gameId))
    .where(eq(userGames.userId, profile.userId))
    .orderBy(desc(userGames.lastPlayedAt));

  const games: Game[] = rows.map((r) => ({
    id: r.id,
    platform: r.platform,
    title: r.title,
    deviceLabel: r.deviceLabel,
    iconUrl: r.iconUrl ?? undefined,
    service: r.service ?? undefined,
    definedTotal: r.definedTotal,
    earnedTotal: r.earnedTotal,
    defined: (r.defined as unknown as Game["defined"]) ?? undefined,
    earned: (r.earned as unknown as Game["earned"]) ?? undefined,
    progressPercent: r.progressPercent,
    lastPlayedAt: r.lastPlayedAt?.toISOString(),
    playtimeMinutes: r.playtimeMinutes ?? undefined,
    developer: r.developer ?? undefined,
    publisher: r.publisher ?? undefined,
    genres: r.genres ?? undefined,
    rating: r.rating ?? undefined,
    review: r.review ?? undefined,
    reviewDate: r.reviewDate?.toISOString() ?? undefined,
  }));

  return { player: toPlayer(profile), games };
}

/**
 * Detalle de un juego.
 *
 * Si nunca hemos traído sus logros, se piden a la plataforma en ese momento y
 * se guardan: el catálogo entero son demasiadas llamadas para traerlo de
 * golpe, pero uno suelto, la primera vez que alguien lo abre, sí.
 */
export async function getGameDetail(
  profile: ProfileRow,
  gameId: string,
): Promise<GameDetail | null> {
  const { games } = await getLibrary(profile);
  const game = games.find((g) => g.id === gameId);
  if (!game) return null;

  const [estado] = await db
    .select({ syncedAt: userGames.trophiesSyncedAt })
    .from(userGames)
    .where(
      and(eq(userGames.userId, profile.userId), eq(userGames.gameId, gameId)),
    )
    .limit(1);

  // Los juegos manuales no tienen cuenta de plataforma que sincronizar.
  const account = game.platform === "manual" ? null : accountFor(profile, game.platform);

  if (!estado?.syncedAt && account) {
    // Solo se puede si la plataforma nos deja leer esa cuenta; si no,
    // mostramos lo que haya guardado (que puede ser nada) en vez de romper.
    try {
      await syncGameTrophies(
        profile.userId,
        { platform: account.platform, accountId: account.accountId },
        gameId,
      );
    } catch {
      // Se sirve lo que haya.
    }
  }

  const rows = await db
    .select({
      trophyId: gameTrophies.trophyId,
      name: gameTrophies.name,
      detail: gameTrophies.detail,
      grade: gameTrophies.grade,
      hidden: gameTrophies.hidden,
      iconUrl: gameTrophies.iconUrl,
      earned: userTrophies.earned,
      earnedAt: userTrophies.earnedAt,
      rarityPercent: userTrophies.rarityPercent,
      progressCurrent: userTrophies.progressCurrent,
      progressTarget: userTrophies.progressTarget,
    })
    .from(gameTrophies)
    .leftJoin(
      userTrophies,
      and(
        eq(userTrophies.gameId, gameTrophies.gameId),
        eq(userTrophies.trophyId, gameTrophies.trophyId),
        eq(userTrophies.userId, profile.userId),
      ),
    )
    .where(eq(gameTrophies.gameId, gameId))
    // El id es texto porque en Steam es un nombre, pero en PSN es un número y
    // ordenarlo como texto daría "1, 10, 11, 2". Los numéricos van primero y
    // en orden numérico, que es el orden del juego; el resto, alfabético.
    .orderBy(
      sql`case when ${gameTrophies.trophyId} ~ '^[0-9]+$'
                then lpad(${gameTrophies.trophyId}, 12, '0')
                else ${gameTrophies.trophyId} end`,
    );

  const trophies: Trophy[] = rows.map((r) => ({
    id: r.trophyId,
    name: r.name,
    detail: r.detail,
    grade: r.grade ?? undefined,
    hidden: r.hidden,
    iconUrl: r.iconUrl ?? undefined,
    earned: r.earned ?? false,
    earnedAt: r.earnedAt?.toISOString(),
    rarityPercent: r.rarityPercent ?? undefined,
    progress:
      r.progressTarget != null
        ? { current: r.progressCurrent ?? 0, target: r.progressTarget }
        : undefined,
  }));

  // El progreso puede haber cambiado al sincronizar justo arriba.
  const [fresco] = await db
    .select({
      earnedTotal: userGames.earnedTotal,
      progressPercent: userGames.progressPercent,
    })
    .from(userGames)
    .where(
      and(eq(userGames.userId, profile.userId), eq(userGames.gameId, gameId)),
    )
    .limit(1);

  return {
    ...game,
    definedTotal: trophies.length || game.definedTotal,
    earnedTotal: fresco?.earnedTotal ?? game.earnedTotal,
    progressPercent: fresco?.progressPercent ?? game.progressPercent,
    trophies,
  };
}

/* ------------------------------------ Amigos ------------------------------------ */

export interface FriendRow {
  userId: string;
  handle: string | null;
  displayName: string | null;
  image: string | null;
  trophyLevel: number | null;
  avatarUrl: string | null;
  platforms: AccountPlatform[];
}

function toFriendRow(p: ProfileRow): FriendRow {
  const player = toPlayer(p);

  return {
    userId: p.userId,
    handle: p.handle,
    displayName: p.displayName,
    image: p.image,
    trophyLevel: player.trophyLevel ?? null,
    avatarUrl: player.avatarUrl ?? null,
    platforms: p.accounts.map((a) => a.platform),
  };
}

/** Amistades aceptadas, mirando en ambos sentidos: la fila es una sola. */
export async function listFriends(userId: string): Promise<FriendRow[]> {
  const rows = await db
    .select({
      requesterId: friendships.requesterId,
      addresseeId: friendships.addresseeId,
    })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, userId),
        ),
      ),
    );

  const friendIds = rows.map((r) =>
    r.requesterId === userId ? r.addresseeId : r.requesterId,
  );

  if (friendIds.length === 0) return [];

  const profiles = await Promise.all(friendIds.map(getProfileByUserId));

  return profiles.filter((p): p is ProfileRow => p !== null).map(toFriendRow);
}

/** Solicitudes que otros me han enviado y aún no he respondido. */
export async function listPendingRequests(userId: string): Promise<FriendRow[]> {
  const rows = await db
    .select({ requesterId: friendships.requesterId })
    .from(friendships)
    .where(
      and(eq(friendships.addresseeId, userId), eq(friendships.status, "pending")),
    );

  const profiles = await Promise.all(
    rows.map((r) => getProfileByUserId(r.requesterId)),
  );

  return profiles.filter((p): p is ProfileRow => p !== null).map(toFriendRow);
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  const [row] = await db
    .select({ status: friendships.status })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(
          and(eq(friendships.requesterId, a), eq(friendships.addresseeId, b)),
          and(eq(friendships.requesterId, b), eq(friendships.addresseeId, a)),
        ),
      ),
    )
    .limit(1);

  return Boolean(row);
}

export async function sendFriendRequest(fromUserId: string, toHandle: string) {
  const target = await getProfileByHandle(toHandle);
  if (!target) return { ok: false as const, error: "No existe nadie con ese usuario." };
  if (target.userId === fromUserId)
    return { ok: false as const, error: "Ese eres tú." };

  // Si ya me la habían enviado a mí, aceptarla en vez de crear la contraria.
  const [existing] = await db
    .select({
      requesterId: friendships.requesterId,
      status: friendships.status,
    })
    .from(friendships)
    .where(
      or(
        and(
          eq(friendships.requesterId, fromUserId),
          eq(friendships.addresseeId, target.userId),
        ),
        and(
          eq(friendships.requesterId, target.userId),
          eq(friendships.addresseeId, fromUserId),
        ),
      ),
    )
    .limit(1);

  if (existing?.status === "accepted")
    return { ok: false as const, error: "Ya sois amigos." };

  if (existing) {
    if (existing.requesterId === fromUserId)
      return { ok: false as const, error: "Ya le enviaste una solicitud." };

    await acceptFriendRequest(fromUserId, target.userId);
    return { ok: true as const, accepted: true };
  }

  await db.insert(friendships).values({
    requesterId: fromUserId,
    addresseeId: target.userId,
    status: "pending",
  });

  return { ok: true as const, accepted: false };
}

export async function acceptFriendRequest(userId: string, requesterId: string) {
  await db
    .update(friendships)
    .set({ status: "accepted" })
    .where(
      and(
        eq(friendships.requesterId, requesterId),
        eq(friendships.addresseeId, userId),
      ),
    );
}

export async function removeFriend(userId: string, otherId: string) {
  await db
    .delete(friendships)
    .where(
      or(
        and(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, otherId),
        ),
        and(
          eq(friendships.requesterId, otherId),
          eq(friendships.addresseeId, userId),
        ),
      ),
    );
}
