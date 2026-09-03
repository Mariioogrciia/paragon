import type { WeeklyMission } from "@/lib/missions";

export function WeeklyMissions({ missions }: { missions: WeeklyMission[] }) {
  const completadas = missions.filter((mission) => mission.progress >= mission.target).length;
  const xp = missions.filter((mission) => mission.progress >= mission.target).reduce((total, mission) => total + mission.xp, 0);

  return (
    <section className="rounded-[18px] border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-heading text-xl font-bold uppercase tracking-wide">Misiones semanales</h2>
          <p className="mt-1 text-sm text-muted">Pequeños objetivos para mantener la caza activa.</p>
        </div>
        <span className="text-xs font-semibold text-muted">{completadas}/{missions.length} · {xp} XP ganados</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
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
                  {completada ? "Completada" : `${Math.min(mission.progress, mission.target)}/${mission.target}`}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${porcentaje}%`, background: completada ? "var(--good)" : "var(--accent-grad-h)" }} /></div>
                <span className="text-[10px] font-bold text-muted">+{mission.xp} XP</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
