import Link from "next/link";
import type { ReactNode } from "react";
import { coverGradient } from "@/lib/design";

/**
 * Tarjeta compacta para las filas horizontales de Descubrir (Tendencias,
 * Joyas Ocultas, tiras por género).
 *
 * El levantamiento + resplandor genéricos los pone la regla global de
 * globals.css, pero aquí casi no se notaban: el propio `<Link>` llevaba
 * `overflow-hidden` para recortar la carátula a las esquinas redondeadas, y
 * eso se lleva por delante el resplandor (`filter: drop-shadow`) del
 * elemento que lo declara — es la misma trampa que un `box-shadow` recortado
 * por su propio `overflow: hidden`. La solución es mover el recorte a la
 * carátula (que ya tenía su propio `overflow-hidden`, ahora con
 * `rounded-t-xl` a juego) y dejar el `<Link>` exterior sin recortarse a sí
 * mismo. De paso, un hover propio más marcado (borde de acento + más
 * levantamiento) para que no dependa solo de la regla genérica.
 */
export function DiscoverCard({
  game,
  esquina,
  fluid = false,
}: {
  game: { igdbId: number; title: string; iconUrl?: string; genres: string[] };
  /** Lo que va en la esquina superior derecha — un "+X recientes", una nota... */
  esquina?: ReactNode;
  /** Para usarla dentro de una rejilla (GameGrid) en vez de una fila con scroll: ocupa el 100% de su celda en vez de un ancho fijo. */
  fluid?: boolean;
}) {
  return (
    <Link
      href={`/juego/${game.igdbId}`}
      className={`group flex flex-col rounded-xl transition-colors hover:border-accent ${fluid ? "w-full" : "w-36 shrink-0 sm:w-44"}`}
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-xl" style={{ background: coverGradient(String(game.igdbId)) }}>
        {/* Misma pareja de capas que PosterCard: de fondo, la imagen
            ampliada y oscurecida (rellena las bandas que deja `contain`
            cuando la fuente no es 3:4 — cabecera de Steam apaisada, icono de
            PSN casi cuadrado); encima, la carátula entera y nítida. Antes
            solo estaba la capa de arriba sobre un color plano, y esas bandas
            de color liso alrededor de una imagen pequeña se veían fatal. */}
        {game.iconUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={game.iconUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-sm" />
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,.5)" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={game.iconUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </>
        )}
        {esquina && <div className="absolute right-2 top-2">{esquina}</div>}
      </div>
      <div className="p-3">
        <p className="truncate text-[13px] font-semibold">{game.title}</p>
        {game.genres.length > 0 && (
          <p className="mt-0.5 truncate text-[11px] text-muted">{game.genres.slice(0, 2).join(", ")}</p>
        )}
      </div>
    </Link>
  );
}

/**
 * Fila que se desplaza sola — el `.animate-marquee` que ya usaba la
 * landing (globals.css) para el estante de muestra, aquí con datos de
 * verdad. Se pide expresamente "que se vayan moviendo, como en la
 * landing": en vez del scroll horizontal manual de antes (que casi nadie
 * toca en una lista que cabe de sobra en pantalla), la fila entera se
 * desplaza sola en bucle y se para al pasar el ratón por encima — así se
 * puede seguir haciendo clic con precisión, igual que en la landing.
 *
 * El contenido se duplica una vez (`[...items, ...items]`): `animate-marquee`
 * desplaza exactamente el 50% del ancho total, así que al llegar ahí la
 * copia 2 ocupa el sitio exacto de la copia 1 y el bucle no se nota. Con 3
 * elementos o menos no compensa — apenas se movería nada antes de repetir
 * — así que esas filas cortas se quedan quietas.
 */
export function FilaHorizontal<T>({
  items,
  itemKey,
  children,
}: {
  items: T[];
  itemKey: (item: T) => string | number;
  children: (item: T) => ReactNode;
}) {
  if (items.length === 0) return null;

  const enMovimiento = items.length > 3;
  const pintados = enMovimiento ? [...items, ...items] : items;

  return (
    <div className="relative -mx-1 overflow-hidden px-1 py-2">
      <div className={`flex w-max gap-3 ${enMovimiento ? "animate-marquee hover:[animation-play-state:paused]" : ""}`}>
        {pintados.map((item, i) => (
          <div key={`${itemKey(item)}-${i}`}>{children(item)}</div>
        ))}
      </div>
    </div>
  );
}
