"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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
function cuentaAtras(game: UpcomingGame, t: ReturnType<typeof useTranslations>): string | null {
  if (game.releasePrecision !== "day" || !game.releaseDate) return null;

  const dias = Math.ceil(
    (new Date(game.releaseDate).getTime() - Date.now()) / 86_400_000,
  );

  if (dias < 0) return null;
  if (dias === 0) return t("saleHoy");
  if (dias === 1) return t("manana");
  if (dias < 30) return t("enDias", { n: dias });

  const meses = Math.round(dias / 30);
  return meses === 1 ? t("enUnMes") : t("enMeses", { n: meses });
}

/** Para resaltar en ámbar lo que sale ya (panel de salidas). */
function saleEnMenosDeUnMes(game: UpcomingGame): boolean {
  if (game.releasePrecision !== "day" || !game.releaseDate) return false;
  return new Date(game.releaseDate).getTime() - Date.now() < 30 * 86_400_000;
}

/** Cuánto hace que salió (modo "recientes"). */
function haceCuanto(game: UpcomingGame, t: ReturnType<typeof useTranslations>): string | null {
  if (!game.releaseDate) return null;
  const dias = Math.floor((Date.now() - new Date(game.releaseDate).getTime()) / 86_400_000);
  if (dias < 0) return null;
  if (dias === 0) return t("salioHoy");
  if (dias === 1) return t("salioAyer");
  return t("haceDias", { n: dias });
}

/**
 * `modo="recientes"`: lo más popular ya salido (Noticias), en vez de lo
 * próximo. Misma tarjeta y mismo botón de deseados.
 */
export function UpcomingGames({
  wishlistedIgdbIds = [],
  modo = "proximos",
  variante = "tarjetas",
  compacto = false,
}: {
  wishlistedIgdbIds?: number[];
  modo?: "proximos" | "recientes";
  /** "panel": panel de salidas de aeropuerto (Noticias). "tarjetas": la de siempre (Panel). */
  variante?: "tarjetas" | "panel";
  /** Solo con `variante="panel"`: filas cortas para la columna estrecha. */
  compacto?: boolean;
}) {
  const t = useTranslations("Descubrir.UpcomingGames");
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
        const res = await fetch(modo === "recientes" ? "/api/games/upcoming?modo=recientes" : "/api/games/upcoming");
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
  }, [modo]);

  if (loading && variante === "panel") {
    return (
      <div className="salidas salidas-tablero h-full p-5" aria-busy="true">
        <div className="mb-4 h-5 w-48 rounded bg-surface-2 animate-pulse" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="mb-2 h-12 rounded bg-surface-2/60 animate-pulse" />
        ))}
      </div>
    );
  }

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

  if (variante === "panel") {
    return <PanelSalidas games={games} modo={modo} compacto={compacto} wishlistedIgdbIds={wishlistedIgdbIds} />;
  }

  return (
    <div className="rounded-[18px] border border-border bg-surface p-6">
      {/* `flex-wrap` + `min-w-0`: en un movil de 375px el titulo a dos lineas
          y la etiqueta no caben en la misma fila, y la etiqueta se salia del
          panel por la derecha. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading min-w-0 text-lg font-bold uppercase tracking-wide">
          {modo === "recientes" ? t("tituloRecientes") : t("titulo")}
        </h2>
        <span className="shrink-0 rounded-md bg-accent/10 px-2 py-1 text-xs font-semibold uppercase text-accent">
          {modo === "recientes" ? t("badgePopulares") : t("badgeTendencias")}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {games.map((game) => {
          const falta = modo === "recientes" ? haceCuanto(game, t) : cuentaAtras(game, t);
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
                  <img loading="lazy" decoding="async" src={game.cover} alt="" className="h-full w-full object-cover" />
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
        {t("avisoIgdb")}
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
              <h2 className="text-lg font-bold">{t("detallesTitulo")}</h2>
              <button onClick={() => setModalGame(null)} className="text-muted hover:text-foreground">
                ✕
              </button>
            </div>
            
            <div className="overflow-y-auto p-5">
              <div className="flex gap-4 mb-5">
                <div className="w-24 h-36 overflow-hidden rounded-lg shrink-0 bg-surface-2">
                  {modalGame.cover && (
                    <img loading="lazy" decoding="async" src={modalGame.cover} alt="" className="object-cover w-full h-full" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading text-xl font-bold leading-tight mb-1">
                    {modalGame.title}
                  </h3>
                  <p className="text-sm text-muted mb-2">
                    {modalGame.developer ?? modalGame.publisher ?? t("catalogoIgdb")}
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
                    {cuentaAtras(modalGame, t) && (
                      <span className="text-xs font-semibold text-muted bg-surface-2 px-2 py-0.5 rounded-md">
                        {cuentaAtras(modalGame, t)}
                      </span>
                    )}
                  </div>

                  {modalGame.rating != null && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
                      <span className="text-accent-2">★</span>
                      <span>{modalGame.rating}{modo === "recientes" ? t("valoracion") : t("expectacion")}</span>
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
                  <h4 className="font-bold text-foreground mb-2 text-xs uppercase tracking-wider">{t("sinopsis")}</h4>
                  <p>{modalGame.summary}</p>
                </div>
              ) : (
                <p className="text-sm text-muted italic">{t("sinDescripcion")}</p>
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

/**
 * Panel de salidas (Noticias, rediseño del 1 oct 2026): cada lanzamiento es
 * un vuelo. La fecha va en letras de paleta (una casilla por carácter) y el
 * estado es la cuenta atrás de siempre; los títulos, en letra normal para
 * que se lean. Misma información y mismas acciones que la tarjeta: ficha
 * del juego al pulsar la fila y botón de deseados.
 */
function PanelSalidas({
  games,
  modo,
  compacto,
  wishlistedIgdbIds,
}: {
  games: UpcomingGame[];
  modo: "proximos" | "recientes";
  compacto: boolean;
  wishlistedIgdbIds: number[];
}) {
  const t = useTranslations("Descubrir.UpcomingGames");
  const locale = useLocale();
  const router = useRouter();

  const fecha = (game: UpcomingGame): string => {
    if (game.releasePrecision === "day" && game.releaseDate) {
      const d = new Date(game.releaseDate);
      const dia = String(d.getUTCDate()).padStart(2, "0");
      const mes = d.toLocaleDateString(locale, { month: "short", timeZone: "UTC" }).replace(".", "").slice(0, 3).toUpperCase();
      return compacto ? `${dia} ${mes}` : `${dia} ${mes} ${String(d.getUTCFullYear()).slice(2)}`;
    }
    return game.releaseLabel.toUpperCase();
  };

  return (
    <section className="salidas salidas-tablero h-full" aria-label={modo === "recientes" ? t("tituloRecientes") : t("titulo")}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-4">
        <h2 className="salidas-rotulo">{modo === "recientes" ? t("tituloRecientes") : t("titulo")}</h2>
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted">
          {modo === "recientes" ? t("badgePopulares") : t("badgeTendencias")}
        </span>
      </header>

      {!compacto && (
        <div className="salidas-fila salidas-cabecera" aria-hidden="true">
          <span>{t("colFecha")}</span>
          <span className="col-span-2">{t("colJuego")}</span>
          <span className="text-right">{t("colEstado")}</span>
        </div>
      )}

      <ol>
        {games.map((game) => {
          const falta = modo === "recientes" ? haceCuanto(game, t) : cuentaAtras(game, t);
          const estudio = game.developer ?? game.publisher;
          const pronto = modo === "proximos" && saleEnMenosDeUnMes(game);
          return (
            <li
              key={game.id}
              className={compacto ? "salidas-fila salidas-fila-compacta" : "salidas-fila"}
              onClick={() => router.push(`/juego/${game.igdbId}`)}
            >
              <span className="salidas-paleta" aria-label={game.releaseLabel}>
                {[...fecha(game)].map((c, i) => (
                  <span key={i} className={c === " " ? "salidas-hueco" : "salidas-letra"} aria-hidden="true">
                    {c === " " ? "" : c}
                  </span>
                ))}
              </span>

              <span className="salidas-portada">
                {game.cover && <img loading="lazy" decoding="async" src={game.cover} alt="" className="h-full w-full object-cover" />}
              </span>

              <span className="min-w-0">
                <Link
                  href={`/juego/${game.igdbId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="block truncate text-[0.9375rem] font-semibold hover:text-[var(--accent-text)]"
                >
                  {game.title}
                </Link>
                <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[0.6875rem] text-muted">
                  <span className="truncate">{[estudio, game.genres[0]].filter(Boolean).join(" · ")}</span>
                  {game.pegi && <Pegi edad={game.pegi} />}
                </span>
                {!compacto && game.platforms.length > 0 && (
                  <span className="mt-1.5 flex flex-wrap gap-1" aria-label={t("colPlataformas")}>
                    {game.platforms.slice(0, 4).map((p) => (
                      <span key={p} className="rounded-sm border border-[var(--border)] px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase text-muted">
                        {p}
                      </span>
                    ))}
                  </span>
                )}
                {!compacto && game.summary && <span className="mt-1.5 hidden text-[0.75rem] text-muted line-clamp-1 2xl:block">{game.summary}</span>}
              </span>

              <span className="salidas-lado">
                <span className="salidas-estado" data-pronto={pronto || undefined} data-llegado={modo === "recientes" || undefined}>
                  {falta ?? t("porConfirmar")}
                </span>
                <span onClick={(e) => e.stopPropagation()}>
                  <WishlistButton game={game} initiallyAdded={wishlistedIgdbIds.includes(game.igdbId)} />
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <p className="border-t border-[var(--border)] px-5 py-3 text-[0.6875rem] text-muted">{t("avisoIgdb")}</p>
    </section>
  );
}

function WishlistButton({ game, initiallyAdded = false }: { game: UpcomingGame, initiallyAdded?: boolean }) {
  const t = useTranslations("Descubrir.UpcomingGames");
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
      {isPending ? t("anadiendo") : added ? t("enDeseados") : t("anadirDeseados")}
    </button>
  );
}
