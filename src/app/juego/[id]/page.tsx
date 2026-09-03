import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { CommunityRating } from "@/components/CommunityRating";
import { CommunityDifficulty } from "@/components/CommunityDifficulty";
import { Stars } from "@/components/Stars";
import { StatTile } from "@/components/StatTile";
import { coverGradient, relativeDate } from "@/lib/design";
import { getGlobalGame, getGlobalGameStats, getGameReviews, ownsGame } from "@/lib/community";
import { getCommunityRating } from "@/lib/ratings";
import { getDificultadComunidad, getMiVoto } from "@/lib/communityDifficulty";
import { getProfileByUserId } from "@/lib/profiles";
import { comparativaPreciosSteam } from "@/lib/prices";
import { PLATFORM_LABEL } from "@/lib/types";
import { Pegi } from "@/components/Pegi";

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

  const [stats, rating, dificultadComunidad, reviews, session, precios] = await Promise.all([
    getGlobalGameStats(gameId),
    getCommunityRating(gameId),
    getDificultadComunidad(gameId),
    getGameReviews(gameId),
    auth(),
    // Buscamos ofertas si sabemos el ID de Steam
    game.steamId ? comparativaPreciosSteam(game.steamId) : Promise.resolve(null),
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
        style={{ background: "linear-gradient(135deg, #2b1b3f 0%, #16233d 55%, #0b1018 100%)" }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(rgba(10, 13, 19, 0.25), rgba(10, 13, 19, 0.9))" }}
        />
        <div className="relative mx-auto max-w-[1240px] px-7 pb-9 pt-7">
          <div className="mt-2 grid items-end gap-6 lg:grid-cols-[150px_1fr_auto]">
            <span
              className="relative flex h-[100px] w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-[20px] lg:h-[150px] lg:w-[150px]"
              style={{ background: coverGradient(game.id), boxShadow: "0 20px 50px rgba(0, 0, 0, 0.55)" }}
            >
              {game.iconUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={game.iconUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
            </span>

            <div className="min-w-0">
              <p className="mb-2.5 flex flex-wrap items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                <span
                  className="rounded-md px-2.5 py-1"
                  style={{ background: "rgb(var(--accent-rgb) / 0.14)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent-text)" }}
                >
                  {PLATFORM_LABEL[game.platform]} · {game.deviceLabel}
                </span>
                {(game.developer || game.publisher) && (
                  <span className="text-muted normal-case tracking-normal">
                    {game.developer ?? game.publisher}
                  </span>
                )}
                {game.pegi && <Pegi edad={game.pegi} size="md" />}
              </p>

              <h1 className="font-heading text-4xl font-bold uppercase leading-none tracking-[-0.01em] lg:text-[52px]">
                {game.title}
              </h1>

              {game.genres && game.genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
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

              <div className="mt-4 flex flex-col gap-3">
                <CommunityRating rating={rating} />
                <CommunityDifficulty
                  gameId={game.id}
                  media={dificultadComunidad?.media ?? null}
                  votos={dificultadComunidad?.votos ?? 0}
                  miVoto={miVotoDificultad}
                  puedeVotar={tieneJuego}
                />
              </div>
            </div>

            {miFicha && (
              <Link
                href={miFicha}
                className="rounded-[10px] px-4 py-2.5 text-[13px] font-bold text-background whitespace-nowrap"
                style={{ background: "var(--accent-grad)" }}
              >
                Ver mi ficha
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] space-y-9 px-7 pb-24 pt-6">
        {game.summary && (
          <section className="max-w-[820px]">
            <p className="text-lg leading-relaxed text-foreground/85">{game.summary}</p>
          </section>
        )}
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
      </div>
    </div>
  );
}
