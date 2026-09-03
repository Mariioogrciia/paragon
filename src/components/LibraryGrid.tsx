"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { GameCard } from "@/components/GameCard";
import { Dropdown } from "@/components/Dropdown";
import { RatingStars } from "@/components/RatingStars";
import { AddManualGameModal } from "@/components/AddManualGameModal";
import {
  companyOf,
  filterGames,
  libraryFacets,
  type GameStatus,
  type HorasBucket,
  type SortKey,
} from "@/lib/stats";
import type { Dificultad } from "@/lib/difficulty";
import { PLATFORM_LABEL, type Game, type Platform } from "@/lib/types";
import { Pegi } from "@/components/Pegi";

const STATUS: { label: string; value: GameStatus | "todos" }[] = [
  { label: "Todos", value: "todos" },
  { label: "En curso", value: "en-curso" },
  { label: "A punto de caramelo", value: "a-punto" },
  { label: "Abandonados", value: "abandonado" },
  { label: "Platinados", value: "platinado" },
  { label: "Al 100%", value: "completado" },
  { label: "Sin empezar", value: "sin-empezar" },
  { label: "Deseados", value: "deseados" },
];

const SORTS: { label: string; value: SortKey }[] = [
  { label: "Más reciente", value: "reciente" },
  { label: "Más completado", value: "progreso" },
  { label: "Lo que menos falta", value: "pendientes" },
  { label: "Platino más asequible", value: "asequible" },
  { label: "Título (A-Z)", value: "titulo" },
];

const FIELD = { border: "1px solid var(--border)", background: "var(--background)" };

/**
 * Cuántos juegos se pintan de golpe.
 *
 * Filtrar es instantáneo aunque haya mil juegos (es un filter en memoria), pero
 * *pintar* mil tarjetas con su imagen no lo es. Se pintan por tandas y el resto
 * entra al llegar al final del scroll.
 */
const POR_PAGINA = 24;

function Pill({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[9px] px-3.5 py-2 text-xs font-semibold tracking-[0.02em] transition-colors hover:text-foreground ${className}`}
      style={
        active
          ? { background: "var(--accent-grad)", color: "#061021" }
          : { background: "transparent", color: "var(--muted)" }
      }
    >
      {children}
    </button>
  );
}

export function LibraryGrid({
  games,
  handle,
  collections = [],
  esMio = false,
  initialStatus,
}: {
  games: Game[];
  handle: string;
  collections?: { id: string; name: string; gameIds: string[] }[];
  esMio?: boolean;
  /**
   * Estado inicial del filtro, para llegar aquí ya filtrado desde fuera
   * (el panel enlaza a "A un paso del platino" con `?estado=a-punto`). Solo
   * se lee al montar: cambiar el prop después no debería resetear lo que el
   * usuario ya haya tocado a mano.
   */
  initialStatus?: GameStatus | "todos";
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<GameStatus | "todos">(initialStatus ?? "todos");
  const [platform, setPlatform] = useState<Platform | "todas">("todas");
  const [publisher, setPublisher] = useState("");
  const [genre, setGenre] = useState("");
  const [pegi, setPegi] = useState("");
  const [dificultad, setDificultad] = useState<Dificultad["nivel"] | 0>(0);
  const [horas, setHoras] = useState<HorasBucket | "">("");
  const [collection, setCollection] = useState("");
  const [sort, setSort] = useState<SortKey>("reciente");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [agrupar, setAgrupar] = useState(false);

  const facets = useMemo(() => libraryFacets(games), [games]);

  const visible = useMemo(() => {
    const carpeta = collections.find((c) => c.id === collection);
    const base = carpeta
      ? games.filter((g) => carpeta.gameIds.includes(g.id))
      : games;

    return filterGames(base, {
      search,
      status,
      platform,
      publisher: publisher || undefined,
      genre: genre || undefined,
      pegi: pegi || undefined,
      dificultad: dificultad || undefined,
      horas: horas || undefined,
      sort,
      sortDir,
    });
  }, [games, collections, collection, search, status, platform, publisher, genre, pegi, dificultad, horas, sort, sortDir]);

  const grupos = useMemo(() => {
    if (!agrupar) return null;

    const map = new Map<string, Game[]>();
    for (const game of visible) {
      const key = companyOf(game) ?? "Sin empresa";
      map.set(key, [...(map.get(key) ?? []), game]);
    }

    return [...map.entries()].sort(([a, ja], [b, jb]) => {
      if (a === "Sin empresa") return 1;
      if (b === "Sin empresa") return -1;
      return jb.length - ja.length || a.localeCompare(b, "es");
    });
  }, [agrupar, visible]);

  /* ------------------------- Carga progresiva ------------------------- */

  const [pagina, setPagina] = useState(1);
  const { ref: sentinela, inView } = useInView({ rootMargin: "400px" });

  // Cualquier cambio de filtro devuelve al principio: si no, al filtrar
  // seguiríamos "dentro" de la página 8 de una lista que ya no existe.
  useEffect(() => {
    setPagina(1);
  }, [search, status, platform, publisher, genre, pegi, dificultad, horas, collection, sort, sortDir]);

  const mostrados = useMemo(
    () => visible.slice(0, pagina * POR_PAGINA),
    [visible, pagina],
  );

  const hayMas = mostrados.length < visible.length;

  useEffect(() => {
    if (inView && hayMas) setPagina((p) => p + 1);
  }, [inView, hayMas]);

  const hayVariasPlataformas = facets.platforms.length > 1;
  const filtrado =
    Boolean(search) ||
    status !== "todos" ||
    platform !== "todas" ||
    Boolean(publisher) ||
    Boolean(genre) ||
    Boolean(pegi) ||
    Boolean(dificultad) ||
    Boolean(horas) ||
    Boolean(collection);

  // Cuántos de los filtros "secundarios" (los que se esconden detrás de "Más
  // filtros") están puestos — para el aviso en el propio botón: no hace
  // falta abrir el panel para saber que hay algo filtrando ahí dentro.
  const filtrosSecundariosActivos = [collection, publisher, genre, pegi, dificultad, horas, agrupar].filter(
    Boolean,
  ).length;

  const renderGame = (game: Game) => {
    if (view === "grid") {
      return (
        <div key={game.id} className="relative">
          <GameCard game={game} href={game.isWishlist ? `/juego/${game.id}` : `/u/${handle}/${game.id}`} />
          <div className="absolute top-2 left-2 z-10 bg-black/50 backdrop-blur-md rounded-full px-2 py-1">
            <RatingStars gameId={game.id} initialRating={game.rating} />
          </div>
        </div>
      );
    }
    
    // List view
    return (
      <div key={game.id} className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-border hover:bg-surface-2 transition-colors">
        {game.iconUrl ? (
          <img src={game.iconUrl} className="w-16 h-16 rounded-lg object-cover" alt="" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-surface-2" />
        )}
        <div className="flex-1 min-w-0">
          <a href={game.isWishlist ? `/juego/${game.id}` : `/u/${handle}/${game.id}`} className="font-bold text-lg hover:text-accent truncate block">{game.title}</a>
          <p className="text-xs text-muted mt-1">{game.deviceLabel} · {game.progressPercent}% completado</p>
          {game.pegi && <div className="mt-1"><Pegi edad={game.pegi} /></div>}
        </div>
        <div>
          <RatingStars gameId={game.id} initialRating={game.rating} />
        </div>
      </div>
    );
  };

  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div>
      {/* 1. Barra de búsqueda y controles de vista */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div
          className="flex min-w-[220px] flex-1 items-center gap-2.5 rounded-xl px-3.5 transition-colors focus-within:border-accent"
          style={FIELD}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, empresa o género…"
            className="min-w-0 flex-1 bg-transparent py-3 text-[15px] text-foreground outline-none placeholder:text-muted"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="shrink-0 text-xs font-semibold text-muted hover:text-foreground"
            >
              Limpiar
            </button>
          )}
        </div>

        <Dropdown 
          value={sort} 
          onChange={(v) => setSort(v as SortKey)} 
          options={SORTS} 
          className="w-48"
        />

        <button 
          onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
          className="h-[38px] w-[38px] flex shrink-0 items-center justify-center rounded-[9px] text-[18px] transition-colors hover:bg-surface-2 text-muted hover:text-foreground"
          style={FIELD}
          title={sortDir === "asc" ? "Orden ascendente" : "Orden descendente"}
        >
          {sortDir === "asc" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
          )}
        </button>

        <div className="flex gap-1 rounded-[9px] p-1 shrink-0" style={FIELD}>
          <button onClick={() => setView("grid")} className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          </button>
          <button onClick={() => setView("list")} className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          </button>
        </div>

        {esMio && <AddManualGameModal />}
      </div>

      {/* 2. Filtros organizados en cuadrícula para alinear los anchos */}
      <div className="mb-6 flex flex-col gap-3">
        {/* Barra de estados (8 elementos). Usamos grid para que los 8 ocupen lo mismo. */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 rounded-xl p-1"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {STATUS.map((s) => (
            <Pill 
              key={s.value} 
              active={status === s.value} 
              onClick={() => setStatus(s.value)}
              className="flex-1 w-full flex justify-center items-center text-center"
            >
              {s.label}
            </Pill>
          ))}
        </div>

        {/* Plataforma (lo más usado) y el botón que esconde el resto: antes
            se veían 6 desplegables + "Agrupar por empresa" a la vez, siempre,
            aunque nadie los tocara — mucho ruido visual para filtros que la
            mayoría usa poco. */}
        <div className="flex flex-wrap items-center gap-3">
          {hayVariasPlataformas && (
            <div
              className="flex flex-1 min-w-[240px] rounded-xl p-1 gap-1.5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <Pill active={platform === "todas"} onClick={() => setPlatform("todas")} className="flex-1 flex justify-center text-center">
                Todas
              </Pill>
              {facets.platforms.map((p) => (
                <Pill
                  key={p.value}
                  active={platform === p.value}
                  onClick={() => setPlatform(p.value as Platform)}
                  className="flex-1 flex justify-center text-center"
                >
                  {PLATFORM_LABEL[p.value as Platform]} ({p.count})
                </Pill>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors"
            style={
              showAdvanced || filtrosSecundariosActivos > 0
                ? { background: "rgb(var(--accent-rgb) / 0.12)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent-text)" }
                : { ...FIELD, color: "var(--muted)" }
            }
          >
            Más filtros
            {filtrosSecundariosActivos > 0 && (
              <span
                className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                style={{ background: "var(--accent)", color: "#061021" }}
              >
                {filtrosSecundariosActivos}
              </span>
            )}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {filtrado && (
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-muted">{visible.length} resultados</span>
              <button
                onClick={() => {
                  setStatus("todos");
                  setPlatform("todas");
                  setCollection("");
                  setPublisher("");
                  setGenre("");
                  setPegi("");
                  setDificultad(0);
                  setHoras("");
                  setSearch("");
                  setAgrupar(false);
                }}
                className="rounded-[10px] px-4 py-2 text-[13px] font-semibold text-muted hover:text-foreground transition-colors"
                style={FIELD}
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Desplegables secundarios: solo se pintan si "Más filtros" está
            abierto — antes vivían siempre visibles, aquí es donde estaba el
            grueso del ruido. */}
        {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {collections.length > 0 && (
            <Dropdown
              value={collection}
              onChange={setCollection}
              placeholder="Todas las carpetas"
              options={[
                { value: "", label: "Todas las carpetas" },
                ...collections.map(c => ({ value: c.id, label: c.name, count: c.gameIds.length }))
              ]}
              className="w-full"
            />
          )}

          {facets.publishers.length > 0 && (
            <Dropdown
              value={publisher}
              onChange={setPublisher}
              placeholder="Todas las empresas"
              options={[
                { value: "", label: "Todas las empresas" },
                ...facets.publishers.map(p => ({ value: p.value, label: p.value, count: p.count }))
              ]}
              className="w-full"
            />
          )}

          {facets.genres.length > 0 && (
            <Dropdown
              value={genre}
              onChange={setGenre}
              placeholder="Todos los géneros"
              options={[
                { value: "", label: "Todos los géneros" },
                ...facets.genres.map(g => ({ value: g.value, label: g.value, count: g.count }))
              ]}
              className="w-full"
            />
          )}

          {facets.pegis.length > 1 && (
            <Dropdown
              value={pegi}
              onChange={setPegi}
              placeholder="Cualquier edad"
              options={[
                { value: "", label: "Cualquier edad" },
                ...facets.pegis.map((p) => ({ value: p.value, label: `PEGI ${p.value}`, count: p.count })),
              ]}
              className="w-full"
            />
          )}

          {facets.dificultades.length > 1 && (
            <Dropdown
              value={dificultad ? String(dificultad) : ""}
              onChange={(v) => setDificultad((v ? Number(v) : 0) as Dificultad["nivel"] | 0)}
              placeholder="Cualquier dificultad"
              options={[
                { value: "", label: "Cualquier dificultad" },
                ...facets.dificultades.map((d) => ({
                  value: String(d.nivel),
                  label: d.etiqueta,
                  count: d.count,
                })),
              ]}
              className="w-full"
            />
          )}

          {facets.horas.length > 1 && (
            <Dropdown
              value={horas}
              onChange={(v) => setHoras(v as HorasBucket | "")}
              placeholder="Cualquier duración"
              options={[
                { value: "", label: "Cualquier duración" },
                ...facets.horas.map((h) => ({ value: h.value, label: h.label, count: h.count })),
              ]}
              className="w-full"
            />
          )}

          {/* Agrupar por empresa: es un modo de visualización, no un filtro
              que reduzca resultados, pero vive aquí dentro porque solo
              interesa a quien ya está afinando la búsqueda. */}
          {facets.publishers.length > 0 && (
            <button
              onClick={() => setAgrupar((v) => !v)}
              className="col-span-1 rounded-[10px] px-4 py-2 text-[13px] font-semibold transition-colors"
              style={
                agrupar
                  ? { background: "rgb(var(--accent-rgb) / 0.12)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent-text)" }
                  : { ...FIELD, color: "var(--muted)" }
              }
            >
              Agrupar por empresa
            </button>
          )}
        </div>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          Ningún juego con esos filtros.
        </p>
      ) : grupos ? (
        <div className="space-y-8">
          {grupos.map(([empresa, juegos]) => (
            <section key={empresa}>
              <div className="mb-3 flex items-baseline gap-3">
                <h3 className="font-heading text-lg font-bold">{empresa}</h3>
                <span className="text-xs text-muted">{juegos.length} juegos</span>
              </div>
              <div className={view === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4" : "flex flex-col gap-2"}>
                {juegos.map(renderGame)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <>
          <motion.div
            layout
            className={view === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4" : "flex flex-col gap-2"}
          >
            {/*
              Antes esto iba envuelto en `AnimatePresence mode="popLayout"`
              con `whileInView` para la entrada. Escribir en el buscador
              dispara un cambio de filtro por cada pulsación (g, gr, gra,
              gran, grand...): cada una recalcula `visible` antes de que
              `AnimatePresence` termine de digerir la salida de las tarjetas
              de la pulsación anterior. Con una biblioteca grande (200+
              juegos) el resultado era tarjetas "fantasma" que se quedaban
              clavadas en pantalla a opacidad 1 aunque ya no estuvieran en
              `visible` — el contador decía "5 resultados" y seguían
              viéndose 27 tarjetas. Sin `AnimatePresence` no hay animación de
              salida (una tarjeta que deja de cumplir el filtro desaparece
              al instante, sin fundido), pero desaparece de verdad siempre —
              que el filtro se equivoque en el número de tarjetas es un fallo
              real de datos, no una animación de menos.
            */}
            {mostrados.map((game) => (
              <motion.div
                key={game.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {renderGame(game)}
              </motion.div>
            ))}
          </motion.div>

          {/* Sentinela: al entrar en pantalla se pinta la página siguiente. */}
          {hayMas && (
            <div ref={sentinela} className="py-8 text-center text-[13px] text-muted">
              Cargando más juegos…
            </div>
          )}
        </>
      )}
    </div>
  );
}
