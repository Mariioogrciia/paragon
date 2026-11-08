"use client";

/* eslint-disable @next/next/no-img-element -- carátulas de CDNs externos (PSN, Steam...), como en el resto del panel */
import { useState } from "react";
import Link from "@/components/Enlace";
import { coverGradient } from "@/lib/design";

export interface FilaPlatinable {
  id: string;
  titulo: string;
  iconUrl: string | null;
  percent: number;
  href: string;
  /** "Faltan 3" / "1 logro para el 100 %": ya traducido en el servidor. */
  faltan: string;
  /** "Jugado hace 3 días", "~6 h": lo que haya, ya traducido. */
  extra: string[];
}

/**
 * «A un paso del platino» del panel (8 nov 2026, lib/platinables.ts): dos
 * pestañas, lo que menos te queda y lo que estás jugando, con más juegos que
 * antes (eran 3). Los textos llegan traducidos del servidor (app/(app)/page.tsx).
 */
export function PlatinablesPanel({
  cerca,
  jugando,
  textos,
}: {
  cerca: FilaPlatinable[];
  jugando: FilaPlatinable[];
  textos: { cerca: string; jugando: string; descCerca: string; descJugando: string; vacioJugando: string; verMas: string; verMenos: string };
}) {
  const [pestana, setPestana] = useState<"cerca" | "jugando">(cerca.length > 0 ? "cerca" : "jugando");
  const [todos, setTodos] = useState(false);
  const lista = pestana === "cerca" ? cerca : jugando;
  const visibles = todos ? lista : lista.slice(0, 6);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["cerca", "jugando"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setPestana(p);
              setTodos(false);
            }}
            aria-pressed={pestana === p}
            className="rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors"
            style={
              pestana === p
                ? { background: "rgb(var(--accent-rgb) / 0.16)", color: "var(--accent-text)", border: "1px solid rgb(var(--accent-rgb) / 0.4)" }
                : { background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }
            }
          >
            {p === "cerca" ? textos.cerca : textos.jugando} · {(p === "cerca" ? cerca : jugando).length}
          </button>
        ))}
      </div>
      <p className="mb-3 text-[0.8125rem] text-muted">{pestana === "cerca" ? textos.descCerca : textos.descJugando}</p>

      {lista.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-border px-4 py-6 text-center text-sm text-muted">{textos.vacioJugando}</p>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {visibles.map((j) => (
            <li key={j.id}>
              <Link
                href={j.href}
                className="group flex items-center gap-3 rounded-[14px] p-2.5 transition-colors hover:bg-surface-2"
                style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
              >
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px]" style={{ background: coverGradient(j.id) }}>
                  {j.iconUrl && (
                    <img
                      src={j.iconUrl}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.visibility = "hidden";
                      }}
                      className="h-full w-full object-cover"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold group-hover:text-[var(--accent-text)]">{j.titulo}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span className="font-semibold text-platinum">{j.faltan}</span>
                    {j.extra.map((e) => (
                      <span key={e}>· {e}</span>
                    ))}
                  </span>
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full" style={{ width: `${j.percent}%`, background: "var(--accent-grad-h)" }} />
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold" style={{ color: "var(--accent-text)" }}>
                  {j.percent}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {lista.length > 6 && (
        <button type="button" onClick={() => setTodos((v) => !v)} className="mt-3 text-xs font-bold uppercase tracking-wide text-accent hover:underline">
          {todos ? textos.verMenos : textos.verMas.replace("{n}", String(lista.length - 6))}
        </button>
      )}
    </div>
  );
}
