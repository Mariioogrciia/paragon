"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Dropdown } from "@/components/Dropdown";
import { TiltCard } from "@/components/TiltCard";
import { coverGradient } from "@/lib/design";
import { toggleGameCollectionAction } from "@/app/actions";
import type { Collection } from "@/lib/collections";
import type { Game } from "@/lib/types";

const ORDENES = [
  { value: "proximidad", label: "Más cerca" },
  { value: "progreso", label: "Más progreso" },
  { value: "horas", label: "Más horas" },
];

function faltan(game: Game): number {
  return Math.max(0, game.definedTotal - game.earnedTotal);
}

/**
 * Plan de platinos: cualquier carpeta puede hacer de plan, elegida a mano
 * (antes se adivinaba por el nombre — "Plan de platinos"/"Objetivos" — así
 * que una carpeta con otro nombre cualquiera no se enteraba de nada).
 *
 * Con "chicha" de verdad, no solo la lista ordenada de siempre: un resumen
 * (juegos, logros pendientes, progreso medio), el próximo objetivo
 * destacado (como "A un paso del platino" del panel, pero sobre esta
 * lista) y quitar del plan sin salir de la página.
 */
export function Planificador({ collections, library, handle }: { collections: Collection[]; library: Game[]; handle: string }) {
  const jugables = useMemo(() => library.filter((g) => !g.isWishlist), [library]);

  const [collectionId, setCollectionId] = useState(() => {
    const porNombre = collections.find((c) => /plan|objetiv|platino/i.test(c.name));
    const conJuegos = collections.find((c) => c.gameIds.length > 0);
    return porNombre?.id ?? conJuegos?.id ?? collections[0]?.id ?? "";
  });
  const [sort, setSort] = useState<"proximidad" | "horas" | "progreso">("proximidad");

  const carpeta = collections.find((c) => c.id === collectionId);
  const objetivos = carpeta ? jugables.filter((g) => carpeta.gameIds.includes(g.id)) : [];

  const ordered = useMemo(
    () =>
      [...objetivos].sort((a, b) => {
        if (sort === "horas") return (b.playtimeMinutes ?? 0) - (a.playtimeMinutes ?? 0);
        if (sort === "progreso") return b.progressPercent - a.progressPercent;
        return faltan(a) - faltan(b);
      }),
    [objetivos, sort],
  );

  const totalFaltan = objetivos.reduce((n, g) => n + faltan(g), 0);
  const progresoMedio =
    objetivos.length > 0 ? Math.round(objetivos.reduce((n, g) => n + g.progressPercent, 0) / objetivos.length) : 0;

  if (collections.length === 0) {
    return (
      <section className="rounded-[18px] border border-border bg-surface p-5">
        <h2 className="font-heading text-xl font-bold uppercase tracking-wide">Plan de platinos</h2>
        <p className="mt-2 text-sm text-muted">
          Todavía no tienes ninguna carpeta. Crea una más abajo (el nombre da igual, ya no hace
          falta que se llame "Plan de platinos") y añade los juegos que quieras seguir aquí.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[18px] border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold uppercase tracking-wide">Plan de platinos</h2>
          <p className="mt-1 text-sm text-muted">Tus juegos pendientes, ordenados para elegir la próxima sesión.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dropdown
            value={collectionId}
            onChange={setCollectionId}
            options={collections.map((c) => ({ value: c.id, label: c.name, count: c.gameIds.length }))}
            className="w-52"
          />
          <Dropdown value={sort} onChange={(v) => setSort(v as typeof sort)} options={ORDENES} className="w-40" />
        </div>
      </div>

      {objetivos.length === 0 ? (
        <p className="text-sm text-muted">
          «{carpeta?.name}» está vacía todavía. Añade juegos desde su ficha o desde «Tus carpetas», más abajo.
        </p>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border p-3 text-center">
              <p className="font-heading text-2xl font-bold">{objetivos.length}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {objetivos.length === 1 ? "juego" : "juegos"} en el plan
              </p>
            </div>
            <div className="rounded-xl border border-border p-3 text-center">
              <p className="font-heading text-2xl font-bold text-platinum">{totalFaltan}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">logros pendientes</p>
            </div>
            <div className="rounded-xl border border-border p-3 text-center">
              <p className="font-heading text-2xl font-bold" style={{ color: "var(--accent-text)" }}>
                {progresoMedio}%
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">progreso medio</p>
            </div>
          </div>

          {/* El primero del orden elegido, destacado — mismo lenguaje que "A
              un paso del platino" del panel, pero sobre esta lista, no la
              biblioteca entera. */}
          <TiltCard
            href={`/u/${handle}/${ordered[0].id}`}
            className="group relative mb-4 block overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)]"
            style={{ border: "1px solid var(--border)" }}
          >
            <div className="relative flex items-center gap-4 overflow-hidden p-4" style={!ordered[0].iconUrl ? { background: coverGradient(ordered[0].id) } : undefined}>
              {ordered[0].iconUrl && (
                <div
                  className="absolute inset-[-15%] bg-cover bg-center opacity-40 blur-2xl"
                  style={{ backgroundImage: `url(${ordered[0].iconUrl})` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0d13]/90 via-[#0a0d13]/60 to-transparent" />
              <div className="relative z-10 h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                {ordered[0].iconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ordered[0].iconUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="relative z-10 min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-accent">Siguiente</p>
                <p className="truncate text-lg font-bold text-white">{ordered[0].title}</p>
                <p className="text-xs text-white/70">
                  {ordered[0].progressPercent}% · faltan {faltan(ordered[0])} logros
                </p>
              </div>
            </div>
          </TiltCard>

          <div className="grid gap-2 sm:grid-cols-2">
            {ordered.slice(1).map((game) => (
              <div key={game.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Link href={`/u/${handle}/${game.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-90">
                  <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-surface-2">
                    {game.iconUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={game.iconUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{game.title}</span>
                    <span className="mt-1 block text-xs text-muted">
                      {game.progressPercent}% · faltan {faltan(game)} logros
                    </span>
                  </span>
                </Link>
                <form action={toggleGameCollectionAction}>
                  <input type="hidden" name="collectionId" value={collectionId} />
                  <input type="hidden" name="gameId" value={game.id} />
                  <button className="shrink-0 text-xs font-semibold text-muted transition-colors hover:text-danger">Quitar</button>
                </form>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
