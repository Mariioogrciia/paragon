"use client";

/* eslint-disable @next/next/no-img-element -- carátulas de CDNs externos (PSN, Steam...), como en el resto del panel */
import { useState, useTransition } from "react";
import Link from "@/components/Enlace";
import { coverGradient } from "@/lib/design";
import { cambiarRetiradoAction } from "@/app/actions/retirados";

export interface CazaFila {
  id: string;
  titulo: string;
  iconUrl: string | null;
  percent: number;
  href: string;
  /** "Faltan 3", ya traducido. */
  faltan: string;
  /** "Jugado hace 3 días", "~6 h": lo que haya, ya traducido. */
  extra: string[];
}

/**
 * «Reanuda tus cazas» (12 nov 2026): los juegos que has elegido platinar
 * (marca «caza», lib/retirados.ts), arriba del inicio, en el orden en que los
 * elegiste. Se eligen con 🎯 en la ficha o en «A un paso del platino»; la ×
 * los quita de aquí sin tocar nada más.
 */
export function MisCazas({
  cazas,
  textos,
}: {
  cazas: CazaFila[];
  textos: { titulo: string; sub: string; vacio: string; quitar: string };
}) {
  const [quitadas, setQuitadas] = useState<Set<string>>(() => new Set());
  const [, empezar] = useTransition();
  const lista = cazas.filter((c) => !quitadas.has(c.id));

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
        <h2 className="font-heading text-2xl font-bold">🎯 {textos.titulo}</h2>
        <p className="text-[0.8125rem] text-muted">{textos.sub}</p>
      </div>

      {lista.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-border px-4 py-4 text-sm text-muted">{textos.vacio}</p>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {lista.map((c) => (
            <li key={c.id} className="group/caza relative">
              <button
                type="button"
                onClick={() => {
                  setQuitadas((s) => new Set(s).add(c.id));
                  empezar(() => void cambiarRetiradoAction("caza", c.id, false));
                }}
                title={textos.quitar}
                aria-label={`${textos.quitar}: ${c.titulo}`}
                className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full text-sm text-muted opacity-60 transition-opacity hover:bg-surface-2 hover:text-foreground hover:opacity-100 sm:opacity-0 sm:group-hover/caza:opacity-100"
              >
                ×
              </button>
              <Link
                href={c.href}
                className="group flex h-full items-center gap-3 rounded-[14px] p-2.5 transition-colors hover:bg-surface-2"
                style={{ border: "1px solid rgb(var(--accent-rgb) / 0.35)", background: "var(--surface)" }}
              >
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px]" style={{ background: coverGradient(c.id) }}>
                  {c.iconUrl && (
                    <img
                      src={c.iconUrl}
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
                  <span className="block truncate pr-5 text-sm font-bold group-hover:text-[var(--accent-text)]">{c.titulo}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span className="font-semibold text-platinum">{c.faltan}</span>
                    {c.extra.map((e) => (
                      <span key={e}>· {e}</span>
                    ))}
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="block h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span className="block h-full rounded-full" style={{ width: `${c.percent}%`, background: "var(--accent-grad-h)" }} />
                    </span>
                    <span className="text-xs font-bold" style={{ color: "var(--accent-text)" }}>
                      {c.percent}%
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
