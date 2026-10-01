import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { getWishlistIgdbIds } from "@/lib/manualGames";
import { getProfileByUserId, getLibrary } from "@/lib/profiles";
import { UpcomingGames } from "@/components/UpcomingGames";
import { getGamingNews, noticiasDeTuBiblioteca } from "@/lib/rss";
import { BackButton } from "@/components/BackButton";
import { TarjetaNoticia } from "@/components/TarjetaNoticia";
import { TeletipoNoticias } from "@/components/TeletipoNoticias";
import { SeccionTabs } from "@/components/SeccionTabs";

export const metadata = {
  title: "Noticias y Lanzamientos - Paragon",
};


export default async function NoticiasPage() {
  const t = await getTranslations("Descubrir.NoticiasPage");
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

  // Panel de salidas (rediseño del 1 oct 2026): mismas cuatro secciones.
  // Próximas salidas a lo ancho con "recién llegados" al lado; las noticias
  // de tus juegos siguen como tarjetas destacadas y el resto pasa a
  // teletipo.
  return (
    <div className="mx-auto max-w-[1240px] px-7 py-12">
      <BackButton fallbackHref="/" />
      <SeccionTabs seccion="descubrir" />
      <div className="mb-8">
        <h1 className="font-heading mb-2 text-[clamp(2rem,6vw,2.625rem)] font-bold uppercase leading-none">{t("titulo")}</h1>
        <p className="text-muted">{t("subtitulo")}</p>
      </div>

      <div className="mb-14 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <UpcomingGames wishlistedIgdbIds={wishlistIds} variante="panel" />
        <UpcomingGames wishlistedIgdbIds={wishlistIds} modo="recientes" variante="panel" compacto />
      </div>

      {noticiasPropias.length > 0 && (
        <section className="mb-14">
          <div className="mb-6">
            <h2 className="font-heading mb-1.5 text-2xl font-bold">{t("noticiasPropiasTitulo")}</h2>
            <p className="text-sm text-muted">{t("noticiasPropiasDescripcion")}</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {noticiasPropias.map((item) => (
              <TarjetaNoticia key={item.id} item={item} badge={item.juego} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-6">
          <h2 className="font-heading mb-1.5 text-2xl font-bold">{t("ultimasNoticiasTitulo")}</h2>
          <p className="text-sm text-muted">{t("ultimasNoticiasDescripcion")}</p>
        </div>

        {news.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">{t("sinNoticias")}</div>
        ) : (
          <TeletipoNoticias items={news} />
        )}
      </section>
    </div>
  );
}
