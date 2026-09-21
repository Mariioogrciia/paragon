import type { ParagonProgress } from "@/lib/level";
import { getTranslations } from "next-intl/server";

const ITEMS = [
  { key: "trofeos", color: "var(--accent)" },
  { key: "platinos", color: "var(--platinum)" },
  { key: "juegosCompletados", color: "var(--gold)" },
] as const;

export async function ParagonLevelCard({ progress }: { progress: ParagonProgress }) {
  const t = await getTranslations("Perfil");
  const percent = progress.progreso / 100;
  const degrees = Math.round(percent * 360);
  const ITEM_LABELS: Record<(typeof ITEMS)[number]["key"], string> = {
    trofeos: t("ParagonLevelCard.itemTrofeos"),
    platinos: t("ParagonLevelCard.itemPlatinos"),
    juegosCompletados: t("ParagonLevelCard.itemJuegosCompletados"),
  };

  return (
    <details id="nivel-paragon" className="group rounded-[18px] border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-4 p-5 [&::-webkit-details-marker]:hidden">
        <div
          className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(var(--accent) 0deg ${degrees}deg, var(--surface-2) ${degrees}deg 360deg)` }}
        >
          <span className="flex h-[60px] w-[60px] flex-col items-center justify-center rounded-full bg-background">
            <span className="font-heading text-2xl font-bold leading-none">{progress.level}</span>
            <span className="mt-1 text-[0.5625rem] font-bold uppercase tracking-wider text-muted">{t("ParagonLevelCard.nivelLabel")}</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-heading text-lg font-bold uppercase tracking-wide">{t("ParagonLevelCard.title")}</h2>
            <span className="text-xs font-semibold text-muted">{t("ParagonLevelCard.xpCompact", { xp: progress.xp.toLocaleString("es-ES") })}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress.progreso}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {progress.restante === 0
              ? t("ParagonLevelCard.maxLevelReached")
              : t("ParagonLevelCard.xpToNextLevel", { xp: progress.restante.toLocaleString("es-ES"), level: progress.siguienteNivel })}
          </p>
        </div>
        <span className="text-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
      </summary>

      <div className="border-t border-border px-5 pb-5 pt-4">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[140px_1fr] sm:items-center">
          <div
            className="mx-auto flex h-[124px] w-[124px] items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(var(--accent) 0deg ${Math.round((progress.breakdown.trofeos / Math.max(progress.breakdown.total, 1)) * 360)}deg, var(--platinum) ${Math.round((progress.breakdown.trofeos / Math.max(progress.breakdown.total, 1)) * 360)}deg ${Math.round(((progress.breakdown.trofeos + progress.breakdown.platinos) / Math.max(progress.breakdown.total, 1)) * 360)}deg, var(--gold) ${Math.round(((progress.breakdown.trofeos + progress.breakdown.platinos) / Math.max(progress.breakdown.total, 1)) * 360)}deg 360deg)`,
            }}
          >
            <span className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-surface text-center">
              <span className="font-heading text-xl font-bold">{progress.xp.toLocaleString("es-ES")}<small className="block text-[0.5625rem] uppercase tracking-wider text-muted">{t("ParagonLevelCard.xpTotalLabel")}</small></span>
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">{t("ParagonLevelCard.xpSourceHeading")}</p>
            {ITEMS.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{ITEM_LABELS[item.key]}</span>
                <strong>{t("ParagonLevelCard.xpCompact", { xp: progress.breakdown[item.key].toLocaleString("es-ES") })}</strong>
              </div>
            ))}
            <p className="pt-2 text-xs leading-relaxed text-muted">{t("ParagonLevelCard.xpExplanation")}</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted">{t("ParagonLevelCard.footerHelp")}</p>
      </div>
    </details>
  );
}
