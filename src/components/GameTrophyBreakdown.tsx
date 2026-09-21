import { Trophy, Award } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TrophyBreakdown } from "@/lib/community";
import { PLATFORM_LABEL } from "@/lib/types";

/**
 * Cuántos logros define cada versión de este juego, una fila por
 * plataforma en la que existe (ver el comentario de `getGameTrophyBreakdown`
 * en lib/community.ts). Los "puntos de nivel PSN" solo salen donde
 * significan algo de verdad — Steam no tiene un sistema de puntos por
 * logro, así que ahí no se enseña ningún número inventado.
 */
export async function GameTrophyBreakdown({ breakdown }: { breakdown: TrophyBreakdown[] }) {
  if (breakdown.length === 0) return null;

  const t = await getTranslations("Biblioteca");

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[0.9375rem] font-bold">{t("GameTrophyBreakdown.title")}</h3>
      </div>
      <p className="mb-4 text-xs text-muted">{t("GameTrophyBreakdown.subtitle")}</p>
      <div className="flex flex-col gap-1 rounded-xl bg-muted/10 p-2 border border-border/50">
        {breakdown.map((b) => (
          <div key={b.platform} className="flex items-center justify-between py-2 px-3 hover:bg-white/5 rounded-lg transition-colors">
            <span className="font-semibold text-sm">{PLATFORM_LABEL[b.platform as keyof typeof PLATFORM_LABEL] ?? b.platform}</span>
            <div className="flex items-center gap-4 text-xs font-bold text-muted">
              <span className="flex items-center gap-1.5" title={t("GameTrophyBreakdown.trophiesHint")}>
                <Trophy size={12} className="text-foreground" />
                {b.totalTrophies}
              </span>
              {b.totalPoints > 0 && (
                <span className="flex items-center gap-1.5" title={t("GameTrophyBreakdown.pointsHint")}>
                  <Award size={12} className="text-foreground" />
                  {t("GameTrophyBreakdown.levelPoints", { points: b.totalPoints.toLocaleString() })}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
