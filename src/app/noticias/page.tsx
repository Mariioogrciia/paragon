import { auth } from "@/auth";
import { getWishlistIgdbIds } from "@/lib/manualGames";
import { getProfileByUserId, getLibrary } from "@/lib/profiles";
import { UpcomingGames } from "@/components/UpcomingGames";
import { getGamingNews, noticiasDeTuBiblioteca, type NewsItem } from "@/lib/rss";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { BackButton } from "@/components/BackButton";

export const metadata = {
  title: "Noticias y Lanzamientos - Paragon",
};

/** Misma tarjeta para "Noticias de tus juegos" y "Últimas Noticias" — el `badge` opcional es lo único que cambia. */
function TarjetaNoticia({ item, badge }: { item: NewsItem; badge?: string }) {
  return (
    <a
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
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-[rgb(var(--accent-rgb))] uppercase tracking-wider">
            {formatDistanceToNow(new Date(item.pubDate), { addSuffix: true, locale: es })}
          </span>
          {badge && (
            <span className="rounded-full bg-[rgb(var(--accent-rgb)/0.15)] px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-[rgb(var(--accent-rgb))]">
              {badge}
            </span>
          )}
        </div>
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
  );
}

export default async function NoticiasPage() {
  const session = await auth();

  let wishlistIds: number[] = [];
  let titulosPropios: string[] = [];
  if (session?.user?.id) {
    const [ids, profile] = await Promise.all([
      getWishlistIgdbIds(session.user.id),
      getProfileByUserId(session.user.id),
    ]);
    wishlistIds = ids;
    // Biblioteca Y Wishlist juntas: `getLibrary` ya trae las dos
    // (`g.isWishlist` distingue una de otra), y para "¿esta noticia me
    // interesa?" da igual si ya lo tienes o si lo tienes en el radar.
    if (profile) {
      const { games } = await getLibrary(profile);
      titulosPropios = games.map((g) => g.title);
    }
  }

  // Se pide un pool más grande que las 12 que se enseñan en "Últimas
  // Noticias" — el filtro "de tus juegos" busca en todo el pool, no solo en
  // lo último, para no perderse una noticia real de hace unos días.
  const newsPool = await getGamingNews(session?.user?.id ? 40 : 12);
  const news = newsPool.slice(0, 12);
  const noticiasPropias = session?.user?.id ? noticiasDeTuBiblioteca(newsPool, titulosPropios) : [];

  return (
    <div className="mx-auto max-w-[1240px] px-7 py-12">
      <BackButton fallbackHref="/" />
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold mb-2">Lanzamientos Destacados</h1>
        <p className="text-muted">Los juegos más esperados de los próximos meses.</p>
      </div>

      <div className="mb-16">
        <UpcomingGames wishlistedIgdbIds={wishlistIds} />
      </div>

      {noticiasPropias.length > 0 && (
        <div className="mb-16">
          <div className="mb-8">
            <h2 className="font-heading text-3xl font-bold mb-2">Noticias de tus juegos</h2>
            <p className="text-muted">Menciones de algo que tienes en tu biblioteca o en tu Wishlist.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {noticiasPropias.map((item) => (
              <TarjetaNoticia key={item.id} item={item} badge={item.juego} />
            ))}
          </div>
        </div>
      )}

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
            <TarjetaNoticia key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
