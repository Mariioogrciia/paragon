import { AchievementIcon } from "./AchievementIcon";
import { getTranslations } from "next-intl/server";
import { LOGROS } from "@/lib/logros";
import textosEs from "../../messages/Perfil/es.json";

type BadgeDef = {
  id: string;
  name: string;
  description: string;
  bg: string;
};

/**
 * Nombre/descripción en español resueltos (no claves de traducción) para
 * quien no pasa por next-intl: la API móvil (`/api/mobile/achievements`) y
 * las sugerencias de título de `ProfileForm`. Sale del catálogo único
 * (lib/logros.ts) y de los mismos textos que la web.
 */
const TEXTOS = textosEs.Badges.items as Record<string, { name: string; description: string }>;

export const BADGE_DEFINITIONS: Record<string, BadgeDef> = Object.fromEntries(
  LOGROS.map((logro) => [
    logro.id,
    { id: logro.id, name: TEXTOS[logro.id]?.name ?? logro.id, description: TEXTOS[logro.id]?.description ?? "", bg: logro.bg },
  ]),
);

export async function Badges({ earnedBadges }: { earnedBadges: { badgeId: string, earnedAt: Date }[] }) {
  if (earnedBadges.length === 0) return null;

  const t = await getTranslations("Perfil");

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {earnedBadges.map(({ badgeId }) => {
        const badge = BADGE_DEFINITIONS[badgeId];
        if (!badge) return null;

        return (
          <div
            key={badge.id}
            className="group relative flex h-8 w-8 items-center justify-center rounded-full border border-white/10 shadow-sm cursor-help transition-transform hover:scale-110 hover:z-50"
            style={{ background: badge.bg }}
          >
            <span className="drop-shadow-md text-sm text-white">
              <AchievementIcon id={badge.id} size={16} />
            </span>

            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg px-3 py-2 shadow-xl group-hover:block"
                 style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <p className="text-[0.8125rem] font-bold text-foreground">{t(`Badges.items.${badge.id}.name`)}</p>
              <p className="text-[0.6875rem] text-muted mt-0.5">{t(`Badges.items.${badge.id}.description`)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
