import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { CommunityRating } from "@/components/CommunityRating";
import { StatTile } from "@/components/StatTile";
import { coverGradient, relativeDate } from "@/lib/design";
import { getGlobalGame, getGlobalGameStats, getGameReviews, ownsGame } from "@/lib/community";
import { getCommunityRating } from "@/lib/ratings";
import { getProfileByUserId } from "@/lib/profiles";
import { PLATFORM_LABEL } from "@/lib/types";

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

  const [stats, rating, reviews, session] = await Promise.all([
    getGlobalGameStats(gameId),
    getCommunityRating(gameId),
    getGameReviews(gameId),
    auth(),
  ]);

  let miFicha: string | null = null;
  if (session?.user?.id) {
    const [profile, tieneJuego] = await Promise.all([
      getProfileByUserId(session.user.id),
      ownsGame(session.user.id, gameId),
    ]);
    if (profile?.handle && tieneJuego) miFicha = `/u/${profile.handle}/${gameId}`;
  }

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

              <div className="mt-4">
                <CommunityRating rating={rating} />
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

        <section>
          <div className="mb-4 flex flex-wrap items-baseline gap-3">
            <h2 className="font-heading text-2xl font-bold">Reseñas de la comunidad</h2>
            <span className="text-[13px] text-muted">
              {reviews.length === 0
                ? "Ninguna todavía"
                : `${reviews.length} ${reviews.length === 1 ? "reseña" : "reseñas"}`}
            </span>
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
                        {r.rating != null && (
                          <span className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <svg
                                key={s}
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill={s <= r.rating! ? "#f59e0b" : "none"}
                                stroke={s <= r.rating! ? "#f59e0b" : "var(--muted)"}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            ))}
                          </span>
                        )}
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
