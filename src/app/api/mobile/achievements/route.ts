import { NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobileAuth";
import { getProfileByUserId, getUserBadges } from "@/lib/profiles";
import { getUserTrophyCase } from "@/lib/trophyCase";
import { BADGE_DEFINITIONS } from "@/components/Badges";

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
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const profile = await getProfileByUserId(userId);
  if (!profile?.handle) {
    return NextResponse.json({ error: "Perfil sin terminar de configurar" }, { status: 409 });
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

  return NextResponse.json({ badges, trophyCase });
}
