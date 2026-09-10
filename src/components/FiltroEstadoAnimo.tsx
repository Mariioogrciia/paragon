"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ESTADOS_ANIMO, juegosPorEstadoAnimo, type EstadoAnimoKey } from "@/lib/estadoAnimo";
import type { Game } from "@/lib/types";
import { coverGradient } from "@/lib/design";

/**
 * "¿Qué te pide el cuerpo hoy?" — su propia sección pequeña, no otra fila
 * más en el filtro ya cargado de la Biblioteca (LibraryGrid.tsx) — ver el
 * repaso de saturación de esta misma sesión. Cuatro botones grandes, un
 * resultado compacto, nada más.
 */
export function FiltroEstadoAnimo({ games, handle }: { games: Game[]; handle: string }) {
  const [elegido, setElegido] = useState<EstadoAnimoKey | null>(null);

  const resultado = useMemo(() => (elegido ? juegosPorEstadoAnimo(games, elegido).slice(0, 8) : []), [games, elegido]);

  return (
    <section className="rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <h2 className="mb-4 font-heading text-lg font-bold uppercase tracking-wide">¿Qué te pide el cuerpo hoy?</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ESTADOS_ANIMO.map((e) => (
          <button
            key={e.key}
            type="button"
            onClick={() => setElegido((prev) => (prev === e.key ? null : e.key))}
            aria-pressed={elegido === e.key}
            className="flex flex-col items-center gap-1.5 rounded-xl px-3 py-4 text-center transition-all hover:opacity-85"
            style={
              elegido === e.key
                ? { background: "rgb(var(--accent-rgb) / 0.14)", border: "1px solid rgb(var(--accent-rgb) / 0.4)" }
                : { background: "var(--surface-2)", border: "1px solid var(--border)" }
            }
          >
            <span className="text-2xl">{e.emoji}</span>
            <span className="text-xs font-semibold leading-tight">{e.label}</span>
          </button>
        ))}
      </div>

      {elegido && (
        <div className="mt-4">
          {resultado.length === 0 ? (
            <p className="text-sm text-muted">Nada pendiente de ese tipo ahora mismo — tu backlog está limpio en esta categoría.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {resultado.map((g) => (
                <Link
                  key={g.id}
                  href={`/u/${handle}/${g.id}`}
                  className="group w-28 shrink-0 overflow-hidden rounded-xl transition-transform hover:scale-[1.03]"
                  style={{ background: coverGradient(g.id) }}
                >
                  <div className="relative aspect-[3/4] w-full">
                    {g.iconUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.iconUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
                    )}
                  </div>
                  <p className="truncate px-1 py-1.5 text-[0.6875rem] font-semibold">{g.title}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
