import { auth } from "@/auth";
import Link from "next/link";
import { getGameRecommendations } from "@/lib/recommendations";
import { getTrendingGames, getHiddenGems, getRecommendationsByGenre } from "@/lib/discover";
import { getWishlistIgdbIds } from "@/lib/manualGames";
import { coverGradient } from "@/lib/design";
import { DiscoverSearch } from "@/components/DiscoverSearch";
import { DiscoverCard, FilaHorizontal } from "@/components/DiscoverCard";
import { GameGrid } from "@/components/GameGrid";
import { PlatformTiles } from "@/components/PlatformTiles";
import { HeroCarousel } from "@/components/HeroCarousel";
import { CardCarousel } from "@/components/CardCarousel";
import { PosterCard } from "@/components/PosterCard";
import { ofertasSteam } from "@/lib/prices";
import { getPsPlusMensual } from "@/lib/psPlus";
import { novedades as getNovedades, destacadosRecientes, releaseLabelEs, IgdbNotConfiguredError } from "@/lib/igdb/client";

export const metadata = {
  title: "Descubrir · Paragon",
};

export default async function DescubrirPage() {
  const session = await auth();
  const userId = session?.user?.id;

  // Tendencias, Joyas Ocultas y Próximos lanzamientos son iguales para
  // todo el mundo — no hace falta sesión para verlos, solo para añadir a
  // Deseados desde ahí (el propio botón de cada pieza ya lo comprueba).
  const [tendencias, joyas, wishlistIds, ofertas, psPlus, novedades, destacados] = await Promise.all([
    getTrendingGames(),
    getHiddenGems(),
    userId ? getWishlistIgdbIds(userId) : Promise.resolve([]),
    ofertasSteam(),
    getPsPlusMensual(),
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

  const [tiras, recomendaciones] = userId
    ? await Promise.all([getRecommendationsByGenre(userId), getGameRecommendations(userId)])
    : [[], []];

  return (
    <div>
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

      {psPlus && psPlus.juegos.length > 0 && (
        <div className="mb-10">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">PlayStation</p>
          <section>
            <div className="mb-4 flex flex-wrap items-baseline gap-3">
              <h2 className="flex items-center gap-2 font-heading text-xl font-bold uppercase tracking-wide">
                PlayStation Plus — juegos del mes
              </h2>
              {psPlus.fecha && (
                <span className="text-xs text-muted">
                  Anunciado el {new Date(psPlus.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
                </span>
              )}
              <a
                href={psPlus.link}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="ml-auto text-xs font-bold uppercase tracking-wide text-accent hover:underline"
              >
                Ver el anuncio en el blog de PlayStation →
              </a>
            </div>
            <GameGrid items={psPlus.juegos} itemKey={(g) => g.igdbId} columns="grid-cols-2 gap-3 sm:grid-cols-4">
              {(g) => <DiscoverCard game={{ ...g, genres: [] }} fluid />}
            </GameGrid>
          </section>
        </div>
      )}

      {ofertas.length > 0 && (
        <div className="mb-10">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">Steam</p>
          <section>
            <h2 className="mb-1 flex items-center gap-2 font-heading text-xl font-bold uppercase tracking-wide">
              Ofertas en Steam
            </h2>
            <p className="mb-4 text-sm text-muted">
              Vía CheapShark. No hay una fuente pública equivalente para la PlayStation Store — no se inventa una aquí.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {ofertas.map((oferta) => (
                <a
                  key={oferta.url}
                  href={oferta.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex flex-col overflow-hidden rounded-xl"
                  style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={oferta.caratula} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <span className="absolute right-2 top-2 rounded-full bg-good px-2 py-0.5 text-[10px] font-bold text-black">
                      -{oferta.ahorro}%
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-[13px] font-semibold">{oferta.titulo}</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-sm font-bold text-good">{oferta.precio.toFixed(2)} €</span>
                      <span className="text-xs text-muted line-through">{oferta.precioOriginal.toFixed(2)} €</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </div>
      )}

      {!userId ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          <Link href="/entrar" className="font-semibold text-accent hover:underline">
            Inicia sesión
          </Link>{" "}
          para ver recomendaciones hechas a partir de tu propia biblioteca — por género, y en general.
        </div>
      ) : (
        <>
          {tiras.map((tira) => (
            <section key={tira.genero} className="mb-10">
              <h2 className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">
                Porque te gusta <span className="text-accent">{tira.genero}</span>
              </h2>
              <GameGrid items={tira.juegos} itemKey={(g) => g.igdbId}>
                {(g) => <DiscoverCard game={g} fluid />}
              </GameGrid>
            </section>
          ))}

          <section>
            <h2 className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">Para ti</h2>
            {recomendaciones.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
                No tenemos suficientes datos en tu biblioteca para hacerte recomendaciones todavía. ¡Añade más juegos!
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recomendaciones.map((rec) => (
                  <Link
                    key={rec.igdbId}
                    href={`/juego/${rec.igdbId}`}
                    className="group flex flex-col rounded-2xl border border-border bg-surface transition-all hover:border-accent"
                  >
                    {/* El recorte va aquí, no en el <Link> exterior: un
                        `overflow-hidden` en el mismo elemento que lleva el
                        resplandor de hover (regla global de globals.css) se
                        lo recorta entero — ver el comentario de
                        DiscoverCard.tsx, mismo fallo, mismo arreglo. */}
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-2xl" style={{ background: coverGradient(String(rec.igdbId)) }}>
                      {rec.iconUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={rec.iconUrl}
                          alt={rec.title}
                          className="absolute inset-0 h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <h3 className="font-heading text-xl font-bold uppercase leading-tight drop-shadow-md">{rec.title}</h3>
                        {rec.ratingAverage && (
                          <div className="mt-2 flex items-center gap-1 text-sm font-semibold text-yellow-400 drop-shadow-md">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            {rec.ratingAverage} / 5
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <p className="mb-2 text-sm font-semibold text-accent">{rec.reason}</p>
                        <p className="text-xs text-muted line-clamp-2">{rec.genres.slice(0, 3).join(", ")}</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs font-semibold text-muted">
                        <span className="flex items-center gap-1.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          {rec.owners} jugadores
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
