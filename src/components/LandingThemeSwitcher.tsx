"use client";

import { useApariencia } from "@/lib/apariencia";

export function LandingThemeSwitcher() {
  const { elegirEstilo, estilo, montado } = useApariencia();

  if (!montado) return null;

  const DEMO_STYLES = [
    { id: "", label: "Clásico", icon: "🎮" },
    { id: "estilo-brutalista", label: "Brutalista", icon: "🧱" },
    { id: "estilo-ps5", label: "Consola", icon: "🌊" },
    { id: "estilo-terminal", label: "Hacker", icon: "💻" },
  ];

  return (
    <div className="mt-14 rounded-2xl p-6 text-center" style={{ border: "1px solid rgb(var(--accent-rgb) / 0.15)", background: "linear-gradient(rgba(255,255,255,0.02), transparent)" }}>
      <p className="mb-5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
        Personalización total. Cambia la web a tu gusto.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {DEMO_STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => elegirEstilo(s.id)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300 hover:-translate-y-1"
            style={
              estilo === s.id
                ? { background: "var(--accent)", color: "#061021", boxShadow: "0 8px 24px rgb(var(--accent-rgb) / 0.4)" }
                : { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--muted)" }
            }
          >
            <span aria-hidden="true" className="opacity-80">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
