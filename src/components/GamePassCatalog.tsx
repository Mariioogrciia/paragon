"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";
import type { GamePassCatalogGame, GamePassPlataforma } from "@/lib/xboxGamePassCatalog";

const FIELD = { border: "1px solid var(--border)", background: "var(--background)" };
const POR_PAGINA = 60;

/**
 * Tarjeta suelta, sin `PosterCard`: estos juegos no tienen `igdbId` (no se
 * emparejan contra IGDB, sería una petición por cada uno de los ~1.150 —
 * demasiado para un catálogo entero), así que enlazan de verdad a la ficha
 * oficial de xbox.com en vez de a `/juego/[id]`. El `rounded-xl` del enlace
 * ya recibe el resplandor de hover global de `globals.css`, sin nada más
 * que añadir aquí.
 */
function Tarjeta({ juego }: { juego: GamePassCatalogGame }) {
  return (
    <a
      href={juego.storeUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group relative block aspect-[3/4] overflow-hidden rounded-xl"
      style={{ background: "var(--surface-2)" }}
    >
      {juego.iconUrl ? (
        <img
          src={juego.iconUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-3xl">🎮</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
      <p className="absolute inset-x-0 bottom-0 p-2.5 font-heading text-xs font-bold uppercase leading-tight text-white drop-shadow-md">
        {juego.title}
      </p>
    </a>
  );
}

/**
 * Explorador del catálogo completo de Game Pass, separado por plataforma
 * (consola/PC — ver el comentario largo en lib/xboxGamePassCatalog.ts sobre
 * por qué NO es "Standard"/"Ultimate"). Mismo patrón de scroll infinito que
 * `LibraryGrid` (useInView + página), necesario aquí porque son cientos de
 * juegos y no tiene sentido mandarlos todos al DOM de golpe.
 */
export function GamePassCatalog({
  consola,
  pc,
}: {
  consola: GamePassCatalogGame[];
  pc: GamePassCatalogGame[];
}) {
  const [plataforma, setPlataforma] = useState<GamePassPlataforma>("consola");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const { ref: sentinela, inView } = useInView({ rootMargin: "400px" });

  const catalogo = plataforma === "consola" ? consola : pc;

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return catalogo;
    return catalogo.filter((j) => j.title.toLowerCase().includes(q));
  }, [catalogo, busqueda]);

  useEffect(() => {
    setPagina(1);
  }, [plataforma, busqueda]);

  const mostrados = filtrados.slice(0, pagina * POR_PAGINA);
  const hayMas = mostrados.length < filtrados.length;

  useEffect(() => {
    if (inView && hayMas) setPagina((p) => p + 1);
  }, [inView, hayMas]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-[9px] p-1" style={FIELD}>
          <button
            onClick={() => setPlataforma("consola")}
            className={`rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
              plataforma === "consola" ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            Consola ({consola.length})
          </button>
          <button
            onClick={() => setPlataforma("pc")}
            className={`rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
              plataforma === "pc" ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            PC ({pc.length})
          </button>
        </div>

        <div
          className="flex w-full sm:w-72 items-center gap-2.5 rounded-xl px-3.5 transition-colors focus-within:border-accent"
          style={FIELD}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en el catálogo…"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-foreground outline-none placeholder:text-muted"
          />
        </div>
      </div>

      {catalogo.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          No se ha podido cargar el catálogo de {plataforma === "consola" ? "consola" : "PC"} ahora mismo. Prueba más tarde.
        </p>
      ) : filtrados.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          Nada que coincida con &quot;{busqueda}&quot;.
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted">
            {mostrados.length} de {filtrados.length} juegos
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {mostrados.map((juego) => (
              <Tarjeta key={juego.id} juego={juego} />
            ))}
          </div>
          {hayMas && <div ref={sentinela} className="h-1" />}
        </>
      )}
    </div>
  );
}
