import Link from "next/link";
import { auth } from "@/auth";
import { getXboxNews } from "@/lib/xboxNews";
import { NewsFeed } from "@/components/NewsFeed";
import { XboxIcon } from "@/lib/platformIcons";
import { BackButton } from "@/components/BackButton";
import { RefrescoAutomatico } from "@/components/RefrescoAutomatico";
import { CardCarousel } from "@/components/CardCarousel";
import { RankedList } from "@/components/RankedList";
import { PosterCard } from "@/components/PosterCard";
import { trendingOnPlatform, mostPlayedOnPlatform, recommendationsOnPlatform } from "@/lib/platformHub";
import { getXboxGamePassNuevos } from "@/lib/xboxGamePass";
import { GameGrid } from "@/components/GameGrid";
import { relativeDate } from "@/lib/design";

export const metadata = {
  title: "Xbox · Descubrir · Paragon",
};

/**
 * Xbox ya sincroniza biblioteca de verdad (ver lib/xbl/client.ts), así que
 * "tendencia"/"más jugados"/"recomendado" salen de datos REALES de Paragon
 * — mismo mecanismo que ya usan PlayStation y Steam en
 * `/descubrir/[plataforma]`, solo que Xbox tiene página propia porque no
 * hay ni ofertas (CheapShark no rastrea tiendas de consola) ni un
 * catálogo tipo PS Plus que mostrar aquí — de ahí que antes solo hubiera
 * noticias.
 */
export default async function DescubrirXboxPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [noticias, tendencia, masJugados, recomendados, gamePass] = await Promise.all([
    getXboxNews(),
    trendingOnPlatform("xbox"),
    mostPlayedOnPlatform("xbox"),
    recommendationsOnPlatform(userId ?? null, "xbox"),
    getXboxGamePassNuevos(),
  ]);

  return (
    <div>
      <RefrescoAutomatico />
      <BackButton fallbackHref="/descubrir" />
      <div className="mb-6 flex items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: "#107C10" }}
        >
          <XboxIcon size={26} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            <Link href="/descubrir" className="hover:underline">Descubrir</Link> / Xbox
          </p>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide">Xbox</h1>
        </div>
      </div>

      {recomendados.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">
            {userId ? "Recomendado para ti en " : "Popular en "}Xbox
          </h2>
          <CardCarousel>
            {recomendados.map((g) => (
              <PosterCard key={g.igdbId} game={g} />
            ))}
          </CardCarousel>
        </section>
      )}

      {tendencia.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">Tendencia en Paragon</h2>
          <CardCarousel>
            {tendencia.map((g) => (
              <PosterCard
                key={g.igdbId}
                game={g}
                badge={
                  <span className="rounded-full bg-black/60 px-2 py-0.5 text-[0.625rem] font-bold text-white backdrop-blur-sm">
                    +{g.recientes}
                  </span>
                }
              />
            ))}
          </CardCarousel>
        </section>
      )}

      {masJugados.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 font-heading text-xl font-bold uppercase tracking-wide">Los más jugados en Paragon</h2>
          <p className="mb-4 text-sm text-muted">Por horas registradas de quien tiene cuenta vinculada aquí, no un dato global de Xbox.</p>
          <RankedList items={masJugados} value={(g) => g.horas} valueLabel={(g) => `${g.horas} h`} />
        </section>
      )}

      <section className="mb-10 flex flex-wrap items-center justify-between gap-3 rounded-xl px-5 py-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
        <div>
          <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Catálogo de Game Pass</h2>
          <p className="text-sm text-muted">Todo lo que incluye ahora mismo, separado por Consola y PC.</p>
        </div>
        <Link
          href="/descubrir/xbox/gamepass"
          className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide text-background transition-all hover:-translate-y-0.5"
          style={{ background: "var(--accent-grad)" }}
        >
          Explorar catálogo →
        </Link>
      </section>

      {gamePass && gamePass.juegos.length > 0 && (
        <section className="mb-10">
          <div className="mb-1 flex flex-wrap items-baseline gap-3">
            <h2 className="font-heading text-xl font-bold uppercase tracking-wide">Recién llegados a Xbox Game Pass</h2>
            <a href={gamePass.link} target="_blank" rel="noopener noreferrer nofollow" className="ml-auto text-xs font-bold uppercase tracking-wide text-accent hover:underline">
              Ver el anuncio →
            </a>
          </div>
          {/* Microsoft publica varias tandas al mes, no una sola como PS
              Plus — esto es "lo último añadido", no "el catálogo del mes",
              y se dice así para no dar a entender que es un resumen
              mensual cuando no lo es. */}
          <p className="mb-4 text-[0.8125rem] text-muted">
            La última tanda que ha anunciado Xbox {gamePass.fecha ? `(${relativeDate(gamePass.fecha)})` : ""} — Game Pass añade juegos varias veces al mes, esto no es el catálogo entero.
          </p>
          <GameGrid items={gamePass.juegos} itemKey={(g) => g.igdbId} columns="grid-cols-2 gap-3 sm:grid-cols-4">
            {(g) => <PosterCard game={{ ...g, genres: [] }} fluid />}
          </GameGrid>
        </section>
      )}

      {noticias.length > 0 ? (
        <NewsFeed titulo="Noticias de Xbox" badge="Xbox Wire" items={noticias} />
      ) : (
        recomendados.length === 0 &&
        tendencia.length === 0 &&
        masJugados.length === 0 &&
        !gamePass && (
          <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            No se han podido cargar las noticias ahora mismo. Prueba más tarde.
          </p>
        )
      )}
    </div>
  );
}
