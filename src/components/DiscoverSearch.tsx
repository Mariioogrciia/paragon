"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { addToWishlistAction } from "@/app/actions";
import { coverGradient } from "@/lib/design";
import { Pegi } from "@/components/Pegi";

interface SearchResult {
  igdbId: number;
  title: string;
  coverUrl?: string;
  pegi?: string;
  releaseDate?: string;
  platforms: string[];
  genres: string[];
  developer?: string;
  publisher?: string;
}

/**
 * Buscador grande de Descubrir: mismo IGDB que ya usa
 * `AddManualGameModal` (`/api/games/search`) y la misma acción para añadir
 * a Deseados (`addToWishlistAction`) — es el "si no sale en las
 * recomendaciones, búscalo tú" que pedías, sin inventar una segunda forma
 * de buscar juegos.
 */
export function DiscoverSearch({ estaLogueado }: { estaLogueado: boolean }) {
  const t = useTranslations("Descubrir.DiscoverSearch");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<number[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      // Mismo truco que AddManualGameModal.tsx: envolver en un setTimeout(0)
      // para no llamar a setState de forma síncrona en el cuerpo del efecto.
      setTimeout(() => {
        setResults([]);
        setError(null);
      }, 0);
      return;
    }

    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? t("errorBusquedaNoDisponible"));
          setResults([]);
        } else {
          setResults(data);
        }
      } catch {
        setError(t("errorConexion"));
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  return (
    <section className="mb-10">
      <div
        className="flex items-center gap-3 rounded-2xl px-5 py-4 transition-colors focus-within:border-accent"
        style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("placeholder")}
          className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground outline-none placeholder:text-muted"
        />
        {query && (
          <button onClick={() => setQuery("")} className="shrink-0 text-xs font-semibold text-muted hover:text-foreground">
            {t("limpiar")}
          </button>
        )}
      </div>

      {query.trim().length >= 2 && (
        <div className="mt-3 rounded-2xl p-2" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          {searching && <p className="py-6 text-center text-sm text-muted">{t("buscando")}</p>}
          {error && <p className="py-6 text-center text-sm text-danger">{error}</p>}
          {!searching && !error && results.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">{t("sinResultados", { query })}</p>
          )}

          <div className="flex flex-col gap-1">
            {results.map((game) => (
              <div key={game.igdbId} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2">
                <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md" style={{ background: coverGradient(String(game.igdbId)) }}>
                  {game.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={game.coverUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <Link href={`/juego/${game.igdbId}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{game.title}</p>
                  <p className="truncate text-xs text-muted">
                    {game.releaseDate ? new Date(game.releaseDate).getFullYear() : t("sinFecha")}
                    {game.platforms.length > 0 && ` · ${game.platforms.slice(0, 3).join(", ")}`}
                  </p>
                  {game.pegi && <span className="mt-1 block"><Pegi edad={game.pegi} /></span>}
                </Link>
                {estaLogueado && (
                  <button
                    onClick={async () => {
                      const result = await addToWishlistAction({
                        igdbId: game.igdbId,
                        title: game.title,
                        coverUrl: game.coverUrl,
                        pegi: game.pegi,
                        genres: game.genres,
                        developer: game.developer,
                        publisher: game.publisher,
                        deviceLabel: "Deseados",
                        completed: false,
                      });
                      if (!result.error) setAddedIds((ids) => [...ids, game.igdbId]);
                    }}
                    disabled={addedIds.includes(game.igdbId)}
                    className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-accent disabled:text-good"
                  >
                    {addedIds.includes(game.igdbId) ? t("yaDeseado") : t("anadirDeseados")}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
