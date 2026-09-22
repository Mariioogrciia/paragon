import "server-only";
import { gameKey, type Game, type Trophy, type TrophyGrade } from "@/lib/types";

/**
 * Cliente de Epic Games Store.
 *
 * A diferencia de PSN/Steam/Xbox, aquí NO hay ninguna credencial del
 * servidor: el GraphQL interno de store.epicgames.com (el mismo que usa su
 * propia web) responde igual con sesión que sin ella para un perfil en
 * público. No es una API oficial ni documentada: son "persisted queries" (un
 * hash SHA-256 en vez del texto de la consulta) que su frontend ya tiene
 * cacheadas en el backend. Si Epic cambia su web y esos hashes dejan de
 * existir, esto se rompe sin aviso — mismo nivel de riesgo que ya se acepta
 * para Xbox/OpenXBL (ver lib/xbl/client.ts).
 *
 * Hay una capa más, y esta sí es nueva: Cloudflare bloquea con un
 * "challenge" (403, `cf-mitigated: challenge`) cualquier `fetch` normal de
 * Node por su huella TLS — comprobado a mano el 22 de septiembre de 2026.
 * Un navegador de verdad lo pasa sin problema (por eso la primera prueba,
 * hecha desde la consola del propio navegador, parecía funcionar sin más),
 * pero un Server Action en Vercel usa `fetch` de Node, no un navegador. Y
 * mover la llamada al cliente tampoco vale: Epic no manda cabecera
 * `Access-Control-Allow-Origin` para orígenes ajenos, así que el propio
 * navegador del usuario bloquearía la respuesta por CORS antes de que
 * llegara a nuestro código. La solución es `got-scraping` (paquete de
 * Apify): imita la huella TLS/HTTP2 de un navegador real y sí lo pasa,
 * comprobado también a mano. Es un nivel de riesgo por encima de
 * PSN/Steam/Xbox — ahí no hace falta esquivar nada, aquí sí — y si
 * Cloudflare endurece la detección, esto puede dejar de funcionar sin que
 * cambie ni un hash de los de arriba.
 *
 * Segundo intento de verdad: el primero (commit 4102bc1, retirado en
 * 43226b0) era vía OAuth "Sign in with Epic" y nunca llegó a leer logros de
 * nadie. Este es un camino distinto — lectura pública anónima por
 * epicAccountId, sin que el usuario autorice nada — y sí funciona.
 */

const GRAPHQL = "https://store.epicgames.com/graphql";

/**
 * Hashes de las "persisted queries" que usa la propia web de Epic. Sacados
 * inspeccionando sus peticiones de red reales, no de ninguna documentación
 * (no existe). Si un día empiezan a fallar con "PersistedQueryNotFound",
 * hay que volver a sacarlos de la web.
 */
const HASH = {
  playerProfile: "ff954147a23d38a0e5b050962d442099487da001a0ab4b10ccbec8ac49755b3c",
  playerProfilePrivate: "47d0391fa5ec42d829e4a03f399cb586a29cf3cebd940cc4747aed0192c61114",
  getSandboxData: "43d8a3f7b403dc92e195efb75b0b28e8901ba76cff025b87482388762aee6894",
  Achievement: "9284d2fe200e351d1496feda728db23bb52bfd379b236fc3ceca746c1f1b33f2",
  playerProfileAchievementsByProductId: "70ff714976f88a85aafa3cb5abb9909d52e12a3ff585d7b49550d2493a528fb0",
} as const;

export class EpicProfileNotFoundError extends Error {
  constructor(input: string) {
    super(
      `Epic Games no encuentra ningún perfil con "${input}". Pega el enlace a tu perfil ` +
        `(store.epicgames.com/u/...) — dentro de la Epic Games Store: tu avatar → "Mis logros".`,
    );
    this.name = "EpicProfileNotFoundError";
  }
}

export class EpicPrivateProfileError extends Error {
  constructor(name: string) {
    super(
      `El perfil de Epic Games de ${name} no es público. En la Epic Games Store: tu avatar → ` +
        `"Mis logros" → "Nivel de privacidad" → "Público".`,
    );
    this.name = "EpicPrivateProfileError";
  }
}

/**
 * GET contra el GraphQL de Epic devolviendo JSON, con `got-scraping` en vez
 * de `fetch` — ver el aviso de Cloudflare arriba. Mismo `try/catch` de
 * siempre alrededor de la petición (ver el comentario de steam/client.ts:
 * un fallo de red sin capturar aquí tira abajo el botón "Sincronizar" de la
 * cabecera para cualquiera). `got` lanza en vez de devolver un `response.ok`
 * a false, así que aquí el `catch` cubre TANTO el fallo de red como un
 * 4xx/5xx real — a diferencia de Steam/PSN, donde eso son dos pasos.
 *
 * `got-scraping` se importa DENTRO de la función, no arriba del todo del
 * archivo — bug real en producción (22 sept 2026): este archivo lo importa
 * `lib/profiles.ts`, que es universal (prácticamente toda página pasa por
 * ahí), así que un `import` estático de `got-scraping` se evaluaba en
 * CUALQUIER carga de página, no solo al sincronizar Epic. Cuando el
 * paquete externo falló en el entorno serverless de Vercel
 * (`Failed to load external module got-scraping-...: Error: ADM-ZIP:
 * Invalid filename` — un problema de cómo Vercel empaqueta sus ficheros de
 * datos de huella de navegador, no de este código), tiró abajo la web
 * ENTERA, no solo Epic. Un `import()` dinámico aquí dentro hace que el
 * módulo solo se cargue cuando de verdad se sincroniza una cuenta de Epic
 * — la ruta menos transitada de toda la app — así que si vuelve a fallar,
 * se queda contenido en el `catch` de abajo en vez de tumbar cualquier
 * página.
 */
async function query<T>(operationName: string, variables: object, sha256Hash: string): Promise<T | null> {
  const url =
    `${GRAPHQL}?operationName=${operationName}` +
    `&variables=${encodeURIComponent(JSON.stringify(variables))}` +
    `&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash } }))}`;

  try {
    const { gotScraping } = await import("got-scraping");
    const response = await gotScraping({ url, responseType: "json", timeout: { request: 15_000 } });
    return response.body as T;
  } catch (error) {
    console.error("[epic] query", operationName, error);
    return null;
  }
}

/* --------------------------------- Perfil --------------------------------- */

const ACCOUNT_ID_RE = /^[0-9a-f]{32}$/i;

/** Saca el epicAccountId de lo que pegue el usuario: URL de perfil o el ID a pelo. */
function parseInput(input: string): string {
  const clean = input.trim();

  const profileUrl = clean.match(/epicgames\.com\/u\/([0-9a-f]{32})/i);
  if (profileUrl) return profileUrl[1];

  if (ACCOUNT_ID_RE.test(clean)) return clean;

  throw new EpicProfileNotFoundError(input);
}

interface AchievementsSummaryEntry {
  totalUnlocked: number;
  totalXP: number;
  sandboxId: string;
  baseOfferForSandbox?: { keyImages?: { url: string; type: string }[] } | null;
  product?: { name: string; slug: string } | null;
  productAchievements?: { totalAchievements: number; totalProductXP: number } | null;
}

interface PlayerProfilePrivate {
  achievementsSummaries?: {
    __typename: string;
    data?: AchievementsSummaryEntry[];
  };
}

async function fetchProfilePrivate(epicAccountId: string): Promise<PlayerProfilePrivate | null> {
  const json = await query<{ data?: { PlayerProfile?: { playerProfile?: PlayerProfilePrivate } } }>(
    "playerProfilePrivate",
    { epicAccountId, locale: "es-ES", page: 1, accountId: epicAccountId },
    HASH.playerProfilePrivate,
  );
  return json?.data?.PlayerProfile?.playerProfile ?? null;
}

interface PlayerProfileBasic {
  epicAccountId?: string;
  displayName?: string;
  avatar?: { small?: string; medium?: string; large?: string };
}

/**
 * El nombre y el avatar salen de una query DISTINTA a `playerProfilePrivate`
 * (que, a pesar del nombre, no los trae — solo trae logros/privacidad).
 * Confundir las dos fue un bug real de la primera versión de este cliente:
 * `playerProfilePrivate` respondía bien pero sin `epicAccountId`, así que
 * cualquier perfil salía como "no encontrado" aunque los logros estuvieran
 * ahí mismo, un piso más abajo en la respuesta.
 */
async function fetchProfileBasic(epicAccountId: string): Promise<PlayerProfileBasic | null> {
  const json = await query<{ data?: { PlayerProfile?: { playerProfile?: PlayerProfileBasic } } }>(
    "playerProfile",
    { epicAccountId },
    HASH.playerProfile,
  );
  return json?.data?.PlayerProfile?.playerProfile ?? null;
}

export interface ResolvedEpicProfile {
  epicAccountId: string;
  displayName: string;
  avatarUrl?: string;
  isPublic: boolean;
}

/**
 * Traduce lo que escriba el usuario a un epicAccountId con su perfil.
 *
 * `isPublic` sale de `achievementsSummaries.__typename`: si el nivel de
 * privacidad no deja verlo, Epic devuelve un `ServiceError` (403) ahí en vez
 * de la lista — comprobado a mano contra un perfil real con privacidad por
 * defecto ("Amigos de amigos").
 */
export async function resolveProfile(input: string): Promise<ResolvedEpicProfile> {
  const epicAccountId = parseInput(input);

  const [basic, priv] = await Promise.all([fetchProfileBasic(epicAccountId), fetchProfilePrivate(epicAccountId)]);
  if (!basic?.epicAccountId) throw new EpicProfileNotFoundError(input);

  return {
    epicAccountId: basic.epicAccountId,
    displayName: basic.displayName ?? epicAccountId,
    avatarUrl: basic.avatar?.medium,
    isPublic: priv?.achievementsSummaries?.__typename === "PlayerAchievementResponseSuccess",
  };
}

/* ------------------------------- Biblioteca ------------------------------- */

/**
 * `keyImages` mezcla carátulas de verdad con vídeos de portada
 * (`com.epicgames.video://...`, no una URL http normal) — sin filtrarlos,
 * el `find(...) ?? images[0]` de más abajo podía caer en uno de esos como
 * último recurso si el juego no tenía ni "Thumbnail" ni "OfferImageTall"
 * (visto de verdad con GTA V Enhanced).
 */
function bestImage(images: { url: string; type: string }[] | null | undefined): string | undefined {
  const fotos = images?.filter((i) => i.url.startsWith("http"));
  if (!fotos?.length) return undefined;
  return fotos.find((i) => i.type === "Thumbnail")?.url ?? fotos.find((i) => i.type === "OfferImageTall")?.url ?? fotos[0].url;
}

/**
 * Biblioteca de un jugador — de la misma llamada que ya resuelve el perfil.
 *
 * Al igual que Steam, no da el desglose por metal (Epic no tiene esa
 * jerarquía a nivel de juego, solo un "tier" por logro suelto — ver
 * `fetchAchievements`), así que solo se guarda el total.
 */
export async function fetchLibrary(epicAccountId: string): Promise<Game[]> {
  const profile = await fetchProfilePrivate(epicAccountId);
  const entries = profile?.achievementsSummaries?.data;
  if (!entries) return [];

  return entries
    // Sin nombre de producto no hay nada que enseñar: sandboxes huérfanos
    // (vistos en pruebas reales) sin oferta de tienda asociada.
    .filter((e): e is AchievementsSummaryEntry & { product: { name: string; slug: string } } => !!e.product?.name)
    .map((e) => {
      const total = e.productAchievements?.totalAchievements ?? 0;
      return {
        id: gameKey("epic", e.sandboxId),
        platform: "epic" as const,
        title: e.product.name,
        deviceLabel: "PC",
        iconUrl: bestImage(e.baseOfferForSandbox?.keyImages),
        progressPercent: total > 0 ? Math.round((e.totalUnlocked / total) * 100) : 0,
        definedTotal: total,
        earnedTotal: e.totalUnlocked,
      };
    });
}

/* --------------------------------- Logros --------------------------------- */

/**
 * El sandboxId (el que identifica el juego en la biblioteca) no es el mismo
 * id que hace falta para pedir el estado de los logros de UN jugador — eso
 * pide un `productId` aparte, que solo se saca con esta llamada.
 */
async function fetchProductId(sandboxId: string): Promise<string | null> {
  const json = await query<{ data?: { Product?: { sandbox?: { productId?: string } } } }>(
    "getSandboxData",
    { sandboxId },
    HASH.getSandboxData,
  );
  return json?.data?.Product?.sandbox?.productId ?? null;
}

interface CatalogAchievement {
  name: string;
  hidden: boolean;
  unlockedDisplayName: string;
  lockedDisplayName: string;
  unlockedDescription: string;
  lockedDescription: string;
  unlockedIconLink?: string;
  lockedIconLink?: string;
  XP: number;
  tier?: { name: string } | null;
  rarity?: { percent: number } | null;
}

/** Definiciones del juego (nombre, icono, rareza, tier) — comunes a todo el mundo. */
async function fetchCatalog(sandboxId: string): Promise<Map<string, CatalogAchievement>> {
  const json = await query<{
    data?: {
      Achievement?: {
        productAchievementsRecordBySandbox?: { achievements?: { achievement: CatalogAchievement }[] };
      };
    };
  }>("Achievement", { sandboxId, locale: "es-ES" }, HASH.Achievement);

  const list = json?.data?.Achievement?.productAchievementsRecordBySandbox?.achievements ?? [];
  return new Map(list.map((a) => [a.achievement.name, a.achievement]));
}

interface PlayerAchievementEntry {
  achievementName: string;
  unlocked: boolean;
  unlockDate?: string;
  XP: number;
}

/** Qué logros tiene ESTE jugador — del jugador, no del catálogo. */
async function fetchPlayerAchievements(epicAccountId: string, productId: string): Promise<PlayerAchievementEntry[]> {
  const json = await query<{
    data?: {
      PlayerProfile?: {
        playerProfile?: {
          productAchievements?: { data?: { playerAchievements?: { playerAchievement: PlayerAchievementEntry }[] } };
        };
      };
    };
  }>("playerProfileAchievementsByProductId", { epicAccountId, productId }, HASH.playerProfileAchievementsByProductId);

  const list = json?.data?.PlayerProfile?.playerProfile?.productAchievements?.data?.playerAchievements ?? [];
  return list.map((p) => p.playerAchievement);
}

/**
 * Solo oro/plata/bronce: Epic no tiene un "platino" por logro suelto como
 * PSN, cada juego solo tiene su "Virtuoso" (desbloquear todos), que aquí ya
 * sale como un logro normal más con tier oro. `esPlatinoEquivalente`
 * (lib/stats.ts) trata el 100% de Epic como el platino del juego, igual que
 * ya hace con el 100% de Steam.
 */
const TIER_TO_GRADE: Record<string, TrophyGrade> = { gold: "gold", silver: "silver", bronze: "bronze" };

/**
 * Logros de un juego para un jugador. Dos llamadas en paralelo (catálogo +
 * estado del jugador) cruzadas por `name`/`achievementName`, que es el mismo
 * id numérico en las dos — comprobado a mano contra un perfil real.
 */
export async function fetchAchievements(epicAccountId: string, sandboxId: string): Promise<Trophy[]> {
  const productId = await fetchProductId(sandboxId);
  if (!productId) return [];

  const [catalog, playerAchievements] = await Promise.all([
    fetchCatalog(sandboxId),
    fetchPlayerAchievements(epicAccountId, productId),
  ]);

  if (catalog.size === 0) return [];

  const stateByName = new Map(playerAchievements.map((p) => [p.achievementName, p]));

  return Array.from(catalog.entries()).map(([name, def]) => {
    const state = stateByName.get(name);
    const earned = state?.unlocked ?? false;

    return {
      id: name,
      name: earned ? def.unlockedDisplayName : def.lockedDisplayName,
      detail: earned ? def.unlockedDescription : def.lockedDescription,
      grade: def.tier?.name ? TIER_TO_GRADE[def.tier.name] : undefined,
      earned,
      earnedAt: state?.unlockDate,
      rarityPercent: def.rarity?.percent,
      hidden: def.hidden,
      iconUrl: earned ? def.unlockedIconLink : def.lockedIconLink,
      xp: def.XP,
    };
  });
}
