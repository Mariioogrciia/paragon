import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getGameRecommendations } from "@/lib/recommendations";
import { getRecommendationsByGenre } from "@/lib/discover";
import { coverGradient } from "@/lib/design";
import { CardCarousel } from "@/components/CardCarousel";
import { PosterCard } from "@/components/PosterCard";
import { BackButton } from "@/components/BackButton";

export const metadata = { title: "Recomendaciones · Paragon" };

/**
 * Recomendaciones personalizadas, en su propia página — antes vivían al
 * final de /descubrir, mezcladas con todo lo demás. Dos fuentes distintas,
 * ver lib/recommendations.ts y lib/discover.ts: "Porque te gusta X" sale de
 * tus géneros más jugados; "Para ti" es una mezcla general con la razón de
 * cada recomendación.
 */
export default async function RecomendacionesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");

  const [tiras, recomendaciones] = await Promise.all([
    getRecommendationsByGenre(session.user.id),
    getGameRecommendations(session.user.id),
  ]);

  return (
    <div>
      <BackButton fallbackHref="/descubrir" />
      <div className="mb-8">
        <h1 className="font-heading text-4xl font-bold uppercase tracking-wide">Recomendaciones</h1>
        <p className="mt-2 text-lg text-muted">Hechas a partir de tu propia biblioteca — por género, y en general.</p>
      </div>

      {tiras.map((tira) => (
        <section key={tira.genero} className="mb-10">
          <h2 className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">
            Porque te gusta <span className="text-accent">{tira.genero}</span>
          </h2>
          <CardCarousel>
            {tira.juegos.map((g) => (
              <PosterCard key={g.igdbId} game={g} />
            ))}
          </CardCarousel>
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
                    resplandor de hover (regla global de globals.css) se lo
                    recorta entero — ver el comentario de DiscoverCard.tsx,
                    mismo fallo, mismo arreglo. */}
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
    </div>
  );
}
