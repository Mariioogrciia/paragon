import { auth } from "@/auth";
import Link from "next/link";
import { getTrendingGames, getHiddenGems } from "@/lib/discover";
import { getWishlistIgdbIds } from "@/lib/manualGames";
import { DiscoverSearch } from "@/components/DiscoverSearch";
import { DiscoverCard, FilaHorizontal } from "@/components/DiscoverCard";
import { GameGrid } from "@/components/GameGrid";
import { PlatformTiles } from "@/components/PlatformTiles";
import { HeroCarousel } from "@/components/HeroCarousel";
import { CardCarousel } from "@/components/CardCarousel";
import { PosterCard } from "@/components/PosterCard";
import { novedades as getNovedades, destacadosRecientes, releaseLabelEs, IgdbNotConfiguredError } from "@/lib/igdb/client";
import { BackButton } from "@/components/BackButton";

export const metadata = {
  title: "Descubrir · Paragon",
};

export default async function DescubrirPage() {
  const session = await auth();
  const userId = session?.user?.id;

  // Tendencias, Joyas Ocultas y Próximos lanzamientos son iguales para
  // todo el mundo — no hace falta sesión para verlos, solo para añadir a
  // Deseados desde ahí (el propio botón de cada pieza ya lo comprueba).
  const [tendencias, joyas, wishlistIds, novedades, destacados] = await Promise.all([
    getTrendingGames(),
    getHiddenGems(),
    userId ? getWishlistIgdbIds(userId) : Promise.resolve([]),
    // Recién salidos O por salir, ordenados por hype — no solo lo que aún
    // no ha salido: un lanzamiento de hace dos semanas que todo el mundo
    // comenta también es "novedad". Ver el comentario de novedades() en
    // lib/igdb/client.ts.
    getNovedades(12).catch((e) => {
      if (!(e instanceof IgdbNotConfiguredError)) console.error("[descubrir-novedades]", e);
      return [];
    }),
    // La cabecera es aparte: solo lo que YA ha salido (nada de anunciar como
    // destacado un juego que no existe todavía) y con más exigencia de
    // calidad, porque ahí solo cabe una pieza — ver destacadosRecientes().
    destacadosRecientes(6).catch((e) => {
      if (!(e instanceof IgdbNotConfiguredError)) console.error("[descubrir-destacados]", e);
      return [];
    }),
  ]);

  const hero = destacados.map((g) => ({
    igdbId: g.igdbId,
    title: g.title,
    coverUrl: g.coverUrl,
    genres: g.genres,
    platforms: g.platforms,
    releaseLabel: releaseLabelEs(g.releaseDate, g.releasePrecision),
    pegi: g.pegi,
  }));

  return (
    <div>
      <BackButton fallbackHref="/" />
      <div className="mb-6">
        <h1 className="font-heading text-4xl font-bold uppercase tracking-wide">Descubrir</h1>
        <p className="mt-2 text-lg text-muted">Qué está jugando la comunidad, y qué te falta por encontrar.</p>
      </div>

      <HeroCarousel items={hero} wishlistedIgdbIds={wishlistIds} />

      <DiscoverSearch estaLogueado={Boolean(userId)} />

      <PlatformTiles />

      {/* Multiplataforma: agrupa por igdbId, no por games.id — el mismo
          juego en PSN y Steam cuenta como uno para "cuánta gente lo tiene",
          así que no tiene una sola plataforma que ponerle en la cabecera.
          Ver el comentario de lib/discover.ts. */}
      <div id="multiplataforma" className="mb-10 scroll-mt-24">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">Multiplataforma</p>

        {novedades.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">Novedades</h2>
            <CardCarousel>
              {novedades.map((g) => (
                <PosterCard
                  key={g.igdbId}
                  game={{ igdbId: g.igdbId, title: g.title, iconUrl: g.coverUrl, genres: g.genres }}
                  badge={
                    <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                      {releaseLabelEs(g.releaseDate, g.releasePrecision)}
                    </span>
                  }
                />
              ))}
            </CardCarousel>
          </section>
        )}

        {tendencias.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold uppercase tracking-wide">
              Tendencias en Paragon
            </h2>
            <FilaHorizontal items={tendencias} itemKey={(g) => g.igdbId}>
              {(g) => (
                <DiscoverCard
                  game={g}
                  esquina={
                    <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                      +{g.recientes}
                    </span>
                  }
                />
              )}
            </FilaHorizontal>
          </section>
        )}

        {joyas.length > 0 && (
          <section>
            <h2 className="mb-1 flex items-center gap-2 font-heading text-xl font-bold uppercase tracking-wide">
              Joyas ocultas
            </h2>
            <p className="mb-4 text-sm text-muted">Nota altísima, pero casi nadie la tiene todavía.</p>
            <GameGrid items={joyas} itemKey={(g) => g.igdbId}>
              {(g) => (
                <DiscoverCard
                  game={g}
                  fluid
                  esquina={
                    <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-yellow-400 backdrop-blur-sm">
                      ★ {g.notaMedia}
                    </span>
                  }
                />
              )}
            </GameGrid>
          </section>
        )}
      </div>

      {/* "Ofertas en Steam" vivía aquí duplicada con /descubrir/steam,
          mismos datos dos veces en sitios distintos — se quitó de la raíz,
          se queda solo en la página de la plataforma. */}

      <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
        {userId ? (
          <>
            Tus recomendaciones personalizadas ahora tienen su propio apartado —{" "}
            <Link href="/descubrir/recomendaciones" className="font-semibold text-accent hover:underline">
              míralas aquí
            </Link>
            .
          </>
        ) : (
          <>
            <Link href="/entrar" className="font-semibold text-accent hover:underline">
              Inicia sesión
            </Link>{" "}
            para ver recomendaciones hechas a partir de tu propia biblioteca — por género, y en general.
          </>
        )}
      </div>
    </div>
  );
}
