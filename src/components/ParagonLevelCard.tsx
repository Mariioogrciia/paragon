import type { ParagonProgress } from "@/lib/level";

const ITEMS = [
  { key: "trofeos", label: "Trofeos", color: "var(--accent)" },
  { key: "platinos", label: "Platinos", color: "var(--platinum)" },
  { key: "juegosCompletados", label: "Juegos completados", color: "var(--gold)" },
] as const;

export function ParagonLevelCard({ progress }: { progress: ParagonProgress }) {
  const percent = progress.progreso / 100;
  const degrees = Math.round(percent * 360);

  return (
    <details id="nivel-paragon" className="group rounded-[18px] border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-4 p-5 [&::-webkit-details-marker]:hidden">
        <div
          className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(var(--accent) 0deg ${degrees}deg, var(--surface-2) ${degrees}deg 360deg)` }}
        >
          <span className="flex h-[60px] w-[60px] flex-col items-center justify-center rounded-full bg-background">
            <span className="font-heading text-2xl font-bold leading-none">{progress.level}</span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted">Nivel</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Nivel Paragon</h2>
            <span className="text-xs font-semibold text-muted">{progress.xp.toLocaleString("es-ES")} XP</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress.progreso}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {progress.restante === 0
              ? "Has alcanzado el nivel máximo de este tramo."
              : `${progress.restante.toLocaleString("es-ES")} XP para el nivel ${progress.siguienteNivel}`}
          </p>
        </div>
        <span className="text-muted transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
      </summary>

      <div className="border-t border-border px-5 pb-5 pt-4">
        <div className="grid gap-5 sm:grid-cols-[140px_1fr] sm:items-center">
          <div
            className="mx-auto flex h-[124px] w-[124px] items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(var(--accent) 0deg ${Math.round((progress.breakdown.trofeos / Math.max(progress.breakdown.total, 1)) * 360)}deg, var(--platinum) ${Math.round((progress.breakdown.trofeos / Math.max(progress.breakdown.total, 1)) * 360)}deg ${Math.round(((progress.breakdown.trofeos + progress.breakdown.platinos) / Math.max(progress.breakdown.total, 1)) * 360)}deg, var(--gold) ${Math.round(((progress.breakdown.trofeos + progress.breakdown.platinos) / Math.max(progress.breakdown.total, 1)) * 360)}deg 360deg)`,
            }}
          >
            <span className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-surface text-center">
              <span className="font-heading text-xl font-bold">{progress.xp.toLocaleString("es-ES")}<small className="block text-[9px] uppercase tracking-wider text-muted">XP total</small></span>
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">De dónde sale tu XP</p>
            {ITEMS.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.label}</span>
                <strong>{progress.breakdown[item.key].toLocaleString("es-ES")} XP</strong>
              </div>
            ))}
            <p className="pt-2 text-xs leading-relaxed text-muted">Cada trofeo aporta XP según su rareza: bronce 10, plata 25, oro 50 y platino 200. Completar un juego añade 100 XP.</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted">El círculo superior muestra cuánto has avanzado dentro del nivel actual. Abre esta sección para consultar el desglose y lo que te falta.</p>
      </div>
    </details>
  );
}
