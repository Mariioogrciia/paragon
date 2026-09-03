"use client";

import { useMemo, useState } from "react";
import { coverGradient } from "@/lib/design";
import { PLATFORM_LABEL, type Platform } from "@/lib/types";
import type { SharedGame } from "@/lib/stats";

/**
 * La lista de juegos en común, con buscador y filtro de plataforma.
 *
 * Cliente y no servidor porque con el grupo puesto en la URL (`?con=...`) no
 * hay sitio limpio para además llevar el filtro sin perderlo al cambiarlo —
 * el mismo motivo por el que la biblioteca (`LibraryGrid`) filtra en el
 * navegador y no por parámetros de búsqueda.
 */
export function CompararFiltrable({
  comunes,
  participantes,
}: {
  comunes: SharedGame[];
  participantes: { userId: string; nombre: string; esMio: boolean }[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [plataforma, setPlataforma] = useState<Platform | "todas">("todas");

  const plataformasPresentes = useMemo(() => {
    const set = new Set(comunes.map((g) => g.platform));
    return [...set];
  }, [comunes]);

  const visibles = useMemo(() => {
    const needle = busqueda.trim().toLowerCase();
    return comunes.filter((g) => {
      if (plataforma !== "todas" && g.platform !== plataforma) return false;
      if (needle && !g.title.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [comunes, busqueda, plataforma]);

  return (
    <div className="mt-5">
      {(plataformasPresentes.length > 1 || comunes.length > 5) && (
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
            <span className="text-[13px] text-muted">{visibles.length} de {comunes.length}</span>
          )}
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          Ningún juego con esos filtros.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            <div
              className="grid items-center gap-2.5 pb-2.5"
              style={{ gridTemplateColumns: `220px repeat(${participantes.length}, 100px)` }}
            >
              <span />
              {participantes.map((p) => (
                <span
                  key={p.userId}
                  className="truncate text-center text-[11px] font-bold uppercase tracking-[0.08em] text-muted"
                  title={p.nombre}
                >
                  {p.esMio ? "Tú" : p.nombre}
                </span>
              ))}
            </div>

            {visibles.map((juego) => (
              <div
                key={juego.id}
                className="grid items-center gap-2.5 border-b border-border py-3 last:border-0"
                style={{ gridTemplateColumns: `220px repeat(${participantes.length}, 100px)` }}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-cover bg-center"
                    style={{ background: juego.iconUrl ? `url(${juego.iconUrl}) center/cover` : coverGradient(juego.id) }}
                  />
                  <span className="truncate text-[13px] font-semibold" title={juego.title}>
                    {juego.title}
                  </span>
                </div>

                {juego.progress.map((p, i) => (
                  <div key={participantes[i].userId} className="flex flex-col items-center gap-1.5">
                    <span className="text-[13px] font-semibold">{p.percent}%</span>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full" style={{ width: `${p.percent}%`, background: "var(--accent-grad-h)" }} />
                    </div>
                    {juego.horas[i] !== undefined && (
                      <span className="text-[10px] text-muted">{juego.horas[i]!.toFixed(0)} h</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
