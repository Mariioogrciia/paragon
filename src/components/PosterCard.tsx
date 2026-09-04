import Link from "next/link";
import type { ReactNode } from "react";
import { coverGradient } from "@/lib/design";

/**
 * Carátula grande con degradado y título superpuesto abajo — distinta de
 * `DiscoverCard` (carátula + panel de texto aparte) a propósito, para que la
 * página de plataforma no repita el mismo tipo de tarjeta que Descubrir.
 *
 * Dos capas con la MISMA imagen, igual que en `HeroCarousel`: de fondo, algo
 * ampliada y oscurecida (poco desenfoque, la mayoría del oscurecido lo pone
 * un overlay negro, no el `blur`) rellenando toda la tarjeta — y encima, la
 * carátula de verdad entera y nítida (`object-contain`). Así no quedan
 * bandas de color plano cuando la imagen no es 3:4 (la cabecera de Steam es
 * apaisada, ~2.14:1; la de PSN, casi cuadrada), sin volver a recortar la que
 * sí hay que ver completa.
 *
 * El recorte (`overflow-hidden`) va en este mismo `<Link>`: no lleva su
 * propio resplandor de hover con `filter` (usa un overlay + escala en su
 * lugar), así que no le pasa la trampa de overflow-hidden que sí afecta a
 * DiscoverCard — ver el comentario de ese componente si hace falta el
 * patrón contrario en algún sitio nuevo.
 */
export function PosterCard({
  game,
  badge,
  fluid = false,
}: {
  game: { igdbId: number; title: string; iconUrl?: string; genres: string[] };
  badge?: ReactNode;
  fluid?: boolean;
}) {
  return (
    <Link
      href={`/juego/${game.igdbId}`}
      className={`group relative block aspect-[3/4] overflow-hidden rounded-xl ${fluid ? "w-full" : "w-40 shrink-0 sm:w-48"}`}
      style={{ background: coverGradient(String(game.igdbId)) }}
    >
      {game.iconUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={game.iconUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-sm" />
      )}
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,.55)" }} />
      {game.iconUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={game.iconUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
      {badge && <div className="absolute right-2 top-2">{badge}</div>}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="font-heading text-sm font-bold uppercase leading-tight text-white drop-shadow-md">{game.title}</p>
        {game.genres.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {game.genres.slice(0, 2).map((g) => (
              <span key={g} className="rounded-md bg-white/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white backdrop-blur-sm">
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
