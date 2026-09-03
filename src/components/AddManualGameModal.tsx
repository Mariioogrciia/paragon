"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addManualGameAction, addToWishlistAction, type AddManualGameInput } from "@/app/actions";
import { CustomSelect } from "@/components/ui/CustomSelect";
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

const DEVICE_OPTIONS = [
  "Switch",
  "Switch 2",
  "PS1",
  "PS2",
  "PS3",
  "PS Vita",
  "Xbox 360",
  "Xbox One",
  "Game Boy",
  "DS / 3DS",
  "PC (sin Steam)",
  "Otro",
];

export function AddManualGameModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [picked, setPicked] = useState<SearchResult | null>(null);
  const [device, setDevice] = useState(DEVICE_OPTIONS[0]);
  const [customDevice, setCustomDevice] = useState("");
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (query.trim().length < 2) {
      setTimeout(() => {
        setResults([]);
        setSearchError(null);
      }, 0);
      return;
    }

    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!res.ok) {
          setSearchError(data.error ?? "Búsqueda no disponible.");
          setResults([]);
        } else {
          setResults(data);
        }
      } catch {
        setSearchError("No se ha podido buscar. Revisa tu conexión.");
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, isOpen]);

  function close() {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setPicked(null);
    setCompleted(false);
    setDevice(DEVICE_OPTIONS[0]);
    setCustomDevice("");
    setSaveError(null);
  }

  async function handleAdd() {
    if (!picked) return;
    const deviceLabel = device === "Otro" ? customDevice.trim() : device;
    if (!deviceLabel) {
      setSaveError("Di en qué lo has jugado.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const input: AddManualGameInput = {
      igdbId: picked.igdbId,
      title: picked.title,
      coverUrl: picked.coverUrl,
      pegi: picked.pegi,
      genres: picked.genres,
      developer: picked.developer,
      publisher: picked.publisher,
      deviceLabel,
      completed,
    };

    const result = await addManualGameAction(input);
    setSaving(false);

    if (result.error) {
      setSaveError(result.error);
      return;
    }

    close();
    router.refresh();
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-[13px] font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb) / 0.4)]"
        style={{ background: "var(--accent-grad)", color: "#061021" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Añadir juego
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden border shadow-2xl bg-card rounded-2xl border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold">
            {picked ? "Confirma el juego" : "Buscar juego"}
          </h2>
          <button onClick={close} className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>

        {!picked ? (
          <>
            <div className="p-4">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Título del juego (ej. Celeste, Chrono Trigger…)"
                className="w-full px-4 py-2.5 text-sm border rounded-xl bg-background border-border outline-none focus:border-accent"
              />
              <p className="mt-2 text-xs text-muted">
                Para lo que no tiene logros automáticos: Switch, retro, tablero…
                Se busca en el catálogo de IGDB.
              </p>
            </div>

            <div className="max-h-[360px] overflow-y-auto px-4 pb-4">
              {searching && <p className="py-6 text-sm text-center text-muted">Buscando…</p>}
              {searchError && <p className="py-6 text-sm text-center text-red-400">{searchError}</p>}
              {!searching && !searchError && query.trim().length >= 2 && results.length === 0 && (
                <p className="py-6 text-sm text-center text-muted">Sin resultados para &quot;{query}&quot;.</p>
              )}

              <div className="flex flex-col gap-1.5">
                {results.map((game) => (
                  <div
                    key={game.igdbId}
                    className="flex items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface-2"
                  >
                    <div className="w-10 h-14 overflow-hidden rounded-md shrink-0 bg-surface-2">
                      {game.coverUrl && (
                        <img src={game.coverUrl} alt="" className="object-cover w-full h-full" />
                      )}
                    </div>
                    <button onClick={() => setPicked(game)} className="min-w-0 flex-1 text-left">
                      <p className="text-sm font-semibold truncate">{game.title}</p>
                      <p className="text-xs truncate text-muted">
                        {game.releaseDate ? new Date(game.releaseDate).getFullYear() : "Sin fecha"}
                        {game.platforms.length > 0 && ` · ${game.platforms.slice(0, 3).join(", ")}`}
                      </p>
                      {game.pegi && <span className="mt-1 block"><Pegi edad={game.pegi} /></span>}
                    </button>
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
                        if (!result.error) setWishlistIds((ids) => [...ids, game.igdbId]);
                      }}
                      disabled={wishlistIds.includes(game.igdbId)}
                      className="shrink-0 text-[11px] font-bold text-accent hover:underline disabled:text-good disabled:no-underline"
                    >
                      {wishlistIds.includes(game.igdbId) ? "✓ Deseado" : "+ Deseados"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="p-4">
            <div className="flex gap-3">
              <div className="w-16 h-24 overflow-hidden rounded-lg shrink-0 bg-surface-2">
                {picked.coverUrl && (
                  <img src={picked.coverUrl} alt="" className="object-cover w-full h-full" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold">{picked.title}</p>
                <p className="text-xs text-muted">
                  {picked.developer ?? picked.publisher ?? "Catálogo IGDB"}
                </p>
                {picked.pegi && <div className="mt-1"><Pegi edad={picked.pegi} /></div>}
                <button
                  onClick={() => setPicked(null)}
                  className="mt-2 text-xs font-semibold text-accent hover:underline"
                >
                  Elegir otro
                </button>
              </div>
            </div>

            <div className="mt-5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                ¿En qué lo has jugado?
              </label>
              <CustomSelect
                value={device}
                onChange={setDevice}
                options={DEVICE_OPTIONS.map((d) => ({ value: d, label: d }))}
                className="mt-1.5"
              />
              {device === "Otro" && (
                <input
                  autoFocus
                  value={customDevice}
                  onChange={(e) => setCustomDevice(e.target.value)}
                  placeholder="Ej. Master System, tablero, arcade…"
                  className="w-full px-3 py-2 mt-2 text-sm border rounded-xl bg-background border-border outline-none focus:border-accent"
                />
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setCompleted(false)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  !completed
                    ? "border-[rgb(var(--accent-rgb)/0.35)] bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent-text)] hover:bg-[rgb(var(--accent-rgb)/0.22)]"
                    : "border-[var(--border)] bg-transparent text-muted hover:bg-[var(--surface-2)] hover:text-foreground"
                }`}
              >
                Sin empezar
              </button>
              <button
                onClick={() => setCompleted(true)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  completed
                    ? "border-[rgb(var(--accent-rgb)/0.35)] bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent-text)] hover:bg-[rgb(var(--accent-rgb)/0.22)]"
                    : "border-[var(--border)] bg-transparent text-muted hover:bg-[var(--surface-2)] hover:text-foreground"
                }`}
              >
                Completado
              </button>
            </div>

            {saveError && <p className="mt-3 text-sm text-red-400">{saveError}</p>}

            <button
              onClick={handleAdd}
              disabled={saving}
              className="w-full mt-4 rounded-xl px-4 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb) / 0.4)] disabled:pointer-events-none disabled:opacity-60"
              style={{ background: "var(--accent-grad)", color: "#061021" }}
            >
              {saving ? "Añadiendo…" : "Añadir a mi biblioteca"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
