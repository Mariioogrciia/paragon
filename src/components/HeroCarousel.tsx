"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { coverGradient } from "@/lib/design";
import { addToWishlistAction } from "@/app/actions";
import { Pegi } from "@/components/Pegi";
import { PlayStationIcon, XboxIcon, SteamIcon, NintendoIcon } from "@/lib/platformIcons";

export interface HeroGame {
  igdbId: number;
  title: string;
  coverUrl?: string;
  genres: string[];
  platforms: string[];
  releaseLabel: string;
  pegi?: string;
}

/** El icono de plataforma es un extra visual, no la fuente de verdad — si no reconoce ninguna abreviatura, se queda sin icono y solo texto. */
/** La familia de una plataforma concreta: "PS5" y "PS4" son la misma marca,
 *  y repetir el logo de PlayStation dos veces no aporta nada. */
function familiaPlataforma(p: string): string | null {
  if (/PS[45]/.test(p)) return "PS5";
  if (/Xbox|Series/i.test(p)) return "Xbox";
  if (/Switch/i.test(p)) return "Switch";
  if (/PC/.test(p)) return "PC";
  return null;
}

function IconoPlataforma({ platforms }: { platforms: string[] }) {
  const p = platforms.join(" ");
  if (/PS[45]/.test(p)) return <PlayStationIcon size={14} />;
  if (/Xbox|Series/i.test(p)) return <XboxIcon size={14} />;
  if (/Switch/i.test(p)) return <NintendoIcon size={14} />;
  if (/PC/.test(p)) return <SteamIcon size={14} />;
  return null;
}

/**
 * Cabecera destacada de Descubrir — un lanzamiento reciente de calidad
 * (`destacadosRecientes()`: solo lo que YA ha salido, con más exigencia de
 * hype que el resto porque aquí solo cabe una pieza), con paginación manual
 * (flechas + puntos) y avance automático.
 *
 * Tarjeta rectangular y baja a propósito (`h-[180px]`, fijo en todas las
 * pantallas): la carátula va a la izquierda, entera y sin recortar
 * (`object-contain`); de fondo, la MISMA carátula ampliada y oscurecida
 * rellena el resto — poco desenfoque (`blur-sm`), que con más se veía como
 * un resplandor de neón. La plataforma sale como chip propio con icono, no
 * mezclada con los géneros.
 */
export function HeroCarousel({ items, wishlistedIgdbIds = [] }: { items: HeroGame[]; wishlistedIgdbIds?: number[] }) {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (items.length <= 1 || pausado) return;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), 7000);
    return () => clearInterval(t);
  }, [items.length, pausado]);

  if (items.length === 0) return null;
  const g = items[i];

  return (
    <div
      className="relative mb-8 overflow-hidden rounded-2xl"
      style={{ border: "1px solid var(--border)" }}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      {/* `min-h` y no `h` fija: con el tamaño de letra en "Grande" o
          "Enorme" (ver /ajustes/apariencia) el contenido crece, y con una
          altura fija + `overflow-hidden` el boton de deseados quedaba
          cortado por abajo. Asi la pieza crece con el texto. */}
      <div className="relative flex min-h-[210px] items-stretch overflow-hidden sm:min-h-[180px]" style={{ background: coverGradient(String(g.igdbId)) }}>
        {g.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={g.coverUrl}
            alt=""
            aria-hidden
            // Desenfoque suave a propósito: mucho blur dejaba pasar el color
            // crudo de la carátula como un resplandor de neón. Aquí el
            // oscurecido del overlay hace el trabajo, no el desenfoque.
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-sm saturate-75"
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, rgba(0,0,0,.92) 0%, rgba(0,0,0,.82) 55%, rgba(0,0,0,.62) 100%)" }}
        />

        {g.coverUrl && (
          <div className="relative z-10 w-[96px] shrink-0 overflow-hidden sm:aspect-[3/4] sm:h-full sm:w-auto" style={{ background: "rgba(0,0,0,.25)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.coverUrl} alt="" className="h-full w-full object-contain" />
          </div>
        )}

        <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-3 text-white sm:px-6">
          <div className="flex h-[1.6rem] items-center gap-2 overflow-hidden">
            {/* TODAS las plataformas, no solo la primera: un multiplataforma
                salia etiquetado como si fuera exclusivo de Xbox o de Steam,
                que es justo lo contrario de lo que interesa saber. Con mas de
                una se enseña solo el icono (el nombre de las tres no cabe en
                una linea de movil y partia la fila en dos, descuadrando el
                alto de la pieza). */}
            {g.platforms.length === 1 ? (
              <span className="flex shrink-0 items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-[0.6875rem] font-bold backdrop-blur-sm">
                <IconoPlataforma platforms={[g.platforms[0]]} />
                {g.platforms[0]}
              </span>
            ) : (
              g.platforms.length > 0 && (
                <span
                  className="flex shrink-0 items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 backdrop-blur-sm"
                  title={g.platforms.join(" · ")}
                >
                  {/* Un icono por FAMILIA, sin repetir: "PS4" y "PS5" son dos
                      plataformas de IGDB pero un solo logo de PlayStation. */}
                  {[...new Set(g.platforms.map(familiaPlataforma))]
                    .filter(Boolean)
                    .map((familia) => (
                      <IconoPlataforma key={familia} platforms={[familia as string]} />
                    ))}
                </span>
              )
            )}
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-white/70">{g.releaseLabel}</span>
            {g.pegi && <Pegi edad={g.pegi} />}
          </div>

          <h2 className="font-heading min-h-[2.8em] text-lg font-bold uppercase leading-tight tracking-[-0.01em] line-clamp-2 drop-shadow-md sm:min-h-0 sm:line-clamp-1 sm:text-2xl">
            {g.title}
          </h2>

          {/* La fila se dibuja SIEMPRE, aunque el juego no traiga generos: si
              desaparece, esa diapositiva queda mas baja que las demas y el
              carrusel pega un salto de alto al rotar (medido: 210px frente a
              224px del resto). */}
          {(
            <div className="flex h-[1.35rem] items-center gap-1.5 overflow-hidden">
              {g.genres.slice(0, 2).map((genre) => (
                <span key={genre} className="shrink-0 truncate rounded-full bg-white/10 px-2 py-0.5 text-[0.625rem] font-semibold text-white/85">
                  {genre}
                </span>
              ))}
            </div>
          )}

          <div className="mt-1 flex flex-nowrap items-center gap-2">
            <Link
              href={`/juego/${g.igdbId}`}
              className="shrink-0 rounded-[10px] px-3 py-2 text-xs font-bold text-background whitespace-nowrap sm:px-3.5"
              style={{ background: "var(--accent-grad)" }}
            >
              Ver ficha
            </Link>
            <WishlistButton key={g.igdbId} game={g} initiallyAdded={wishlistedIgdbIds.includes(g.igdbId)} />
          </div>
        </div>
      </div>

      {items.length > 1 && (
        <>
          <div className="absolute bottom-3 left-2 z-10 flex gap-1.5 sm:left-4">
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => setI((n) => (n - 1 + items.length) % items.length)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              onClick={() => setI((n) => (n + 1) % items.length)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              ›
            </button>
          </div>
          <div className="absolute bottom-4 right-3 z-10 flex gap-1.5 sm:right-5">
            {items.map((item, idx) => (
              <button
                key={item.igdbId}
                type="button"
                aria-label={`Ir a ${item.title}`}
                onClick={() => setI(idx)}
                className="h-1.5 rounded-full transition-all"
                style={{ width: idx === i ? 18 : 6, background: idx === i ? "#fff" : "rgba(255,255,255,.4)" }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * `key={g.igdbId}` en el punto donde se usa (arriba) es lo que de verdad
 * arregla el bug: sin él, React reutiliza esta misma instancia al rotar de
 * juego y su estado `added` (de `useState`) se queda pegado del juego
 * anterior — todos parecían estar ya en Deseados aunque no se hubiera
 * tocado nada. Con `key` distinta por juego, React monta un componente
 * nuevo (y un `added` nuevo) cada vez.
 */
function WishlistButton({ game, initiallyAdded = false }: { game: HeroGame; initiallyAdded?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(initiallyAdded);

  return (
    <button
      type="button"
      disabled={isPending || added}
      onClick={() =>
        startTransition(async () => {
          await addToWishlistAction({
            igdbId: game.igdbId,
            title: game.title,
            coverUrl: game.coverUrl,
            genres: game.genres,
            deviceLabel: "Deseados",
            completed: false,
          });
          setAdded(true);
        })
      }
      className="shrink-0 whitespace-nowrap rounded-[10px] px-3 py-2 text-xs font-bold text-white backdrop-blur-sm transition-colors sm:px-3.5"
      style={{ background: added ? "rgba(78,201,138,.25)" : "rgba(255,255,255,.15)" }}
    >
      {isPending ? (
        "Añadiendo…"
      ) : added ? (
        <>
          ✓ <span className="hidden sm:inline">En </span>Deseados
        </>
      ) : (
        <>
          + <span className="hidden sm:inline">Añadir a </span>Deseados
        </>
      )}
    </button>
  );
}
