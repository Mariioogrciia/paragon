import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getProfileByUserId, getUserBadges } from "@/lib/profiles";
import { getUserTrophyCase } from "@/lib/trophyCase";
import { BADGE_DEFINITIONS } from "@/components/Badges";
import { jsonConEtag } from "@/lib/etag";
import { errorMovil } from "@/lib/mensajesApi";

/**
 * Palmarés (ligas ganadas) + Badges/insignias del usuario — nada de esto
 * tenía endpoint móvil todavía, pese a llevar tiempo en la web (ver
 * components/Badges.tsx, lib/trophyCase.ts). Un solo endpoint para las dos
 * cosas: son datos de solo lectura, pequeños, y siempre se enseñan juntos
 * en el mismo sitio del perfil.
 *
 * `name`/`description` de cada badge van resueltos en español (no una clave
 * de traducción) — el resto de `api/mobile/*` hace lo mismo, la app Android
 * todavía no tiene i18n.
 */
export async function GET(req: Request) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return errorMovil(req, "No autenticado", 401);
  }

  const profile = await getProfileByUserId(userId);
  if (!profile?.handle) {
    return errorMovil(req, "Perfil sin terminar de configurar", 409);
  }

  const [badgeRows, trophyCase] = await Promise.all([
    getUserBadges(userId),
    getUserTrophyCase(userId),
  ]);

  const badges = badgeRows
    .map((b) => {
      const def = BADGE_DEFINITIONS[b.badgeId];
      if (!def) return null;
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        earnedAt: b.earnedAt.toISOString(),
      };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  return jsonConEtag(req, { badges, trophyCase }, userId);
}
