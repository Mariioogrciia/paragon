import type { GameStatus } from "@/lib/stats";

const STATUS: Record<GameStatus, { label: string; bg: string; fg: string; border: string }> = {
  platinado: { label: "Platinado", bg: "rgba(159, 212, 236, 0.14)", fg: "#9fd4ec", border: "rgba(159, 212, 236, 0.32)" },
  completado: { label: "Al 100%", bg: "rgba(226, 181, 62, 0.14)", fg: "#e2b53e", border: "rgba(226, 181, 62, 0.32)" },
  "en-curso": { label: "En curso", bg: "rgb(var(--accent-rgb) / 0.14)", fg: "#7ab8ff", border: "rgb(var(--accent-rgb) / 0.32)" },
  "sin-empezar": { label: "Sin empezar", bg: "rgba(135, 148, 168, 0.12)", fg: "var(--muted)", border: "rgba(135, 148, 168, 0.25)" },
};

/** Etiqueta de estado de un juego, con los mismos tres colores en toda la app. */
export function StatusBadge({ status }: { status: GameStatus }) {
  const s = STATUS[status];

  return (
    <span
      className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ background: s.bg, color: s.fg, borderColor: s.border }}
    >
      {s.label}
    </span>
  );
}

/** Etiqueta de rareza ("Muy raro · 18,4%"), usada junto a los próximos trofeos. */
export function RarityTag({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: bg, color: fg }}
    >
      {label}
    </span>
  );
}
