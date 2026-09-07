"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToWishlistAction } from "@/app/actions";
import { Pegi } from "@/components/Pegi";

interface UpcomingGame {
  id: string;
  title: string;
  cover: string;
  releaseDate: string | null;
  releasePrecision: "day" | "month" | "quarter" | "year" | "tbd";
  releaseLabel: string;
  platforms: string[];
  genres: string[];
  developer: string | null;
  publisher: string | null;
  summary: string | null;
  rating: number | null;
  pegi: string | null;
  igdbId: number; // Necesitamos el igdbId para guardarlo
}

/**
 * Cuántos días faltan, solo cuando se sabe el día.
 *
 * Con precisión de trimestre o de año la cuenta atrás sería falsa: IGDB
 * rellena esos casos con el 31 de diciembre (ver la ruta de la API).
 */
function cuentaAtras(game: UpcomingGame): string | null {
  if (game.releasePrecision !== "day" || !game.releaseDate) return null;

  const dias = Math.ceil(
    (new Date(game.releaseDate).getTime() - Date.now()) / 86_400_000,
  );

  if (dias < 0) return null;
  if (dias === 0) return "Sale hoy";
  if (dias === 1) return "Mañana";
  if (dias < 30) return `En ${dias} días`;

  const meses = Math.round(dias / 30);
  return meses === 1 ? "En 1 mes" : `En ${meses} meses`;
}

export function UpcomingGames({ wishlistedIgdbIds = [] }: { wishlistedIgdbIds?: number[] }) {
  const router = useRouter();
  const [games, setGames] = useState<UpcomingGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalGame, setModalGame] = useState<UpcomingGame | null>(null);

  /**
   * Se recarga sola: al montar, cada 5 minutos, y al volver a la pestaña.
   *
   * El servidor ya sirve datos frescos en ventanas de 5 minutos (ver
   * `ahoraRedondeado` en lib/igdb/client.ts). Esto es la otra mitad: sin
   * ello, alguien con la pagina abierta seguiria viendo la lista del momento
   * en que entro, aunque por detras ya hubiera cambiado.
   *
   * Lo de "al volver a la pestaña" es lo que mas se nota en la practica: se
   * deja Paragon abierto en una pestaña, se vuelve horas despues, y lo
   * primero que pasa es que se actualiza.
   */
  useEffect(() => {
    let vivo = true;

    async function traer() {
      try {
        const res = await fetch("/api/games/upcoming");
        const data = await res.json();
        if (vivo) setGames(data);
      } catch {
        // Sin conexion se queda la lista anterior, que es mejor que vaciarla.
      } finally {
        if (vivo) setLoading(false);
      }
    }

    traer();
    const cadaRato = setInterval(traer, 5 * 60 * 1000);
    const alVolver = () => {
      if (document.visibilityState === "visible") traer();
    };
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      vivo = false;
      clearInterval(cadaRato);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-[18px] border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-6 w-48 rounded bg-surface-2 animate-pulse" />
          <div className="h-5 w-24 rounded bg-surface-2 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3.5 rounded-xl border border-border bg-surface-2/40 p-3">
              <div className="h-[124px] w-[88px] shrink-0 rounded-lg bg-surface-2 animate-pulse" />
              <div className="flex min-w-0 flex-1 flex-col py-1 space-y-3">
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded bg-surface-2 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-surface-2 animate-pulse" />
                </div>
                <div className="flex gap-1.5">
                  <div className="h-4 w-12 rounded bg-surface-2 animate-pulse" />
                  <div className="h-4 w-16 rounded bg-surface-2 animate-pulse" />
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="h-2.5 w-full rounded bg-surface-2 animate-pulse" />
                  <div className="h-2.5 w-5/6 rounded bg-surface-2 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (games.length === 0) return null;

  return (
    <div className="rounded-[18px] border border-border bg-surface p-6">
      {/* `flex-wrap` + `min-w-0`: en un movil de 375px el titulo a dos lineas
          y la etiqueta no caben en la misma fila, y la etiqueta se salia del
          panel por la derecha. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading min-w-0 text-lg font-bold uppercase tracking-wide">
          Próximos lanzamientos
        </h2>
        <span className="shrink-0 rounded-md bg-accent/10 px-2 py-1 text-xs font-semibold uppercase text-accent">
          Tendencias
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {games.map((game) => {
          const falta = cuentaAtras(game);
          const estudio = game.developer ?? game.publisher;
          const isWishlisted = wishlistedIgdbIds.includes(game.igdbId);

          return (
            <article
              key={game.id}
              className="flex min-w-0 gap-3.5 rounded-xl border border-border bg-surface-2/40 p-3 transition-colors hover:bg-surface-2/80 cursor-pointer"
              onClick={() => router.push(`/juego/${game.igdbId}`)}
            >
              <div className="h-[96px] w-[68px] shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:h-[124px] sm:w-[88px]">
                {game.cover && (
                  <img src={game.cover} alt="" className="h-full w-full object-cover" />
                )}
              </div>

              <div className="flex min-w-0 flex-col">
                {/* Dos lineas SIEMPRE: un titulo corto y otro largo hacian
                    tarjetas de distinto alto en la misma fila. */}
                <h3 className="font-heading line-clamp-2 min-h-[2.4em] text-[0.9375rem] font-bold leading-tight">
                  {game.title}
                </h3>

                {/* La linea del estudio se reserva aunque IGDB no lo traiga. */}
                <p className="mt-0.5 h-[1.1rem] truncate text-[0.6875rem] text-muted">{estudio ?? ""}</p>

                <div className="mt-1.5 flex h-[1.6rem] items-center gap-1.5 overflow-hidden">
                  <span
                    className="rounded-md px-2 py-0.5 text-[0.6875rem] font-bold"
                    style={{
                      background: "rgb(var(--accent-rgb) / 0.14)",
                      border: "1px solid rgb(var(--accent-rgb) / 0.3)",
                      color: "var(--accent-text)",
                    }}
                  >
                    {game.releaseLabel}
                  </span>
                  {falta && (
                    <span className="text-[0.6875rem] font-semibold text-muted">{falta}</span>
                  )}
                  {game.pegi && <Pegi edad={game.pegi} />}
                </div>

                {/* Dos filas de etiquetas como maximo, con el hueco siempre
                    reservado: con las plataformas completas de un
                    multiplataforma, unas tarjetas llegaban a tres filas y
                    otras a una. */}
                {(
                  <div className="mt-1.5 flex h-[2.6rem] flex-wrap content-start gap-1 overflow-hidden">
                    {game.platforms.slice(0, 3).map((p) => (
                      <span
                        key={p}
                        className="rounded-sm bg-white/10 px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase"
                      >
                        {p}
                      </span>
                    ))}
                    {game.genres.map((g) => (
                      <span
                        key={g}
                        className="rounded-sm px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase text-muted"
                        style={{ border: "1px solid var(--border)" }}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {game.summary && (
                  <p className="mt-2 text-[0.75rem] leading-relaxed text-muted line-clamp-2">
                    {game.summary}
                  </p>
                )}

                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                  <WishlistButton game={game} initiallyAdded={isWishlisted} />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-4 text-[0.6875rem] text-muted">
        Datos de IGDB. Los resúmenes vienen en inglés, tal y como los publica el catálogo.
      </p>

      {/* Modal de detalles */}
      {modalGame && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => setModalGame(null)}
        >
          <div 
            className="w-full max-w-lg overflow-hidden border shadow-2xl bg-card rounded-2xl border-border max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h2 className="text-lg font-bold">Detalles del juego</h2>
              <button onClick={() => setModalGame(null)} className="text-muted hover:text-foreground">
                ✕
              </button>
            </div>
            
            <div className="overflow-y-auto p-5">
              <div className="flex gap-4 mb-5">
                <div className="w-24 h-36 overflow-hidden rounded-lg shrink-0 bg-surface-2">
                  {modalGame.cover && (
                    <img src={modalGame.cover} alt="" className="object-cover w-full h-full" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading text-xl font-bold leading-tight mb-1">
                    {modalGame.title}
                  </h3>
                  <p className="text-sm text-muted mb-2">
                    {modalGame.developer ?? modalGame.publisher ?? "Catálogo IGDB"}
                  </p>
                  
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-bold"
                      style={{
                        background: "rgb(var(--accent-rgb) / 0.14)",
                        border: "1px solid rgb(var(--accent-rgb) / 0.3)",
                        color: "var(--accent-text)",
                      }}
                    >
                      {modalGame.releaseLabel}
                    </span>
                    {modalGame.pegi && <Pegi edad={modalGame.pegi} />}
                    {cuentaAtras(modalGame) && (
                      <span className="text-xs font-semibold text-muted bg-surface-2 px-2 py-0.5 rounded-md">
                        {cuentaAtras(modalGame)}
                      </span>
                    )}
                  </div>
                  
                  {modalGame.rating != null && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
                      <span className="text-accent-2">★</span>
                      <span>{modalGame.rating}/100 expectación</span>
                    </div>
                  )}
                </div>
              </div>
              
              {(modalGame.platforms.length > 0 || modalGame.genres.length > 0) && (
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {modalGame.platforms.map((p) => (
                    <span
                      key={p}
                      className="rounded-sm bg-white/10 px-2 py-1 text-[0.625rem] font-bold uppercase"
                    >
                      {p}
                    </span>
                  ))}
                  {modalGame.genres.map((g) => (
                    <span
                      key={g}
                      className="rounded-sm px-2 py-1 text-[0.625rem] font-bold uppercase text-muted"
                      style={{ border: "1px solid var(--border)" }}
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
              
              {modalGame.summary ? (
                <div className="text-sm leading-relaxed text-muted">
                  <h4 className="font-bold text-foreground mb-2 text-xs uppercase tracking-wider">Sinopsis</h4>
                  <p>{modalGame.summary}</p>
                </div>
              ) : (
                <p className="text-sm text-muted italic">Sin descripción disponible.</p>
              )}
              
              <div className="mt-6 flex">
                <WishlistButton 
                  game={modalGame} 
                  initiallyAdded={wishlistedIgdbIds.includes(modalGame.igdbId)} 
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WishlistButton({ game, initiallyAdded = false }: { game: UpcomingGame, initiallyAdded?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(initiallyAdded);

  return (
    <button
      disabled={isPending || added}
      onClick={() => {
        startTransition(async () => {
          await addToWishlistAction({
            igdbId: game.igdbId || parseInt(game.id),
            title: game.title,
            coverUrl: game.cover,
            genres: game.genres,
            developer: game.developer ?? undefined,
            publisher: game.publisher ?? undefined,
            deviceLabel: "Deseados",
            completed: false,
          });
          setAdded(true);
        });
      }}
      className={`text-[0.6875rem] font-bold transition-colors ${
        added ? "text-good" : "text-accent hover:text-accent-2"
      }`}
    >
      {isPending ? "Añadiendo..." : added ? "✓ En Deseados" : "+ Añadir a Deseados"}
    </button>
  );
}
