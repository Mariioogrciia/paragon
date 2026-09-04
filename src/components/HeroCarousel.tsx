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
      <div className="relative flex h-[180px] items-stretch" style={{ background: coverGradient(String(g.igdbId)) }}>
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
          style={{ background: "linear-gradient(90deg, rgba(0,0,0,.92) 0%, rgba(0,0,0,.8) 42%, rgba(0,0,0,.55) 100%)" }}
        />

        {g.coverUrl && (
          <div className="relative z-10 aspect-[3/4] h-full shrink-0 overflow-hidden" style={{ background: "rgba(0,0,0,.25)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.coverUrl} alt="" className="h-full w-full object-contain" />
          </div>
        )}

        <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-3 text-white sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {g.platforms.slice(0, 1).map((p) => (
              <span key={p} className="flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-[11px] font-bold backdrop-blur-sm">
                <IconoPlataforma platforms={[p]} />
                {p}
              </span>
            ))}
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/70">{g.releaseLabel}</span>
            {g.pegi && <Pegi edad={g.pegi} />}
          </div>

          <h2 className="font-heading text-xl font-bold uppercase leading-tight tracking-[-0.01em] line-clamp-1 drop-shadow-md sm:text-2xl">
            {g.title}
          </h2>

          {g.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {g.genres.slice(0, 2).map((genre) => (
                <span key={genre} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/85">
                  {genre}
                </span>
              ))}
            </div>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <Link
              href={`/juego/${g.igdbId}`}
              className="rounded-[10px] px-3.5 py-2 text-xs font-bold text-background whitespace-nowrap"
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
      className="rounded-[10px] px-3.5 py-2 text-xs font-bold text-white backdrop-blur-sm transition-colors"
      style={{ background: added ? "rgba(78,201,138,.25)" : "rgba(255,255,255,.15)" }}
    >
      {isPending ? "Añadiendo..." : added ? "✓ En Deseados" : "+ Añadir a Deseados"}
    </button>
  );
}
