import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { RefrescoAutomatico } from "@/components/RefrescoAutomatico";
import { auth } from "@/auth";
import { GameGrid } from "@/components/GameGrid";
import { RankedList } from "@/components/RankedList";
import { ReleaseGrid } from "@/components/ReleaseGrid";
import { CardCarousel } from "@/components/CardCarousel";
import { PosterCard } from "@/components/PosterCard";
import { PlayStationIcon, SteamIcon } from "@/lib/platformIcons";
import { BackButton } from "@/components/BackButton";
import {
  trendingOnPlatform,
  mostPlayedOnPlatform,
  recommendationsOnPlatform,
  casiSinJugadoresEnSteam,
  type PlataformaHub,
} from "@/lib/platformHub";
import { upcomingGames, recentReleases, IgdbNotConfiguredError } from "@/lib/igdb/client";
import { ofertasSteam } from "@/lib/prices";
import { getPsPlusMensual, PRECIO_PSPLUS_EUR } from "@/lib/psPlus";
import { getPsNews } from "@/lib/psNews";
import { getSteamNews } from "@/lib/steamNews";
import { NewsFeed } from "@/components/NewsFeed";
import { relativeDate } from "@/lib/design";

const PLATAFORMAS: Record<string, { label: string; hubKey: PlataformaHub; color: string; icon: React.ReactNode }> = {
  playstation: { label: "PlayStation", hubKey: "psn", color: "#0f3d8a", icon: <PlayStationIcon size={26} /> },
  steam: { label: "Steam", hubKey: "steam", color: "#1b2838", icon: <SteamIcon size={26} /> },
};

export async function generateMetadata({ params }: { params: Promise<{ plataforma: string }> }) {
  const { plataforma } = await params;
  const info = PLATAFORMAS[plataforma];
  return { title: info ? `${info.label} · Descubrir · Paragon` : "Descubrir · Paragon" };
}

export default async function PlataformaPage({ params }: { params: Promise<{ plataforma: string }> }) {
  const { plataforma } = await params;
  const info = PLATAFORMAS[plataforma];
  if (!info) notFound();

  const t = await getTranslations("Descubrir.PlataformaPage");
  const session = await auth();
  const userId = session?.user?.id;
  const esSteam = plataforma === "steam";

  const [tendencia, masJugados, recomendados, proximos, recientes, ofertas, psPlus, jugadoresBajos, noticias] = await Promise.all([
    trendingOnPlatform(info.hubKey),
    mostPlayedOnPlatform(info.hubKey),
    recommendationsOnPlatform(userId ?? null, info.hubKey),
    upcomingGames(8, plataforma as "playstation" | "steam").catch((e) => {
      if (!(e instanceof IgdbNotConfiguredError)) console.error("[plataforma-upcoming]", e);
      return [];
    }),
    // Mismo límite que upcomingGames (8): dos columnas una al lado de la
    // otra con listas de tamaños distintos se ven descuadradas, una mucho
    // más larga que la otra.
    recentReleases(8, plataforma as "playstation" | "steam").catch((e) => {
      if (!(e instanceof IgdbNotConfiguredError)) console.error("[plataforma-recent]", e);
      return [];
    }),
    esSteam ? ofertasSteam() : Promise.resolve([]),
    !esSteam ? getPsPlusMensual() : Promise.resolve(null),
    esSteam ? casiSinJugadoresEnSteam() : Promise.resolve([]),
    // Noticias propias de esta plataforma — no las generales de /noticias.
    // Solo tiene sentido en su propia página: mezclarlas en el resto de
    // Descubrir volvería a juntar cosas de plataformas distintas otra vez.
    esSteam ? getSteamNews() : getPsNews(),
  ]);

  return (
    <div>
      {/* Las listas de juegos son de servidor: sin esto habria que
          recargar a mano para ver un lanzamiento nuevo. */}
      <RefrescoAutomatico />
      <BackButton fallbackHref="/descubrir" />
      <div className="mb-6 flex items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: info.color }}
        >
          {info.icon}
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            <Link href="/descubrir" className="hover:underline">{t("breadcrumb")}</Link> / {info.label}
          </p>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide">{info.label}</h1>
        </div>
      </div>

      {noticias.length > 0 && (
        <div className="mb-10">
          <NewsFeed
            titulo={t("noticiasTitulo", { plataforma: info.label })}
            badge={esSteam ? t("badgeSteam") : t("badgePlaystation")}
            items={noticias}
          />
        </div>
      )}

      {recomendados.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">
            {userId ? t("recomendadoPara", { plataforma: info.label }) : t("popularEn", { plataforma: info.label })}
          </h2>
          <CardCarousel>
            {recomendados.map((g) => (
              <PosterCard key={g.igdbId} game={g} />
            ))}
          </CardCarousel>
        </section>
      )}

      {tendencia.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold uppercase tracking-wide">
            {t("tendenciaEnParagon")}
          </h2>
          <CardCarousel>
            {tendencia.map((g) => (
              <PosterCard
                key={g.igdbId}
                game={g}
                badge={
                  <span className="rounded-full bg-black/60 px-2 py-0.5 text-[0.625rem] font-bold text-white backdrop-blur-sm">
                    +{g.recientes}
                  </span>
                }
              />
            ))}
          </CardCarousel>
        </section>
      )}

      {masJugados.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 flex items-center gap-2 font-heading text-xl font-bold uppercase tracking-wide">
            {t("masJugados")}
          </h2>
          <p className="mb-4 text-sm text-muted">{t("masJugadosDescripcion", { plataforma: info.label })}</p>
          <RankedList items={masJugados} value={(g) => g.horas} valueLabel={(g) => `${g.horas} h`} />
        </section>
      )}

      {(proximos.length > 0 || recientes.length > 0) && (
        <div className="mb-10">
          {esSteam && (
            <p className="mb-4 text-sm text-muted">{t("avisoSteamIgdb")}</p>
          )}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {proximos.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold uppercase tracking-wide">
                  {t("proximosLanzamientos")}
                </h2>
                <ReleaseGrid items={proximos} />
              </section>
            )}

            {recientes.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold uppercase tracking-wide">
                  {t("ultimosLanzamientos")}
                </h2>
                <ReleaseGrid items={recientes} />
              </section>
            )}
          </div>
        </div>
      )}

      {psPlus && psPlus.juegos.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex flex-wrap items-baseline gap-3">
            <h2 className="flex items-center gap-2 font-heading text-xl font-bold uppercase tracking-wide">
              {psPlus.mes ? t("psPlusTituloConMes", { mes: psPlus.mes }) : t("psPlusTituloSinMes")}
            </h2>
            <a
              href={psPlus.link}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="ml-auto text-xs font-bold uppercase tracking-wide text-accent hover:underline"
            >
              {t("verAnuncio")}
            </a>
          </div>
          {/* Sony no siempre publica el anuncio del mes en curso el día 1 —
              esto es SIEMPRE el último post real del blog oficial, nunca una
              lista puesta a mano. Si el post tiene más de ~40 días, se avisa
              en vez de dejar que parezca el mes actual sin serlo. */}
          {psPlus.fecha && Date.now() - new Date(psPlus.fecha).getTime() > 40 * 86_400_000 && (
            <p className="-mt-2 mb-4 text-xs text-muted">
              {t("psPlusAviso", { fecha: relativeDate(psPlus.fecha) ?? "" })}
            </p>
          )}
          <GameGrid items={psPlus.juegos} itemKey={(g) => g.igdbId} columns="grid-cols-2 gap-3 sm:grid-cols-4">
            {(g) => <PosterCard game={{ ...g, genres: [] }} fluid />}
          </GameGrid>

          {/* Precio curado a mano, no en vivo — ver el aviso en lib/psPlus.ts
              sobre por qué (la página oficial de Sony devolvía un precio
              distinto en cada petición, no es una fuente fiable). */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(
              [
                { label: "Essential", precio: PRECIO_PSPLUS_EUR.essential },
                { label: "Extra", precio: PRECIO_PSPLUS_EUR.extra },
                { label: "Premium", precio: PRECIO_PSPLUS_EUR.premium },
              ] as const
            ).map((nivel) => (
              <div key={nivel.label} className="rounded-xl p-3.5 text-center" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                <p className="text-[0.625rem] font-bold uppercase tracking-widest text-muted">{nivel.label}</p>
                <p className="font-heading text-lg font-bold">{t("precioMes", { precio: nivel.precio.mes.toFixed(2) })}</p>
                <p className="text-[0.6875rem] text-muted">{t("precioAnual", { precio: nivel.precio.anual.toFixed(2) })}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[0.6875rem] text-muted">
            {t("preciosAviso", { fecha: relativeDate(PRECIO_PSPLUS_EUR.comprobadoEl) ?? "" })}
          </p>
        </section>
      )}

      {esSteam && ofertas.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 flex items-center gap-2 font-heading text-xl font-bold uppercase tracking-wide">
            {t("ofertasSteam")}
          </h2>
          <p className="mb-4 text-sm text-muted">{t("viaCheapshark")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {ofertas.map((oferta) => (
              <a
                key={oferta.url}
                href={oferta.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex flex-col overflow-hidden rounded-xl"
                style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={oferta.caratula} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <span className="absolute right-2 top-2 rounded-full bg-good px-2 py-0.5 text-[0.625rem] font-bold text-black">
                    -{oferta.ahorro}%
                  </span>
                </div>
                <div className="p-3">
                  <p className="truncate text-[0.8125rem] font-semibold">{oferta.titulo}</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-sm font-bold text-good">{oferta.precio.toFixed(2)} €</span>
                    <span className="text-xs text-muted line-through">{oferta.precioOriginal.toFixed(2)} €</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {esSteam && jugadoresBajos.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 flex items-center gap-2 font-heading text-xl font-bold uppercase tracking-wide">
            {t("jugadoresBajosTitulo")}
          </h2>
          <p className="mb-4 text-sm text-muted">
            {t("jugadoresBajosDescripcion")}
          </p>
          <RankedList items={jugadoresBajos} value={(g) => g.jugandoAhora} valueLabel={(g) => t("jugandoAhora", { n: g.jugandoAhora })} />
        </section>
      )}

      {!esSteam && (
        <p className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
          {t("avisoNoSteam")}
        </p>
      )}
    </div>
  );
}
