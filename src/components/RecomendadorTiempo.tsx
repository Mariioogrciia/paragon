"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { sugerirPorTiempo, type SugerenciaTiempo } from "@/lib/recomendadorTiempo";
import { CATEGORIAS_GENERO, type CategoriaDna } from "@/lib/trophyDna";
import type { Game } from "@/lib/types";

const OPCIONES = [
  { valor: 0.5, label: "30 min" },
  { valor: 1, label: "1h" },
  { valor: 1.5, label: "1h 30" },
  { valor: 2, label: "2h" },
  { valor: 3, label: "3h+" },
];

function Tarjeta({ s }: { s: SugerenciaTiempo }) {
  return (
    <Link
      href={`/juego/${s.gameId}`}
      className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-2"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      {s.iconUrl && <img src={s.iconUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold" title={s.titulo}>{s.titulo}</p>
        <p className="text-xs text-muted">{s.motivo}</p>
      </div>
    </Link>
  );
}

/**
 * "Tengo X horas hoy" — el cálculo vive en lib/recomendadorTiempo.ts (pura,
 * sin `server-only`, a propósito: así corre aquí mismo en el navegador al
 * cambiar de opción, sin ida y vuelta al servidor por cada clic). Solo se le
 * pasan los juegos empezados y sin terminar — nada de biblioteca entera — ya
 * filtrados en el servidor.
 */
export function RecomendadorTiempo({ juegos }: { juegos: Game[] }) {
  const [horas, setHoras] = useState(1);
  const [genero, setGenero] = useState<CategoriaDna | null>(null);
  const { victoriasRapidas, paraProfundizar } = useMemo(
    () => sugerirPorTiempo(juegos, horas, genero ?? undefined),
    [juegos, horas, genero],
  );

  if (juegos.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-1 font-heading text-xl font-bold uppercase tracking-wide">¿Hoy qué juego?</h2>
      <p className="mb-4 text-sm text-muted">Di cuánto tiempo tienes (y de qué tipo, si te apetece algo concreto) y te decimos qué puedes cerrar de verdad.</p>

      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {OPCIONES.map((o) => (
          <button
            key={o.valor}
            onClick={() => setHoras(o.valor)}
            className="rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors"
            style={
              horas === o.valor
                ? { background: "rgb(var(--accent-rgb) / 0.16)", border: "1px solid rgb(var(--accent-rgb) / 0.4)", color: "var(--accent-text)" }
                : { border: "1px solid var(--border)", color: "var(--muted)" }
            }
          >
            Tengo {o.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => setGenero(null)}
          className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
          style={
            genero === null
              ? { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }
              : { border: "1px solid transparent", color: "var(--muted)" }
          }
        >
          Cualquier tipo
        </button>
        {CATEGORIAS_GENERO.map((c) => (
          <button
            key={c.key}
            onClick={() => setGenero(genero === c.key ? null : c.key)}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
            style={
              genero === c.key
                ? { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }
                : { border: "1px solid transparent", color: "var(--muted)" }
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      {victoriasRapidas.length === 0 && paraProfundizar.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
          {genero ? "Nada de ese tipo que encaje ahora mismo — prueba con otro género o quita el filtro." : "Nada que encaje ahora mismo — empieza algo nuevo, o pon datos de HLTB en más juegos empezados."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {victoriasRapidas.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Victorias rápidas</h3>
              <div className="flex flex-col gap-2">
                {victoriasRapidas.map((s) => <Tarjeta key={s.gameId} s={s} />)}
              </div>
            </div>
          )}
          {paraProfundizar.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Para profundizar</h3>
              <div className="flex flex-col gap-2">
                {paraProfundizar.map((s) => <Tarjeta key={s.gameId} s={s} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
