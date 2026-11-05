import "server-only";
import { getProfileByHandle } from "@/lib/profiles";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { friendships, platformAccounts, users } from "@/db/schema";
import { anunciarSolicitudAmistad } from "@/lib/discordBot";
import { enviarPush } from "@/lib/webPush";
import { guardarAviso } from "@/lib/bandeja";
import { avisarUsuario } from "@/lib/avisos";
import { enviarPushFcm } from "@/lib/fcm";
import { type AccountPlatform } from "@/lib/types";

/**
 * Amistades: lista, solicitudes, aceptar, rechazar y quitar (sacado de
 * lib/profiles.ts el 5 nov 2026, que pasaba de 1800 líneas). profiles.ts lo
 * reexporta, así que `import { listFriends } from "@/lib/profiles"` sigue
 * valiendo; el código nuevo puede importar de aquí directamente.
 */
/* ------------------------------------ Amigos ------------------------------------ */

export interface FriendRow {
  userId: string;
  handle: string | null;
  displayName: string | null;
  image: string | null;
  trophyLevel: number | null;
  avatarUrl: string | null;
  platforms: AccountPlatform[];
  /**
   * Igual que `platforms`, pero con el username/ID real de cada cuenta
   * (Online ID de PSN, gamertag de Xbox, SteamID) — para poder añadir a un
   * amigo directamente en esa plataforma sin tener que pedírselo aparte.
   */
  accounts: { platform: AccountPlatform; username: string }[];
}

/**
 * Mismo patrón que `clasificacionAmigos` en lib/rankings.ts (ver su
 * comentario: "por cada participante... 25-30 consultas... la página con
 * más papeletas de atascar el pool") — antes `listFriends`/
 * `listPendingRequests` hacían exactamente ese N+1 vía
 * `Promise.all(ids.map(getProfileByUserId))` (3 queries por id, lanzadas
 * en paralelo contra el pool), el mismo problema que ya se documentó y se
 * arregló ahí pero nunca se aplicó aquí. Dos queries con `inArray` en vez
 * de 3×N — no hace falta `userBadges` (`toFriendRow` no lo usa), así que
 * ni se pide.
 */
async function friendRowsForIds(userIds: string[]): Promise<FriendRow[]> {
  if (userIds.length === 0) return [];

  const [userRows, accountRows] = await Promise.all([
    db
      .select({
        userId: users.id,
        handle: users.handle,
        displayName: users.name,
        image: users.image,
        avatarPersonalizado: users.avatarPersonalizado,
      })
      .from(users)
      .where(inArray(users.id, userIds)),
    db
      .select({
        userId: platformAccounts.userId,
        platform: platformAccounts.platform,
        username: platformAccounts.username,
        level: platformAccounts.level,
        avatarUrl: platformAccounts.avatarUrl,
      })
      .from(platformAccounts)
      .where(inArray(platformAccounts.userId, userIds)),
  ]);

  return userRows.map((u) => {
    const accounts = accountRows.filter((a) => a.userId === u.userId);
    const psn = accounts.find((a) => a.platform === "psn");

    return {
      userId: u.userId,
      handle: u.handle,
      displayName: u.displayName,
      image: u.image,
      trophyLevel: psn?.level ?? null,
      avatarUrl:
        (u.avatarPersonalizado && u.image) ||
        psn?.avatarUrl ||
        accounts.find((a) => a.avatarUrl)?.avatarUrl ||
        u.image ||
        null,
      platforms: accounts.map((a) => a.platform),
      accounts: accounts.map((a) => ({ platform: a.platform, username: a.username })),
    };
  });
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

  return friendRowsForIds(friendIds);
}

/** Solicitudes que otros me han enviado y aún no he respondido. */
export async function listPendingRequests(userId: string): Promise<FriendRow[]> {
  const rows = await db
    .select({ requesterId: friendships.requesterId })
    .from(friendships)
    .where(
      and(eq(friendships.addresseeId, userId), eq(friendships.status, "pending")),
    );

  return friendRowsForIds(rows.map((r) => r.requesterId));
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

export type FriendshipStatus = "amigos" | "solicitudEnviada" | "solicitudRecibida" | "ninguna";

/**
 * Estado de amistad entre `viewerId` (quien mira) y `otherId` (el perfil
 * que está viendo) — para decidir qué botón enseñar en el perfil de
 * alguien: "Añadir amigo", "Solicitud enviada" (deshabilitado) o
 * "Aceptar solicitud" (si ya te la había mandado él).
 */
export async function getFriendshipStatus(viewerId: string, otherId: string): Promise<FriendshipStatus> {
  const [row] = await db
    .select({ requesterId: friendships.requesterId, status: friendships.status })
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, viewerId), eq(friendships.addresseeId, otherId)),
        and(eq(friendships.requesterId, otherId), eq(friendships.addresseeId, viewerId)),
      ),
    )
    .limit(1);

  if (!row) return "ninguna";
  if (row.status === "accepted") return "amigos";
  return row.requesterId === viewerId ? "solicitudEnviada" : "solicitudRecibida";
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

  // Aviso push a quien la recibe — mismo mecanismo que "trofeo nuevo"/
  // "platino conseguido" (ver enviarPush en lib/sync.ts), no hace falta que
  // tenga Paragon abierto para enterarse. No hace nada si no tiene ninguna
  // suscripción guardada (enviarPush ya lo comprueba solo).
  const [remitente] = await db
    .select({ handle: users.handle, name: users.name })
    .from(users)
    .where(eq(users.id, fromUserId))
    .limit(1);
  const nombreRemitente = remitente?.name ?? remitente?.handle ?? "Alguien";
  const avisoSolicitud = {
    title: "Nueva solicitud de amistad",
    body: `${nombreRemitente} quiere ser tu amigo en Paragon.`,
    url: "/amigos",
  };
  // Los dos canales a la vez: Web Push llega a quien tiene la web/PWA
  // abierta, FCM a quien tiene la app nativa de Android — ninguno de los
  // dos hace nada si el destinatario no tiene nada registrado en ese canal.
  await Promise.all([
    enviarPush(target.userId, avisoSolicitud),
    enviarPushFcm(target.userId, avisoSolicitud),
    guardarAviso(target.userId, { titulo: avisoSolicitud.title, texto: avisoSolicitud.body, ruta: avisoSolicitud.url }),
    // Y por DM de Discord, con botones para aceptar o rechazar ahí mismo.
    anunciarSolicitudAmistad(target.userId, fromUserId, nombreRemitente, remitente?.handle ?? null),
  ]);

  return { ok: true as const, accepted: false };
}

export async function acceptFriendRequest(userId: string, requesterId: string): Promise<boolean> {
  const aceptadas = await db
    .update(friendships)
    .set({ status: "accepted" })
    .where(
      and(
        eq(friendships.requesterId, requesterId),
        eq(friendships.addresseeId, userId),
        eq(friendships.status, "pending"),
      ),
    )
    .returning({ requesterId: friendships.requesterId });

  // Aviso a quien la mandó (16 oct 2026): antes no se enteraba hasta que
  // miraba su lista de amigos. Solo si de verdad estaba pendiente.
  if (aceptadas.length > 0) {
    const [yo] = await db.select({ handle: users.handle, name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    await avisarUsuario(requesterId, {
      titulo: "🤝 Solicitud aceptada",
      texto: `${yo?.name ?? yo?.handle ?? "Alguien"} ya es tu amigo en Paragon.`,
      ruta: yo?.handle ? `/u/${yo.handle}` : "/amigos",
    });
  }
  return aceptadas.length > 0;
}

/** Rechaza una solicitud que sigue pendiente (botón del DM de Discord); no toca una amistad ya aceptada. */
export async function declineFriendRequest(userId: string, requesterId: string): Promise<boolean> {
  const borradas = await db
    .delete(friendships)
    .where(
      and(
        eq(friendships.requesterId, requesterId),
        eq(friendships.addresseeId, userId),
        eq(friendships.status, "pending"),
      ),
    )
    .returning({ requesterId: friendships.requesterId });
  return borradas.length > 0;
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
