import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

/* ------------------------------------------------------------------ *
 * Tablas de Auth.js. Su forma la impone el adaptador, no la elegimos. *
 * ------------------------------------------------------------------ */

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),

  /**
   * Identificador dentro de la plataforma: lo elige el usuario al entrar por
   * primera vez y es por donde los amigos se añaden entre sí. Nada que ver con
   * el online ID de PSN, que puede cambiar y no todo el mundo quiere enseñar.
   */
  handle: text("handle").unique(),
  
  firstName: text("firstName"),
  lastName: text("lastName"),
  
  language: text("language").default("es-ES"),
  timezone: text("timezone").default("Europe/Madrid"),
  firstDayOfWeek: text("firstDayOfWeek").default("domingo"),
  timeFormat: text("timeFormat").default("24h"),
  
  isPublicProfile: boolean("isPublicProfile").default(true),
  hideEmptyGames: boolean("hideEmptyGames").default(false),
  hideZeroProgressGames: boolean("hideZeroProgressGames").default(false),
  theme: text("theme").default("dark"),

  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

/* ------------------------------------------- *
 * Tablas nuestras.                            *
 * ------------------------------------------- */

/**
 * Las cuentas de plataforma que un usuario ha vinculado.
 *
 * Una fila por usuario y plataforma: el mismo usuario puede tener PSN y Steam
 * a la vez. Guardamos su identificador público y el id interno que pide cada
 * API. Ninguna credencial suya: las consultas van con la credencial del
 * servidor, así que vincular es solo decir "este soy yo ahí".
 */
export const platformAccounts = pgTable(
  "platform_account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform").$type<"psn" | "steam" | "google">().notNull(),
    /** accountId de PSN, SteamID64 de Steam. */
    accountId: text("accountId").notNull(),
    /** El nombre público: online ID en PSN, persona name en Steam. */
    username: text("username").notNull(),
    /** Nivel de trofeos de PSN. Steam no tiene equivalente. */
    level: integer("level"),
    avatarUrl: text("avatarUrl"),
    /** Si el perfil es privado, no podremos leer sus juegos. */
    isPublic: boolean("isPublic").notNull().default(true),
    syncedAt: timestamp("syncedAt", { mode: "date" }),
  },
  (a) => [
    primaryKey({ columns: [a.userId, a.platform] }),
    uniqueIndex("platform_account_identity_idx").on(a.platform, a.accountId),
  ],
);

/**
 * @deprecated Sustituida por `platformAccounts`.
 *
 * Se queda definida solo para que `db:push` no la borre antes de que
 * `scripts/migrar-multiplataforma.mts` copie las filas a la tabla nueva.
 * Una vez migrado, se puede borrar de aquí y volver a hacer push.
 */
export const psnProfiles = pgTable(
  "psn_profile",
  {
    userId: text("userId")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    onlineId: text("onlineId").notNull(),
    accountId: text("accountId").notNull(),
    trophyLevel: integer("trophyLevel"),
    avatarUrl: text("avatarUrl"),
    isPublic: boolean("isPublic").notNull().default(true),
    syncedAt: timestamp("syncedAt", { mode: "date" }),
  },
  (p) => [uniqueIndex("psn_profile_accountId_idx").on(p.accountId)],
);

/* ---------------------------------------------------------------- *
 * Trofeos persistidos.                                             *
 *                                                                  *
 * PSN solo nos deja leer la cuenta autenticada y sus amigos de      *
 * PlayStation. Guardando lo que leemos, un amigo *de la plataforma* *
 * puede ver tu progreso aunque PSN nunca le dejaría consultarlo:    *
 * servimos desde nuestra base, no desde Sony. Además es lo que      *
 * habilita el histórico (rachas, evolución, ranking).               *
 * ---------------------------------------------------------------- */

/**
 * Catálogo compartido: un juego es el mismo para todo el mundo.
 *
 * La clave es `<plataforma>-<id nativo>` (ver `gameKey` en lib/types): el
 * mismo título en PSN y en Steam son dos filas, porque sus sets de logros no
 * coinciden y mezclarlos daría porcentajes sin sentido.
 */
export const games = pgTable("game", {
  id: text("id").primaryKey(),
  platform: text("platform").$type<"psn" | "steam" | "google">().notNull(),
  /** npCommunicationId en PSN, appid en Steam. */
  nativeId: text("nativeId").notNull(),
  title: text("title").notNull(),
  /** Lo que se enseña: "PS5", "PS4", "PC"... */
  deviceLabel: text("deviceLabel").notNull(),
  iconUrl: text("iconUrl"),
  /** Solo PSN: "trophy" (PS4 y anteriores) o "trophy2" (PS5). */
  service: text("service").$type<"trophy" | "trophy2">(),
  /** Logros que define el juego, en total. El dato común a todas las plataformas. */
  definedTotal: integer("definedTotal").notNull().default(0),
  /** Desglose por metal. Solo PSN lo tiene, por eso admite null. */
  defined: jsonb("defined").$type<Record<string, number>>(),

  /* Metadatos de catálogo, para agrupar y filtrar por empresa o género. */
  developer: text("developer"),
  publisher: text("publisher"),
  genres: jsonb("genres").$type<string[]>(),
  /** Null mientras no hayamos pedido los metadatos a la tienda. */
  metadataSyncedAt: timestamp("metadataSyncedAt", { mode: "date" }),
});

/** Definición de cada logro. También compartida entre usuarios. */
export const gameTrophies = pgTable(
  "game_trophy",
  {
    gameId: text("gameId")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    /** Número en PSN, nombre de API en Steam: por eso es texto. */
    trophyId: text("trophyId").notNull(),
    name: text("name").notNull(),
    detail: text("detail").notNull().default(""),
    /** Null en las plataformas sin metales. */
    grade: text("grade").$type<"bronze" | "silver" | "gold" | "platinum">(),
    hidden: boolean("hidden").notNull().default(false),
    iconUrl: text("iconUrl"),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.trophyId] })],
);

/** Progreso de un usuario en un juego. */
export const userGames = pgTable(
  "user_game",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: text("gameId")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    progressPercent: integer("progressPercent").notNull().default(0),
    earnedTotal: integer("earnedTotal").notNull().default(0),
    /** Desglose por metal. Solo PSN. */
    earned: jsonb("earned").$type<Record<string, number>>(),
    lastPlayedAt: timestamp("lastPlayedAt", { mode: "date" }),
    /** Minutos jugados. Solo Steam lo da. */
    playtimeMinutes: integer("playtimeMinutes"),
    /** Null mientras no hayamos traído el detalle de logros de este juego. */
    trophiesSyncedAt: timestamp("trophiesSyncedAt", { mode: "date" }),
    rating: integer("rating"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.gameId] })],
);

/** Estado de cada logro para un usuario. */
export const userTrophies = pgTable(
  "user_trophy",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: text("gameId")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    trophyId: text("trophyId").notNull(),
    earned: boolean("earned").notNull().default(false),
    earnedAt: timestamp("earnedAt", { mode: "date" }),
    /** % de jugadores del mundo que lo tienen. */
    rarityPercent: doublePrecision("rarityPercent"),
    progressCurrent: integer("progressCurrent"),
    progressTarget: integer("progressTarget"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.gameId, t.trophyId] })],
);

/* ---------------------------------------------------------------- *
 * Carpetas.                                                        *
 *                                                                  *
 * Agrupaciones que se hace el usuario a mano ("Pendientes 2025",   *
 * "Para platinar en verano"). Existen porque la agrupación         *
 * automática por empresa solo funciona donde hay metadatos: Steam  *
 * los da, PSN no. Esto es lo único de la biblioteca que NO se      *
 * puede regenerar sincronizando, así que ojo al borrar.            *
 * ---------------------------------------------------------------- */

export const collections = pgTable(
  "collection",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (c) => [uniqueIndex("collection_user_name_idx").on(c.userId, c.name)],
);

/** Qué juegos hay en cada carpeta. Un juego puede estar en varias. */
export const collectionGames = pgTable(
  "collection_game",
  {
    collectionId: text("collectionId")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    gameId: text("gameId")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    addedAt: timestamp("addedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.gameId] })],
);

/**
 * Amistades, por handle de plataforma.
 *
 * Una fila por par, con dirección: `requesterId` la pidió, `addresseeId` la
 * acepta o no. Guardar solo una fila (en vez de dos simétricas) evita que se
 * queden desincronizadas.
 */
export const friendships = pgTable(
  "friendship",
  {
    requesterId: text("requesterId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: text("addresseeId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").$type<"pending" | "accepted">().notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (f) => [primaryKey({ columns: [f.requesterId, f.addresseeId] })],
);
