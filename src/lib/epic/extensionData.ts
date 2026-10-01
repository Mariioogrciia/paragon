import type { AchievementsSummaryEntry, CatalogAchievement, PlayerAchievementEntry } from "@/lib/epic/client";

/**
 * Datos de Epic leídos por la extensión del navegador (extension/epic.js)
 * desde la sesión del propio usuario, y enviados a /api/extension/epic-sync.
 *
 * Epic bloquea con su protección antibots las consultas que hace el
 * servidor (comprobado el 1 oct 2026), pero no las de un navegador de
 * verdad: por eso las hace el navegador del usuario y aquí solo se
 * reciben. Como vienen de un cliente que Paragon no controla, NADA se da
 * por bueno: cada campo se normaliza a la forma exacta que espera el resto
 * del código, con topes de tamaño, y las imágenes solo se aceptan de los
 * dominios de Epic (si no, un payload falseado podría hacer que quien vea
 * el perfil cargue una imagen cualquiera). Lo que no cuadra se descarta en
 * silencio campo a campo; lo que hace el payload inservible lanza
 * `EpicPayloadError`.
 *
 * Límite que no se puede cerrar desde aquí: el servidor no puede comprobar
 * que los logros sean ciertos (con PSN la extensión manda una credencial y
 * el servidor lee los datos él mismo; aquí no hay credencial que mandar).
 */

export class EpicPayloadError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "EpicPayloadError";
  }
}

export interface EpicDatosExtension {
  epicAccountId: string;
  displayName: string;
  avatarUrl: string | null;
  resumenes: AchievementsSummaryEntry[];
  /** Detalle por juego: lo que `fetchAchievements` pediría con (accountId, sandboxId). */
  detalles: Map<string, { catalogo: Map<string, CatalogAchievement>; jugador: PlayerAchievementEntry[] }>;
}

export const MAX_JUEGOS = 500;
export const MAX_DETALLES = 60;
export const MAX_LOGROS_POR_JUEGO = 1000;

const ACCOUNT_ID_RE = /^[0-9a-f]{32}$/i;
const DOMINIOS_IMAGEN = ["epicgames.com", "unrealengine.com", "epicgames.dev", "epicgames.net"];

type Crudo = Record<string, unknown>;
const esObjeto = (v: unknown): v is Crudo => typeof v === "object" && v !== null && !Array.isArray(v);

function texto(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const limpio = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return limpio ? limpio.slice(0, max) : null;
}

function entero(v: unknown, max: number): number | null {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.round(v))) : null;
}

/** https y de un dominio de Epic; si no, se descarta (undefined), no se falla. */
export function imagenDeEpic(v: unknown): string | undefined {
  const url = texto(v, 600);
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return undefined;
    const host = u.hostname.toLowerCase();
    return DOMINIOS_IMAGEN.some((d) => host === d || host.endsWith(`.${d}`)) ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function resumen(v: unknown): AchievementsSummaryEntry | null {
  if (!esObjeto(v)) return null;
  const sandboxId = texto(v.sandboxId, 80);
  const totalUnlocked = entero(v.totalUnlocked, 100_000);
  const producto = esObjeto(v.product) ? v.product : null;
  const nombre = texto(producto?.name, 200);
  if (!sandboxId || totalUnlocked === null || !nombre) return null;

  const total = esObjeto(v.productAchievements) ? entero(v.productAchievements.totalAchievements, 100_000) : null;
  const imagenes = esObjeto(v.baseOfferForSandbox) && Array.isArray(v.baseOfferForSandbox.keyImages) ? v.baseOfferForSandbox.keyImages : [];

  return {
    sandboxId,
    totalUnlocked,
    totalXP: entero(v.totalXP, 10_000_000) ?? 0,
    product: { name: nombre, slug: texto(producto?.slug, 200) ?? "" },
    productAchievements: { totalAchievements: total ?? 0, totalProductXP: 0 },
    baseOfferForSandbox: {
      keyImages: imagenes
        .slice(0, 12)
        .map((i) => (esObjeto(i) ? { url: imagenDeEpic(i.url), type: texto(i.type, 40) } : null))
        .filter((i): i is { url: string; type: string } => !!i && !!i.url && !!i.type),
    },
  };
}

function definicion(v: unknown): [string, CatalogAchievement] | null {
  if (!esObjeto(v)) return null;
  const nombre = texto(v.name, 120);
  if (!nombre) return null;
  const tier = esObjeto(v.tier) ? texto(v.tier.name, 20) : null;
  const rareza = esObjeto(v.rarity) && typeof v.rarity.percent === "number" && Number.isFinite(v.rarity.percent) ? Math.min(100, Math.max(0, v.rarity.percent)) : null;
  return [
    nombre,
    {
      name: nombre,
      hidden: v.hidden === true,
      unlockedDisplayName: texto(v.unlockedDisplayName, 200) ?? nombre,
      lockedDisplayName: texto(v.lockedDisplayName, 200) ?? nombre,
      unlockedDescription: texto(v.unlockedDescription, 600) ?? "",
      lockedDescription: texto(v.lockedDescription, 600) ?? "",
      unlockedIconLink: imagenDeEpic(v.unlockedIconLink),
      lockedIconLink: imagenDeEpic(v.lockedIconLink),
      XP: entero(v.XP, 100_000) ?? 0,
      tier: tier ? { name: tier } : null,
      rarity: rareza === null ? null : { percent: rareza },
    },
  ];
}

function logroJugador(v: unknown): PlayerAchievementEntry | null {
  if (!esObjeto(v)) return null;
  const nombre = texto(v.achievementName, 120);
  if (!nombre) return null;
  const fecha = typeof v.unlockDate === "string" && !Number.isNaN(new Date(v.unlockDate).getTime()) ? new Date(v.unlockDate).toISOString() : undefined;
  return { achievementName: nombre, unlocked: v.unlocked === true, unlockDate: fecha, XP: entero(v.XP, 100_000) ?? 0 };
}

export function parsearDatosEpic(body: unknown): EpicDatosExtension {
  if (!esObjeto(body)) throw new EpicPayloadError("Datos de Epic no válidos.");

  const epicAccountId = typeof body.epicAccountId === "string" ? body.epicAccountId.trim().toLowerCase() : "";
  if (!ACCOUNT_ID_RE.test(epicAccountId)) throw new EpicPayloadError("Falta el ID de tu cuenta de Epic (abre tu página «Mis logros»).");

  if (!Array.isArray(body.resumenes)) throw new EpicPayloadError("Faltan los juegos de tu biblioteca de Epic.");
  if (body.resumenes.length > MAX_JUEGOS) throw new EpicPayloadError("Demasiados juegos en una sola sincronización.");
  const resumenes = body.resumenes.map(resumen).filter((r): r is AchievementsSummaryEntry => r !== null);

  const permitidos = new Set(resumenes.map((r) => r.sandboxId));
  const detalles: EpicDatosExtension["detalles"] = new Map();
  const crudos = Array.isArray(body.detalles) ? body.detalles.slice(0, MAX_DETALLES) : [];
  for (const d of crudos) {
    if (!esObjeto(d)) continue;
    const sandboxId = texto(d.sandboxId, 80);
    // Solo de juegos que están en la biblioteca enviada: nada suelto.
    if (!sandboxId || !permitidos.has(sandboxId) || detalles.has(sandboxId)) continue;
    const catalogo = new Map(
      (Array.isArray(d.catalogo) ? d.catalogo.slice(0, MAX_LOGROS_POR_JUEGO) : []).map(definicion).filter((x): x is [string, CatalogAchievement] => x !== null),
    );
    const jugador = (Array.isArray(d.jugador) ? d.jugador.slice(0, MAX_LOGROS_POR_JUEGO) : []).map(logroJugador).filter((x): x is PlayerAchievementEntry => x !== null);
    detalles.set(sandboxId, { catalogo, jugador });
  }

  return {
    epicAccountId,
    displayName: texto(body.displayName, 80) ?? epicAccountId,
    avatarUrl: imagenDeEpic(body.avatarUrl) ?? null,
    resumenes,
    detalles,
  };
}
