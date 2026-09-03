"use client";

import { ACENTOS, ESTILOS, MODOS, TEMAS, useApariencia } from "@/lib/apariencia";

/**
 * Panel de apariencia de verdad, para /ajustes/apariencia. Antes esto vivía
 * apretado en el desplegable de la navbar (ThemeCustomizer.tsx) — con 8
 * estilos + 5 acentos + color libre + 4 temas ya no cabía cómodo en un menú
 * de 224px, así que se trasladó aquí. El icono de la navbar ahora es solo un
 * enlace a esta página.
 */
export function AppearanceSettings() {
  const {
    montado,
    theme,
    setTheme,
    acento,
    acentoLibre,
    estilo,
    elegirAcento,
    elegirAcentoLibre,
    elegirEstilo,
    elegirTema,
  } = useApariencia();

  if (!montado) return null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold mb-2">Apariencia</h1>
        <p className="text-sm text-muted">
          Cómo ves tú la aplicación en este navegador — no cambia lo que ven los demás.
        </p>
      </div>

      <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
        <h2 className="font-semibold mb-4">Modo</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MODOS.map((m) => (
            <button
              key={m.value}
              onClick={() => setTheme(m.value)}
              className="rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
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
      </section>

      <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
        <h2 className="font-semibold mb-4">Acento</h2>
        <div className="flex flex-wrap items-center gap-3">
          {ACENTOS.map((a) => (
            <button
              key={a.label}
              onClick={() => elegirAcento(a.value)}
              title={a.label}
              aria-label={a.label}
              aria-pressed={acento === a.value && !acentoLibre}
              className="h-10 w-10 rounded-full transition-transform hover:scale-110"
              style={{
                background: a.color,
                outline: acento === a.value && !acentoLibre ? "2px solid var(--foreground)" : "none",
                outlineOffset: 2,
              }}
            />
          ))}
          <label
            title="Color libre"
            aria-label="Color libre"
            className="relative h-10 w-10 shrink-0 cursor-pointer rounded-full transition-transform hover:scale-110"
            style={{
              background: acentoLibre || "conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red)",
              outline: acentoLibre ? "2px solid var(--foreground)" : "none",
              outlineOffset: 2,
            }}
          >
            <input
              type="color"
              value={acentoLibre || "#4a9eff"}
              onChange={(e) => elegirAcentoLibre(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
          <span className="text-xs text-muted">Color libre</span>
        </div>
      </section>

      <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
        <h2 className="font-semibold mb-1">Estilo</h2>
        <p className="mb-4 text-xs text-muted">
          No solo el color — el radio de esquina, la sombra, la tipografía y hasta el fondo cambian según el estilo.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ESTILOS.map((e) => (
            <button
              key={e.value || "clasico"}
              onClick={() => elegirEstilo(e.value)}
              title={e.desc}
              className="rounded-xl px-3 py-3 text-left text-sm font-semibold transition-colors"
              style={
                estilo === e.value
                  ? { background: "var(--accent)", color: "#061021" }
                  : { background: "var(--surface-2)", color: "var(--muted)" }
              }
            >
              {e.label}
              <span className="mt-0.5 block text-[11px] font-normal opacity-80">{e.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[18px] p-6 border border-white/10 bg-surface-2/30">
        <h2 className="font-semibold mb-1">Temas</h2>
        <p className="mb-4 text-xs text-muted">Combos de un clic: modo + acento + estilo a la vez.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TEMAS.map((t) => (
            <button
              key={t.label}
              onClick={() => elegirTema(t)}
              className="rounded-xl px-3 py-3 text-sm font-semibold transition-colors hover:text-foreground"
              style={{ background: "var(--surface-2)", color: "var(--muted)" }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
