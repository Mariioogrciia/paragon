import { auth } from "@/auth";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { RefrescoAutomatico } from "@/components/RefrescoAutomatico";
import { getTrendingGames, getHiddenGems, getMatrizDescubrir } from "@/lib/discover";
import { MatrizDificultad } from "@/components/MatrizDificultad";
import { getWishlistIgdbIds } from "@/lib/manualGames";
import { DiscoverSearch } from "@/components/DiscoverSearch";
import { PlatformTiles } from "@/components/PlatformTiles";
import { HeroCarousel } from "@/components/HeroCarousel";
import { JoyasConNota, NuevasEntradas, TopComunidad } from "@/components/descubrir/Exitos";
import { novedades as getNovedades, destacadosRecientes, releaseLabelEs, IgdbNotConfiguredError } from "@/lib/igdb/client";
import { BackButton } from "@/components/BackButton";
import { SeccionTabs } from "@/components/SeccionTabs";

export const metadata = {
  title: "Descubrir · Paragon",
};

export default async function DescubrirPage() {
  const t = await getTranslations("Descubrir.DescubrirPage");
  const session = await auth();
  const userId = session?.user?.id;

  // Tendencias, Joyas Ocultas y Próximos lanzamientos son iguales para
  // todo el mundo — no hace falta sesión para verlos, solo para añadir a
  // Deseados desde ahí (el propio botón de cada pieza ya lo comprueba).
  const [tendencias, joyas, wishlistIds, novedades, destacados, matriz] = await Promise.all([
    getTrendingGames(),
    getHiddenGems(),
    userId ? getWishlistIgdbIds(userId) : Promise.resolve([]),
    // Recién salidos O por salir, ordenados por hype — no solo lo que aún
    // no ha salido: un lanzamiento de hace dos semanas que todo el mundo
    // comenta también es "novedad". Ver el comentario de novedades() en
    // lib/igdb/client.ts.
    getNovedades(12).catch((e) => {
      if (!(e instanceof IgdbNotConfiguredError)) console.error("[descubrir-novedades]", e);
      return [];
    }),
    // La cabecera es aparte: solo lo que YA ha salido (nada de anunciar como
    // destacado un juego que no existe todavía) y con más exigencia de
    // calidad, porque ahí solo cabe una pieza — ver destacadosRecientes().
    destacadosRecientes(6).catch((e) => {
      if (!(e instanceof IgdbNotConfiguredError)) console.error("[descubrir-destacados]", e);
      return [];
    }),
    getMatrizDescubrir().catch(() => []),
  ]);

  const hero = destacados.map((g) => ({
    igdbId: g.igdbId,
    title: g.title,
    coverUrl: g.coverUrl,
    genres: g.genres,
    platforms: g.platforms,
    releaseLabel: releaseLabelEs(g.releaseDate, g.releasePrecision),
    pegi: g.pegi,
  }));

  return (
    <div>
      <SeccionTabs seccion="descubrir" />
      {/* Las listas de juegos son de servidor: sin esto habria que
          recargar a mano para ver un lanzamiento nuevo. */}
      <RefrescoAutomatico />
      <BackButton fallbackHref="/" />
      <div className="mb-6">
        <h1 className="font-heading text-4xl font-bold uppercase tracking-wide">{t("titulo")}</h1>
        <p className="mt-2 text-lg text-muted">{t("subtitulo")}</p>
      </div>

      {/* Lista de éxitos (rediseño del 1 oct 2026): mismas secciones, en
          listas numeradas. Buscador y plataformas arriba; los destacados
          como "número 1"; tendencias, novedades y joyas como listas. */}
      <DiscoverSearch estaLogueado={Boolean(userId)} />

      <PlatformTiles />

      {hero.length > 0 && (
        <div className="mt-10">
          <HeroCarousel items={hero} wishlistedIgdbIds={wishlistIds} numerado />
        </div>
      )}

      {/* Multiplataforma: agrupa por igdbId, no por games.id — el mismo
          juego en PSN y Steam cuenta como uno para "cuánta gente lo tiene",
          así que no tiene una sola plataforma que ponerle en la cabecera.
          Ver el comentario de lib/discover.ts. */}
      <div id="multiplataforma" className="mb-16 mt-4 grid scroll-mt-24 gap-14">
        <TopComunidad items={tendencias} />

        <NuevasEntradas
          items={novedades.map((g) => ({
            igdbId: g.igdbId,
            title: g.title,
            iconUrl: g.coverUrl,
            genres: g.genres,
            etiqueta: releaseLabelEs(g.releaseDate, g.releasePrecision),
          }))}
        />
      </div>

      <MatrizDificultad puntos={matriz} />

      <div className="mb-16 mt-16">
        <JoyasConNota items={joyas} />
      </div>

      {/* "Ofertas en Steam" vivía aquí duplicada con /descubrir/steam,
          mismos datos dos veces en sitios distintos — se quitó de la raíz,
          se queda solo en la página de la plataforma. */}

      <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
        {userId ? (
          t.rich("recomendacionesLogueado", {
            link: (chunks) => (
              <Link href="/descubrir/recomendaciones" className="font-semibold text-accent hover:underline">
                {chunks}
              </Link>
            ),
          })
        ) : (
          t.rich("recomendacionesInvitado", {
            link: (chunks) => (
              <Link href="/entrar" className="font-semibold text-accent hover:underline">
                {chunks}
              </Link>
            ),
          })
        )}
      </div>
    </div>
  );
}
