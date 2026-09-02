"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Panel de personalización: modo base y color de acento.
 *
 * El modo lo lleva next-themes (clase en <html>). El acento lo llevamos
 * nosotros, porque next-themes solo gestiona un eje y aquí hay dos: se puede
 * querer OLED con acento verde igual que claro con acento morado.
 */

const MODOS = [
  { value: "dark", label: "Oscuro" },
  { value: "light", label: "Claro" },
  { value: "oled", label: "OLED" },
  { value: "high-contrast", label: "Contraste" },
] as const;

const ACENTOS = [
  { value: "", label: "Azul", color: "#4a9eff" },
  { value: "accent-violet", label: "Morado", color: "#8b5cf6" },
  { value: "accent-red", label: "Rojo", color: "#ef4444" },
  { value: "accent-green", label: "Verde", color: "#10b981" },
  { value: "accent-orange", label: "Naranja", color: "#f59e0b" },
] as const;

const CLAVE_ACENTO = "platinos:acento";

/** Aplica la clase de acento al <html>, quitando la anterior. */
function aplicarAcento(clase: string) {
  const html = document.documentElement;
  for (const a of ACENTOS) if (a.value) html.classList.remove(a.value);
  if (clase) html.classList.add(clase);
}

export function ThemeCustomizer() {
  const { theme, setTheme } = useTheme();
  const [abierto, setAbierto] = useState(false);
  const [acento, setAcento] = useState("");
  const [montado, setMontado] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  // El tema real solo se conoce en el cliente: pintarlo antes daría un desajuste
  // entre lo que renderiza el servidor y lo que ve el navegador.
  useEffect(() => {
    setMontado(true);
    const guardado = localStorage.getItem(CLAVE_ACENTO) ?? "";
    setAcento(guardado);
    aplicarAcento(guardado);
  }, []);

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (panel.current && !panel.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  function elegirAcento(valor: string) {
    setAcento(valor);
    aplicarAcento(valor);
    localStorage.setItem(CLAVE_ACENTO, valor);
  }

  return (
    <div className="relative" ref={panel}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label="Personalizar apariencia"
        aria-expanded={abierto}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:text-foreground"
        style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z" />
        </svg>
      </button>

      {abierto && montado && (
        <div
          className="absolute right-0 z-50 mt-2 w-56 rounded-xl p-4 shadow-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Modo</p>
          <div className="mb-4 grid grid-cols-2 gap-1.5">
            {MODOS.map((m) => (
              <button
                key={m.value}
                onClick={() => setTheme(m.value)}
                className="rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors"
                style={
                  theme === m.value
                    ? { background: "var(--accent)", color: "#061021" }
                    : { background: "var(--surface-2)", color: "var(--muted)" }
                }
              >
                {m.label}
              </button>
            ))}
          </div>

          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Acento</p>
          <div className="flex gap-2">
            {ACENTOS.map((a) => (
              <button
                key={a.label}
                onClick={() => elegirAcento(a.value)}
                title={a.label}
                aria-label={a.label}
                aria-pressed={acento === a.value}
                className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                style={{
                  background: a.color,
                  outline: acento === a.value ? "2px solid var(--foreground)" : "none",
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
