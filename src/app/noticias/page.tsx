import { auth } from "@/auth";
import { getWishlistIgdbIds } from "@/lib/manualGames";
import { getProfileByUserId, getLibrary } from "@/lib/profiles";
import { UpcomingGames } from "@/components/UpcomingGames";
import { getGamingNews, noticiasDeTuBiblioteca } from "@/lib/rss";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { BackButton } from "@/components/BackButton";
import { TarjetaNoticia } from "@/components/TarjetaNoticia";

export const metadata = {
  title: "Noticias y Lanzamientos - Paragon",
};


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
