import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { CommunityRating } from "@/components/CommunityRating";
import { CommunityDifficulty } from "@/components/CommunityDifficulty";
import { Stars } from "@/components/Stars";
import { StatTile } from "@/components/StatTile";
import { coverGradient, relativeDate } from "@/lib/design";
import { getGlobalGame, getGlobalGameStats, getGameReviews, ownsGame, getGameTrophyBreakdown } from "@/lib/community";
import { getCommunityRating } from "@/lib/ratings";
import { getDificultadComunidad, getMiVoto } from "@/lib/communityDifficulty";
import { getProfileByUserId } from "@/lib/profiles";
import { comparativaPreciosSteam } from "@/lib/prices";
import { historicoPreciosSteam } from "@/lib/itad";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { PLATFORM_LABEL } from "@/lib/types";
import { Pegi } from "@/components/Pegi";
import { getGameDetails, IgdbNotConfiguredError, releaseLabelEs } from "@/lib/igdb/client";
import { GameDetailsSidebar } from "@/components/GameDetailsSidebar";
import { ScreenshotStrip } from "@/components/ScreenshotStrip";
import { CardCarousel } from "@/components/CardCarousel";
import { PosterCard } from "@/components/PosterCard";
import { GameHeaderLogo } from "@/components/GameHeaderLogo";
import { GameVideos } from "@/components/GameVideos";
import { GameLanguages } from "@/components/GameLanguages";
import { GameDlcs } from "@/components/GameDlcs";
import { GameTrophyBreakdown } from "@/components/GameTrophyBreakdown";
import { BackButton } from "@/components/BackButton";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGlobalGame(decodeURIComponent(id));
  return { title: game ? `${game.title} · Paragon` : "Juego · Paragon" };
}

export default async function JuegoGlobalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gameId = decodeURIComponent(id);

  const game = await getGlobalGame(gameId);
  if (!game) notFound();

  // Si hemos accedido con un ID legado (psn-...) pero tiene igdbId, redirigimos a la versión canónica unificada.
  if (!/^\d+$/.test(gameId) && game.igdbId) {
    redirect(`/juego/${game.igdbId}`);
  }

  const [stats, rating, dificultadComunidad, reviews, session, precios, historicoPrecios, detalles, trophyBreakdown] = await Promise.all([
    getGlobalGameStats(gameId),
    getCommunityRating(gameId),
    getDificultadComunidad(gameId),
    getGameReviews(gameId),
    auth(),
    // Buscamos ofertas si sabemos el ID de Steam
    game.steamId ? comparativaPreciosSteam(game.steamId) : Promise.resolve(null),
    // Histórico de precio a lo largo del tiempo (ITAD) — devuelve [] en
    // silencio si falta ITAD_API_KEY o no hay AppID de Steam, igual que el
    // resto de integraciones opcionales.
    game.steamId ? historicoPreciosSteam(game.steamId) : Promise.resolve([]),
    // Capturas, historia, temas, modos de juego y enlaces oficiales: viven en
    // IGDB, no en nuestra base (games no guarda ese detalle) — se piden en
    // vivo, cacheadas por el propio cliente de IGDB (ver getGameDetails).
    // Sin credenciales de IGDB, la ficha sigue funcionando: solo sin ese
    // bloque, igual que ya hace "Próximos lanzamientos".
    game.igdbId
      ? getGameDetails(game.igdbId).catch((error) => {
          if (!(error instanceof IgdbNotConfiguredError)) console.error("[juego-detalle-igdb]", error);
          return null;
        })
      : Promise.resolve(null),
    game.igdbId ? getGameTrophyBreakdown(game.igdbId) : Promise.resolve([]),
  ]);

  let miFicha: string | null = null;
  // El id específico (p. ej. "steam-123") que posee el usuario, no el id de
  // la URL: en una ficha unificada por igdbId, `gameId` puede ser el
  // numérico y la biblioteca (`/u/[handle]/[gameId]`) espera el namespaced.
  let miGameId: string | null = null;
  let miVotoDificultad: number | null = null;
  if (session?.user?.id) {
    let profile;
    [profile, miGameId, miVotoDificultad] = await Promise.all([
      getProfileByUserId(session.user.id),
      ownsGame(session.user.id, gameId),
      getMiVoto(session.user.id, gameId),
    ]);
    if (profile?.handle && miGameId) miFicha = `/u/${profile.handle}/${miGameId}`;
  }
  const tieneJuego = miGameId !== null;

  return (
    <div className="-mx-7 -mt-9">
      <div
        className="relative overflow-hidden border-b border-border"
        style={
          detalles?.artworkUrl
            ? {
                backgroundImage: `url(${detalles.artworkUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : { background: "linear-gradient(135deg, #2b1b3f 0%, #16233d 55%, #0b1018 100%)" }
        }
      >
        <div
          className="absolute inset-0"
          style={{ background: detalles?.artworkUrl ? "rgba(11, 16, 24, 0.75)" : "linear-gradient(rgba(10, 13, 19, 0.25), rgba(10, 13, 19, 0.9))" }}
        />
        <div className="relative mx-auto max-w-[1240px] px-7 pb-9 pt-7">
          <BackButton fallbackHref="/descubrir" dark />
          <div className="mt-2 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <GameHeaderLogo title={game.title} steamId={game.steamId} />

              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3 text-[13px] font-bold text-foreground">
                  {detalles?.totalRating && (
                    <div className="flex items-center gap-1.5 text-accent">
                      <span>⭐</span>
                      <span>{(detalles.totalRating / 10).toFixed(1)} / 10</span>
                    </div>
                  )}
                  {detalles?.totalRating && <span className="text-muted/50">|</span>}
                  
                  <div className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    {PLATFORM_LABEL[game.platform] ?? game.deviceLabel}
                  </div>
                  
                  {detalles?.releasePrecision && detalles.releasePrecision !== "tbd" && detalles.releaseDate && (
                    <>
                      <span className="text-muted/50">|</span>
                      <span className="text-muted font-medium">{releaseLabelEs(detalles.releaseDate, detalles.releasePrecision)}</span>
                    </>
                  )}
                  
                  {(game.developer || game.publisher) && (
                    <>
                      <span className="text-muted/50">|</span>
                      <span className="text-muted font-medium">
                        {game.developer ?? game.publisher}
                      </span>
                    </>
                  )}
                  {game.pegi && (
                    <>
                      <span className="text-muted/50">|</span>
                      <Pegi edad={game.pegi} size="sm" />
                    </>
                  )}
                </div>

                {game.genres && game.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {game.genres.map((g) => (
                      <span
                        key={g}
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-muted"
                        style={{ border: "1px solid var(--border)" }}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:items-end">
              {miFicha && (
                <Link
                  href={miFicha}
                  className="rounded-[10px] px-4 py-2.5 text-[13px] font-bold text-background whitespace-nowrap text-center"
                  style={{ background: "var(--accent-grad)" }}
                >
                  Ver mi ficha
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] gap-9 px-7 pb-24 pt-6 lg:grid lg:grid-cols-[1fr_300px] lg:items-start">
      {/* min-w-0: una columna `1fr` de grid no se encoge por debajo del
          ancho de su contenido más ancho por defecto (a diferencia de flex).
          Sin esto, la tira de capturas/vídeos (mucho más ancha que la
          columna) no se recortaba a sí misma — empujaba TODA la página a
          scroll horizontal, en vez de scrollear solo la tira por dentro. */}
      <div className="min-w-0 space-y-9">
        {game.summary && (
          <section className="max-w-[820px]">
            <h2 className="mb-2 font-heading text-2xl font-bold">Acerca de</h2>
            <p className="text-lg leading-relaxed text-foreground/85">{game.summary}</p>
          </section>
        )}

        {detalles && <ScreenshotStrip screenshots={detalles.screenshots} title={game.title} />}

        {detalles?.storyline && (
          <section className="max-w-[820px]">
            <h2 className="mb-2 font-heading text-2xl font-bold">Historia</h2>
            <p className="text-[15px] leading-relaxed text-foreground/85 whitespace-pre-wrap">{detalles.storyline}</p>
          </section>
        )}

        {detalles?.videos && <GameVideos videos={detalles.videos} />}
        {detalles?.languages && <GameLanguages languages={detalles.languages} />}
        {detalles?.dlcs && <GameDlcs dlcs={detalles.dlcs} />}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile value={stats.owners} label="En biblioteca" />
          <StatTile value={stats.playing} label="Jugándolo ahora" />
          <StatTile
            value={stats.completed}
            label={game.hasPlatinum ? "Al 100%" : "Completado"}
          />
          {game.hasPlatinum ? (
            <StatTile value={stats.platinumed} label="Platinado" accent="var(--platinum)" />
          ) : (
            <StatTile
              value={stats.owners > 0 ? `${Math.round((stats.completed / stats.owners) * 100)}%` : "—"}
              label="Tasa de finalización"
            />
          )}
        </div>

        {precios && (
          <section>
            <div className="mb-4 flex flex-wrap items-baseline gap-3">
              <h2 className="font-heading text-2xl font-bold">Dónde comprarlo</h2>
              {precios.precioMasBajoHistorico != null && (
                <span className="text-[13px] text-muted">
                  Mínimo histórico: {precios.precioMasBajoHistorico.toFixed(2)} €
                </span>
              )}
            </div>
            <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
              {precios.ofertas.slice(0, 8).map((oferta, i) => (
                <a
                  key={oferta.tienda}
                  href={oferta.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-0 transition-colors hover:bg-surface-2"
                >
                  {i === 0 && (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]"
                      style={{ background: "rgba(78, 201, 138, 0.14)", color: "#4ec98a", border: "1px solid rgba(78, 201, 138, 0.3)" }}
                    >
                      Más barato
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{oferta.tienda}</span>
                  {oferta.ahorro > 0 && (
                    <span className="shrink-0 text-xs font-bold text-good">-{oferta.ahorro}%</span>
                  )}
                  {oferta.ahorro > 0 && (
                    <span className="shrink-0 text-xs text-muted line-through">{oferta.precioOriginal.toFixed(2)} €</span>
                  )}
                  <span className="shrink-0 font-heading text-base font-bold">{oferta.precio.toFixed(2)} €</span>
                </a>
              ))}
            </div>
            <p className="mt-2.5 text-[11px] text-muted">
              Precios vía CheapShark, pueden no incluir región ni impuestos exactos. Solo disponible para juegos de Steam.
            </p>

            {historicoPrecios.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-bold text-foreground">Precio a lo largo del tiempo</h3>
                <div className="rounded-2xl px-4 py-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <PriceHistoryChart puntos={historicoPrecios} />
                </div>
                <p className="mt-2.5 text-[11px] text-muted">Histórico vía IsThereAnyDeal.</p>
              </div>
            )}
          </section>
        )}

        <section>
          <div className="mb-4 flex flex-wrap items-baseline gap-3">
            <h2 className="font-heading text-2xl font-bold">Reseñas de la comunidad</h2>
            <span className="text-[13px] text-muted">
              {reviews.length === 0
                ? "Ninguna todavía"
                : `${reviews.length} ${reviews.length === 1 ? "reseña" : "reseñas"}`}
            </span>
            <Link
              href={`/juego/${encodeURIComponent(game.id)}/guias`}
              className="ml-auto text-xs font-bold uppercase tracking-wide text-accent hover:underline"
            >
              Guías escritas →
            </Link>
          </div>

          {reviews.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
              Nadie ha escrito una reseña de este juego todavía. Sé el primero desde tu ficha.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.map((r) => (
                <div
                  key={r.userId}
                  className="rounded-2xl p-5"
                  style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
                >
                  <div className="flex items-start gap-3">
                    <Avatar src={r.image} name={r.name ?? r.handle ?? "?"} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {r.handle ? (
                          <Link href={`/u/${r.handle}`} className="font-semibold hover:underline">
                            {r.name ?? `@${r.handle}`}
                          </Link>
                        ) : (
                          <span className="font-semibold">{r.name ?? "Alguien"}</span>
                        )}
                        {r.rating != null && <Stars value={r.rating} size={12} />}
                        {r.reviewDate && (
                          <span className="text-xs text-muted">{relativeDate(r.reviewDate)}</span>
                        )}
                      </div>
                      <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/85">
                        {r.review}
                      </p>
                      {r.handle && (
                        <Link
                          href={`/u/${r.handle}/${game.id}`}
                          className="mt-2 inline-block text-xs font-semibold text-accent hover:underline"
                        >
                          Ver su ficha →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {detalles && detalles.similarGames.length > 0 && (
          <section>
            <h2 className="mb-4 font-heading text-2xl font-bold">Juegos similares</h2>
            <CardCarousel>
              {detalles.similarGames.map((g) => (
                <PosterCard key={g.igdbId} game={{ igdbId: g.igdbId, title: g.title, iconUrl: g.coverUrl, genres: [] }} />
              ))}
            </CardCarousel>
          </section>
        )}
      </div>

      <div className="flex flex-col gap-9">
        <div className="flex flex-col gap-4 rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <CommunityRating rating={rating} />
          <div className="h-px w-full bg-border/50" />
          <CommunityDifficulty
            gameId={game.id}
            media={dificultadComunidad?.media ?? null}
            votos={dificultadComunidad?.votos ?? 0}
            miVoto={miVotoDificultad}
            puedeVotar={tieneJuego}
          />
        </div>
        
        <GameTrophyBreakdown breakdown={trophyBreakdown} />
        {detalles && (
          <GameDetailsSidebar
            developer={game.developer}
            publisher={game.publisher}
            releaseLabel={detalles.releasePrecision !== "tbd" ? releaseLabelEs(detalles.releaseDate, detalles.releasePrecision) : undefined}
            platforms={detalles.platforms}
            genres={game.genres ?? []}
            themes={detalles.themes}
            gameModes={detalles.gameModes}
            websites={detalles.websites}
            franchises={detalles.franchises}
          />
        )}
      </div>
    </div>
    </div>
  );
}
