"use client";

import { useMemo, useState } from "react";
import { PLATFORM_LABEL, type Platform } from "@/lib/types";

/**
 * Buscador + filtro de plataforma sobre una lista de "juegos en común",
 * como render-prop: cada comparador pinta sus filas a su manera (el de
 * grupo, una tabla; el de dos, tarjetas con quién va ganando), pero el
 * filtro es el mismo buscador + pastillas de plataforma en los dos sitios.
 */
export function FiltroJuegosComunes<T extends { platform: Platform; title: string }>({
  juegos,
  children,
  vacioMensaje = "Ningún juego en común todavía.",
}: {
  juegos: T[];
  children: (visibles: T[]) => React.ReactNode;
  /** Cuando `juegos` ya viene vacío — distinto de "los filtros no dejan nada". */
  vacioMensaje?: string;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [plataforma, setPlataforma] = useState<Platform | "todas">("todas");

  const plataformasPresentes = useMemo(() => [...new Set(juegos.map((g) => g.platform))], [juegos]);

  const visibles = useMemo(() => {
    const needle = busqueda.trim().toLowerCase();
    return juegos.filter((g) => {
      if (plataforma !== "todas" && g.platform !== plataforma) return false;
      if (needle && !g.title.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [juegos, busqueda, plataforma]);

  return (
    <>
      {(plataformasPresentes.length > 1 || juegos.length > 5) && (
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <div
            className="flex min-w-[200px] flex-1 items-center gap-2.5 rounded-xl px-3.5"
            style={{ border: "1px solid var(--border)", background: "var(--background)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por título…"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-foreground outline-none placeholder:text-muted"
            />
          </div>

          {plataformasPresentes.length > 1 && (
            <div className="inline-flex gap-1.5 rounded-xl p-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <button
                onClick={() => setPlataforma("todas")}
                className="rounded-[9px] px-3 py-1.5 text-xs font-semibold transition-colors hover:text-foreground"
                style={plataforma === "todas" ? { background: "var(--accent-grad)", color: "#061021" } : { color: "var(--muted)" }}
              >
                Todas
              </button>
              {plataformasPresentes.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlataforma(p)}
                  className="rounded-[9px] px-3 py-1.5 text-xs font-semibold transition-colors hover:text-foreground"
                  style={plataforma === p ? { background: "var(--accent-grad)", color: "#061021" } : { color: "var(--muted)" }}
                >
                  {PLATFORM_LABEL[p]}
                </button>
              ))}
            </div>
          )}

          {(busqueda || plataforma !== "todas") && (
            <span className="text-[13px] text-muted">{visibles.length} de {juegos.length}</span>
          )}
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          {juegos.length === 0 ? vacioMensaje : "Ningún juego con esos filtros."}
        </p>
      ) : (
        children(visibles)
      )}
    </>
  );
}
