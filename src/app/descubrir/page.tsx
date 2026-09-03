import { auth } from "@/auth";
import { getGameRecommendations } from "@/lib/recommendations";
import Link from "next/link";
import { coverGradient } from "@/lib/design";

export const metadata = {
  title: "Descubrir · Paragon",
};

export default async function DescubrirPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-3xl font-heading font-bold uppercase mb-4">Descubrir</h1>
        <p className="text-lg text-muted">
          Inicia sesión para recibir recomendaciones personalizadas basadas en tu biblioteca.
        </p>
        <div className="mt-8">
          <Link
            href="/entrar"
            className="rounded-lg px-6 py-3 font-bold text-background transition-all duration-300 hover:shadow-[0_0_30px_rgb(var(--accent-rgb)_/_0.6)]"
            style={{ background: "var(--accent-grad)" }}
          >
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  const recommendations = await getGameRecommendations(session.user.id);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-4xl font-bold uppercase tracking-wide">
          Descubrir
        </h1>
        <p className="mt-2 text-lg text-muted">
          Juegos que podrían gustarte basándonos en tu biblioteca.
        </p>
      </div>

      {recommendations.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          No tenemos suficientes datos en tu biblioteca para hacerte recomendaciones todavía. ¡Añade más juegos!
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recommendations.map((rec) => (
            <Link
              key={rec.igdbId}
              href={`/juego/${rec.igdbId}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:scale-[1.02] hover:border-accent hover:shadow-xl"
            >
              <div
                className="relative aspect-[3/4] w-full overflow-hidden"
                style={{ background: coverGradient(String(rec.igdbId)) }}
              >
                {rec.iconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={rec.iconUrl}
                    alt={rec.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="font-heading text-xl font-bold uppercase leading-tight drop-shadow-md">
                    {rec.title}
                  </h3>
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
                  <p className="text-sm font-semibold text-accent mb-2">{rec.reason}</p>
                  <p className="text-xs text-muted line-clamp-2">
                    {rec.genres.slice(0, 3).join(", ")}
                  </p>
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
    </div>
  );
}
