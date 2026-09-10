import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getGameRecommendations } from "@/lib/recommendations";
import { getRecommendationsByGenre, getPlatinosRelax } from "@/lib/discover";
import { getProfileByUserId, getLibrary } from "@/lib/profiles";
import { calcularTrophyDna, calcularAfinidad } from "@/lib/trophyDna";
import { rescateBiblioteca } from "@/lib/backlog";
import { coverGradient } from "@/lib/design";
import { CardCarousel } from "@/components/CardCarousel";
import { PosterCard } from "@/components/PosterCard";
import { BackButton } from "@/components/BackButton";

export const metadata = { title: "Recomendaciones · Paragon" };

const LABEL_ADQUISICION: Record<string, string> = {
  ps_plus: "PS Plus",
  game_pass: "Game Pass",
};

function BadgeAfinidad({ valor }: { valor: number | null }) {
  if (valor === null) return null;
  return (
    <span className="rounded-full bg-black/60 px-2 py-0.5 text-[0.625rem] font-bold text-accent backdrop-blur-sm">
      {valor}% afín
    </span>
  );
}

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

  const profile = await getProfileByUserId(session.user.id);
  const { games: misJuegos } = profile ? await getLibrary(profile) : { games: [] };
  const dna = calcularTrophyDna(misJuegos);

  const [tiras, recomendaciones, relax] = await Promise.all([
    getRecommendationsByGenre(session.user.id),
    getGameRecommendations(session.user.id),
    getPlatinosRelax(),
  ]);

  const rescate = rescateBiblioteca(misJuegos);

  return (
    <div>
      <BackButton fallbackHref="/descubrir" />
      <div className="mb-8">
        <h1 className="font-heading text-4xl font-bold uppercase tracking-wide">Recomendaciones</h1>
        <p className="mt-2 text-lg text-muted">Hechas a partir de tu propia biblioteca — por género, y en general.</p>
      </div>

      {rescate.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 font-heading text-xl font-bold uppercase tracking-wide">Descubre en tu propio desván</h2>
          <p className="mb-4 text-sm text-muted">Ya los tienes — a 0%, cortos, esperando desde hace quién sabe cuánto.</p>
          <CardCarousel>
            {rescate.map((g) => (
              <Link
                key={g.gameId}
                href={`/u/${profile?.handle}/${g.gameId}`}
                className="group relative block aspect-[3/4] w-40 shrink-0 overflow-hidden rounded-xl sm:w-48"
                style={{ background: coverGradient(g.gameId) }}
              >
                {g.iconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.iconUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-sm" />
                )}
                <div className="absolute inset-0" style={{ background: "rgba(0,0,0,.55)" }} />
                {g.iconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.iconUrl} alt="" className="absolute inset-0 h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                {g.acquisitionFormat && LABEL_ADQUISICION[g.acquisitionFormat] && (
                  <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[0.625rem] font-bold text-white backdrop-blur-sm">
                    {LABEL_ADQUISICION[g.acquisitionFormat]}
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="font-heading text-sm font-bold uppercase leading-tight text-white drop-shadow-md">{g.titulo}</p>
                  <p className="mt-1 text-[0.6875rem] font-semibold text-white/70">~{g.horasHltb}h · al 0%</p>
                </div>
              </Link>
            ))}
          </CardCarousel>
        </section>
      )}

      {relax.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 font-heading text-xl font-bold uppercase tracking-wide">Platinos Relax</h2>
          <p className="mb-4 text-sm text-muted">Poco perdible, poca dificultad, poca duración — para cuando vienes saturado de otro juego.</p>
          <CardCarousel>
            {relax.map((g) => (
              <PosterCard
                key={g.igdbId}
                game={g}
                badge={
                  <span className="rounded-full bg-black/60 px-2 py-0.5 text-[0.625rem] font-bold text-white backdrop-blur-sm">
                    ~{g.hltbCompletionist}h · {g.perdibles === 0 ? "0 perdibles" : `${g.perdibles} perdible`}
                  </span>
                }
              />
            ))}
          </CardCarousel>
        </section>
      )}

      {tiras.map((tira) => (
        <section key={tira.genero} className="mb-10">
          <h2 className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">
            Porque te gusta <span className="text-accent">{tira.genero}</span>
          </h2>
          <CardCarousel>
            {tira.juegos.map((g) => (
              <PosterCard key={g.igdbId} game={g} badge={<BadgeAfinidad valor={calcularAfinidad(dna.ejes, g.genres)} />} />
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  <div className="absolute right-2 top-2">
                    <BadgeAfinidad valor={calcularAfinidad(dna.ejes, rec.genres)} />
                  </div>
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
