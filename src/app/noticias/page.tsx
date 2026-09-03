import { auth } from "@/auth";
import { getWishlistIgdbIds } from "@/lib/manualGames";
import { UpcomingGames } from "@/components/UpcomingGames";
import { getGamingNews } from "@/lib/rss";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export const metadata = {
  title: "Noticias y Lanzamientos - Paragon",
};

export default async function NoticiasPage() {
  const session = await auth();
  
  let wishlistIds: number[] = [];
  if (session?.user?.id) {
    wishlistIds = await getWishlistIgdbIds(session.user.id);
  }

  const news = await getGamingNews();

  return (
    <div className="mx-auto max-w-[1240px] px-7 py-12">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold mb-2">Lanzamientos Destacados</h1>
        <p className="text-muted">Los juegos más esperados de los próximos meses.</p>
      </div>

      <div className="mb-16">
        <UpcomingGames wishlistedIgdbIds={wishlistIds} />
      </div>

      <div className="mb-8">
        <h2 className="font-heading text-3xl font-bold mb-2">Últimas Noticias</h2>
        <p className="text-muted">Mantente al día con la actualidad de Eurogamer.</p>
      </div>

      {news.length === 0 ? (
        <div className="p-8 text-center border border-dashed rounded-xl border-border bg-surface text-muted text-sm">
          No se han podido cargar las noticias en este momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-[rgb(var(--accent-rgb)/0.5)]"
            >
              {item.imageUrl ? (
                <div 
                  className="h-48 w-full bg-cover bg-center border-b border-border transition-transform duration-500 group-hover:scale-105" 
                  style={{ backgroundImage: `url(${item.imageUrl})` }}
                />
              ) : (
                <div className="h-48 w-full bg-muted/20 border-b border-border flex items-center justify-center">
                  <span className="text-muted font-heading font-bold text-xl">PARAGON</span>
                </div>
              )}
              <div className="p-5 flex flex-col flex-1">
                <span className="text-xs font-semibold text-[rgb(var(--accent-rgb))] uppercase tracking-wider mb-2">
                  {formatDistanceToNow(new Date(item.pubDate), { addSuffix: true, locale: es })}
                </span>
                <h3 className="font-bold text-lg leading-snug mb-2 group-hover:text-[rgb(var(--accent-rgb))] transition-colors line-clamp-3">
                  {item.title}
                </h3>
                {item.summary && (
                  <p className="text-muted text-sm line-clamp-2 mt-auto">
                    {item.summary.replace(/<[^>]+>/g, '') /* Quitar HTML tags si las hay */}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
