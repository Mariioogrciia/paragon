import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { getXboxNews } from "@/lib/xboxNews";
import { NewsFeed } from "@/components/NewsFeed";
import { XboxIcon } from "@/lib/platformIcons";
import { CabeceraPlataforma } from "@/components/descubrir/CabeceraPlataforma";
import { TopComunidad } from "@/components/descubrir/Exitos";
import { BackButton } from "@/components/BackButton";
import { RefrescoAutomatico } from "@/components/RefrescoAutomatico";
import { CardCarousel } from "@/components/CardCarousel";
import { RankedList } from "@/components/RankedList";
import { PosterCard } from "@/components/PosterCard";
import { trendingOnPlatform, mostPlayedOnPlatform, recommendationsOnPlatform } from "@/lib/platformHub";
import { getXboxGamePassNuevos } from "@/lib/xboxGamePass";
import { GameGrid } from "@/components/GameGrid";
import { relativeDate } from "@/lib/design";

export const metadata = {
  title: "Xbox · Descubrir · Paragon",
};

/**
 * Xbox ya sincroniza biblioteca de verdad (ver lib/xbl/client.ts), así que
 * "tendencia"/"más jugados"/"recomendado" salen de datos REALES de Paragon
 * — mismo mecanismo que ya usan PlayStation y Steam en
 * `/descubrir/[plataforma]`, solo que Xbox tiene página propia porque no
 * hay ni ofertas (CheapShark no rastrea tiendas de consola) ni un
 * catálogo tipo PS Plus que mostrar aquí — de ahí que antes solo hubiera
 * noticias.
 */
export default async function DescubrirXboxPage() {
  const idioma = await getLocale();
  const t = await getTranslations("Descubrir.XboxPage");
  const session = await auth();
  const userId = session?.user?.id;

  const [noticias, tendencia, masJugados, recomendados, gamePass] = await Promise.all([
    getXboxNews(),
    trendingOnPlatform("xbox"),
    mostPlayedOnPlatform("xbox"),
    recommendationsOnPlatform(userId ?? null, "xbox"),
    getXboxGamePassNuevos(),
  ]);

  return (
    <div>
      <RefrescoAutomatico />
      <BackButton fallbackHref="/descubrir" />
      <CabeceraPlataforma nombre={t("titulo")} color="#107c10" icono={<XboxIcon size={38} />} migas={t("breadcrumb")} />

      {recomendados.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 font-heading text-2xl font-bold uppercase">
            {userId ? t("recomendadoPara") : t("popularEn")}
          </h2>
          <CardCarousel>
            {recomendados.map((g) => (
              <PosterCard key={g.igdbId} game={g} />
            ))}
          </CardCarousel>
        </section>
      )}

      {tendencia.length > 0 && (
        <div className="mb-12">
          <TopComunidad items={tendencia} titulo={t("tendenciaEnParagon")} descripcion={t("tendenciaDescripcion")} />
        </div>
      )}

      {masJugados.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-1 font-heading text-2xl font-bold uppercase">{t("masJugados")}</h2>
          <p className="mb-4 text-sm text-muted">{t("masJugadosDescripcion")}</p>
          <RankedList items={masJugados} value={(g) => g.horas} valueLabel={(g) => `${g.horas} h`} />
        </section>
      )}

      <section className="mb-12 flex flex-wrap items-center justify-between gap-3 rounded-xl px-5 py-4" style={{ border: "1px solid color-mix(in srgb, #107c10 45%, var(--border))", background: "linear-gradient(120deg, color-mix(in srgb, #107c10 16%, var(--surface)), var(--surface))" }}>
        <div>
          <h2 className="font-heading text-lg font-bold uppercase tracking-wide">{t("gamepassTitulo")}</h2>
          <p className="text-sm text-muted">{t("gamepassDescripcion")}</p>
        </div>
        <Link
          href="/descubrir/xbox/gamepass"
          className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide text-background transition-all hover:-translate-y-0.5"
          style={{ background: "var(--accent-grad)" }}
        >
          {t("explorarCatalogo")}
        </Link>
      </section>

      {gamePass && gamePass.juegos.length > 0 && (
        <section className="mb-12">
          <div className="mb-1 flex flex-wrap items-baseline gap-3">
            <h2 className="font-heading text-2xl font-bold uppercase">{t("recienLlegados")}</h2>
            <a href={gamePass.link} target="_blank" rel="noopener noreferrer nofollow" className="ml-auto text-xs font-bold uppercase tracking-wide text-accent hover:underline">
              {t("verAnuncio")}
            </a>
          </div>
          {/* Microsoft publica varias tandas al mes, no una sola como PS
              Plus — esto es "lo último añadido", no "el catálogo del mes",
              y se dice así para no dar a entender que es un resumen
              mensual cuando no lo es. */}
          <p className="mb-4 text-[0.8125rem] text-muted">
            {t("gamepassAviso", { fecha: gamePass.fecha ? `(${relativeDate(gamePass.fecha, idioma)})` : "" })}
          </p>
          <GameGrid items={gamePass.juegos} itemKey={(g) => g.igdbId} columns="grid-cols-2 gap-3 sm:grid-cols-4">
            {(g) => <PosterCard game={{ ...g, genres: [] }} fluid />}
          </GameGrid>
        </section>
      )}

      {noticias.length > 0 ? (
        <NewsFeed titulo={t("noticiasTitulo")} badge={t("noticiasBadge")} items={noticias} />
      ) : (
        recomendados.length === 0 &&
        tendencia.length === 0 &&
        masJugados.length === 0 &&
        !gamePass && (
          <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            {t("sinNoticias")}
          </p>
        )
      )}
    </div>
  );
}
