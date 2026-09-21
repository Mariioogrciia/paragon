import { getTranslations } from "next-intl/server";
import type { WeeklyMission } from "@/lib/missions";

export async function WeeklyMissions({ missions }: { missions: WeeklyMission[] }) {
  const t = await getTranslations("Descubrir.WeeklyMissions");
  const completadas = missions.filter((mission) => mission.progress >= mission.target).length;
  const xp = missions.filter((mission) => mission.progress >= mission.target).reduce((total, mission) => total + mission.xp, 0);

  return (
    <section className="rounded-[18px] border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-heading text-xl font-bold uppercase tracking-wide">{t("titulo")}</h2>
          <p className="mt-1 text-sm text-muted">{t("subtitulo")}</p>
        </div>
        <span className="text-xs font-semibold text-muted">{t("contador", { completadas, total: missions.length, xp })}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {missions.map((mission) => {
          const completada = mission.progress >= mission.target;
          const porcentaje = Math.min(100, Math.round((mission.progress / mission.target) * 100));
          return (
            <div key={mission.id} className="rounded-xl border border-border p-3" style={{ opacity: completada ? 1 : 0.78 }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold">{mission.title}</h3>
                  <p className="mt-1 text-xs text-muted">{mission.description}</p>
                </div>
                <span className="shrink-0 text-xs font-bold" style={{ color: completada ? "var(--good)" : "var(--accent-text)" }}>
                  {completada ? t("completada") : t("progreso", { actual: Math.min(mission.progress, mission.target), total: mission.target })}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${porcentaje}%`, background: completada ? "var(--good)" : "var(--accent-grad-h)" }} /></div>
                <span className="text-[0.625rem] font-bold text-muted">+{mission.xp} XP</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
