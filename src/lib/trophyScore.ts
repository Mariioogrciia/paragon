import { XP_POR_GRADO } from "@/lib/level";
import type { TrophyGrade } from "@/lib/types";

/**
 * La fórmula en sí de "Paragon Score" (puntuación unificada entre
 * plataformas) — sin "server-only" a propósito, a diferencia de
 * `lib/paragonScore.ts` (que sí lo necesita, porque consulta la base): esta
 * parte es pura, y la necesita tanto el servidor (para el total del perfil)
 * como componentes de cliente como TrophyList (para enseñar el XP de un
 * trofeo suelto).
 *
 * El razonamiento completo — por qué esta escala y no otra, por qué Steam
 * nunca llega al peso de un platino entero — está en lib/paragonScore.ts,
 * que es quien la usa de verdad contra la base de datos.
 */

const STEAM_TRAMOS: { bajo: number; xp: number }[] = [
  { bajo: 40, xp: 10 },
  { bajo: 20, xp: 25 },
  { bajo: 5, xp: 50 },
  { bajo: 0, xp: 100 },
];

/** Exportada porque lib/profiles.ts (getLibrary) también la necesita para
 * el XP de nivel Paragon de los logros de Steam — ver Game.steamTrophyXp. */
export function xpSteamPorRareza(rarityPercent: number | null | undefined): number {
  if (rarityPercent == null) return STEAM_TRAMOS[0].xp;
  for (const tramo of STEAM_TRAMOS) {
    if (rarityPercent >= tramo.bajo) return tramo.xp;
  }
  return STEAM_TRAMOS[STEAM_TRAMOS.length - 1].xp;
}

export function trophyScore({
  platform,
  grade,
  xp,
  rarityPercent,
}: {
  platform: string;
  grade?: TrophyGrade | null;
  xp?: number | null;
  rarityPercent?: number | null;
}): number {
  if (platform === "psn" && grade) return XP_POR_GRADO[grade];
  if (platform === "xbox") return xp ?? 15;
  if (platform === "steam") return xpSteamPorRareza(rarityPercent);
  return 10;
}
