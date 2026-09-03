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
  index,
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
  
  /** Lista de 4 IDs de juegos favoritos para mostrar en el perfil */
  favorites: jsonb("favorites").$type<string[]>().default([]),
  
  /** Lista de hasta 3 trofeos fijados para la Vitrina de Orgullo */
  showcaseTrophies: jsonb("showcaseTrophies").$type<{ gameId: string, trophyId: string }[]>().default([]),
  
  profileTitle: text("profileTitle"),
  profileBackgroundGameId: text("profileBackgroundGameId"),
  profileBannerUrl: text("profileBannerUrl"),
  profileColor: text("profileColor"),
  profileFrame: text("profileFrame"),
  statusText: text("statusText"),

  /**
   * Orden de las secciones del perfil público (wrap, stats, nivel, logros,
   * colecciones, vitrina, favoritos, biblioteca). `null` = orden por
   * defecto (`DEFAULT_SECTION_ORDER` en lib/profileSections.ts).
   */
  profileSectionOrder: jsonb("profileSectionOrder").$type<string[]>(),

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
    platform: text("platform").$type<"psn" | "steam" | "google" | "xbox" | "epic" | "ubisoft">().notNull(),
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
  /** "manual" = añadido a mano (Switch, retro...), sin API detrás. */
  platform: text("platform").$type<"psn" | "steam" | "google" | "xbox" | "epic" | "ubisoft" | "manual">().notNull(),
  /** npCommunicationId en PSN, appid en Steam, "<id de IGDB>:<dispositivo>" en manual. */
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
  igdbId: integer("igdbId"),
  developer: text("developer"),
  publisher: text("publisher"),
  genres: jsonb("genres").$type<string[]>(),
  pegi: text("pegi"),
  /** Null mientras no hayamos pedido los metadatos a la tienda. */
  metadataSyncedAt: timestamp("metadataSyncedAt", { mode: "date" }),
}, (g) => [
  index("game_igdb_idx").on(g.igdbId),
]);

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
    /** ID del grupo de trofeos. "default" para el juego base, "001" etc para DLCs. */
    groupId: text("groupId").notNull().default("default"),
    groupName: text("groupName"),
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
    /** Minutos jugados, cuando la plataforma los proporciona. */
    playtimeMinutes: integer("playtimeMinutes"),
    /** Null mientras no hayamos traído el detalle de logros de este juego. */
    trophiesSyncedAt: timestamp("trophiesSyncedAt", { mode: "date" }),
    rating: integer("rating"),
    review: text("review"),
    reviewDate: timestamp("reviewDate", { mode: "date" }),
    isWishlist: boolean("isWishlist").notNull().default(false),
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

export const friends = pgTable(
  "friend",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    friendId: text("friendId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.friendId] })],
);

/* ------------------------------------------------------------------ *
 * Actividad social y Feed (Timeline)                                 *
 * ------------------------------------------------------------------ */

export const activities = pgTable(
  "activity",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<"review" | "rating" | "platinum" | "favorite" | "new_game">().notNull(),
    gameId: text("gameId")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    rating: integer("rating"),
    review: text("review"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  }
);

export const activityReactions = pgTable(
  "activity_reaction",
  {
    activityId: text("activityId").notNull().references(() => activities.id, { onDelete: "cascade" }),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    reaction: text("reaction").notNull().default("aplauso"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.activityId, t.userId] })],
);

export const activityComments = pgTable("activity_comment", {
  id: text("id").primaryKey(),
  activityId: text("activityId").notNull().references(() => activities.id, { onDelete: "cascade" }),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const syncRuns = pgTable("sync_run", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  games: integer("games").notNull().default(0),
  newTrophies: integer("newTrophies").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

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

/* ------------------------------------------------------------------ *
 * Metalogros (Insignias de la app)                                   *
 * ------------------------------------------------------------------ */

export const userBadges = pgTable(
  "user_badge",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeId: text("badgeId").notNull(),
    earnedAt: timestamp("earnedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })]
);


/* ------------------------------------------------------------------ *
 * Avisos                                                             *
 *                                                                    *
 * Los genera el cron al sincronizar, no la navegación: la gracia es   *
 * enterarte de que te falta un trofeo para el platino SIN tener que   *
 * entrar a mirarlo.                                                  *
 * ------------------------------------------------------------------ */

export const notifications = pgTable(
  "notification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type")
      .$type<
        | "platino_cerca"
        | "lanzamiento"
        | "amigo_adelanta"
        | "logros_nuevos"
        | "abandonado"
        | "resumen_semanal"
      >()
      .notNull(),
    title: text("title").notNull(),
    body: text("body"),
    /** A dónde lleva al pulsarlo. */
    href: text("href"),
    /**
     * Sin clave foránea a propósito: un aviso sobre un juego que luego
     * desaparece del catálogo sigue teniendo sentido como texto, y no quiero
     * que borrar un juego se lleve por delante el historial de avisos.
     */
    gameId: text("gameId"),
    /**
     * Lo que impide repetir el mismo aviso en cada pasada del cron. El índice
     * único de abajo hace el trabajo: se inserta con onConflictDoNothing y
     * listo, sin tener que consultar antes.
     */
    dedupeKey: text("dedupeKey").notNull(),
    readAt: timestamp("readAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (n) => [uniqueIndex("notification_dedupe_idx").on(n.userId, n.dedupeKey)],
);

/* ------------------------------------------------------------------ *
 * Dificultad votada por la comunidad                                 *
 *                                                                    *
 * La dificultad "estimada" (lib/difficulty.ts) sale de la rareza del *
 * platino, que mezcla tres cosas — lo difícil que es, lo largo que   *
 * es y cuánta gente lo abandona a la media hora. Un juego puede ser  *
 * raro por ser un exclusivo poco vendido, no por ser duro. Esto es   *
 * la segunda señal, la que da la gente que se lo ha pasado: cuánto   *
 * les costó de verdad, del 1 al 5. Tabla aparte y no una columna más *
 * en `user_game` porque es un eje distinto de la nota de la reseña   *
 * (`rating`, que puntúa si el juego es BUENO, no si es DURO).        *
 * ------------------------------------------------------------------ */

export const gameDifficultyVotes = pgTable(
  "game_difficulty_vote",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: text("gameId")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    /** 1 (regalado) a 5 (brutal), misma dirección que lib/difficulty.ts. */
    value: integer("value").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (v) => [primaryKey({ columns: [v.userId, v.gameId] })],
);

/* ------------------------------------------------------------------ *
 * Guías escritas, como un foro                                       *
 *                                                                    *
 * El vídeo de youtube (TrophyGuideModal) es de un trofeo suelto y no *
 * lo escribe nadie de aquí — lo busca la propia app. Esto es lo      *
 * contrario: alguien de la comunidad escribe una guía del JUEGO      *
 * entero (rutas, orden recomendado, qué evitar) y el resto puede     *
 * responder, como un hilo de foro. Dos tablas porque un hilo son dos *
 * cosas — el primer mensaje y sus respuestas — no una lista plana.   *
 * ------------------------------------------------------------------ */

export const gameGuides = pgTable("game_guide", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  gameId: text("gameId")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const gameGuideReplies = pgTable("game_guide_reply", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  guideId: text("guideId")
    .notNull()
    .references(() => gameGuides.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
