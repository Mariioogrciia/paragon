"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Dropdown } from "@/components/Dropdown";
import type { Game } from "@/lib/types";

const ORDENES = [
  { value: "proximidad", label: "Más cerca" },
  { value: "progreso", label: "Más progreso" },
  { value: "horas", label: "Más horas" },
];

export function Planificador({ games, handle }: { games: Game[]; handle: string }) {
  const [sort, setSort] = useState<"proximidad" | "horas" | "progreso">("proximidad");
  const ordered = useMemo(() => [...games].sort((a, b) => {
    if (sort === "horas") return (b.playtimeMinutes ?? 0) - (a.playtimeMinutes ?? 0);
    if (sort === "progreso") return b.progressPercent - a.progressPercent;
    return (a.definedTotal - a.earnedTotal) - (b.definedTotal - b.earnedTotal);
  }), [games, sort]);

  return (
    <section className="rounded-[18px] border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-heading text-xl font-bold uppercase tracking-wide">Plan de platinos</h2><p className="mt-1 text-sm text-muted">Tus juegos pendientes, ordenados para elegir la próxima sesión.</p></div>
        <Dropdown value={sort} onChange={(v) => setSort(v as typeof sort)} options={ORDENES} className="w-44" />
      </div>
      {ordered.length === 0 ? <p className="text-sm text-muted">Añade juegos a una carpeta de objetivos desde su ficha.</p> : <div className="grid gap-2 sm:grid-cols-2">{ordered.map((game) => <Link key={game.id} href={`/u/${handle}/${game.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-surface-2"><div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-surface-2">{game.iconUrl && <img src={game.iconUrl} alt="" className="h-full w-full object-cover" />}</div><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{game.title}</span><span className="mt-1 block text-xs text-muted">{game.progressPercent}% · faltan {Math.max(0, game.definedTotal - game.earnedTotal)} logros</span></span></Link>)}</div>}
    </section>
  );
}
