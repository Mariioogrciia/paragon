import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { RefrescoAutomatico } from "@/components/RefrescoAutomatico";
import { auth } from "@/auth";
import { GameGrid } from "@/components/GameGrid";
import { RankedList } from "@/components/RankedList";
import { ReleaseGrid } from "@/components/ReleaseGrid";
import { CardCarousel } from "@/components/CardCarousel";
import { PosterCard } from "@/components/PosterCard";
import { PlayStationIcon, SteamIcon, EpicGamesIcon } from "@/lib/platformIcons";
import { CabeceraPlataforma } from "@/components/descubrir/CabeceraPlataforma";
import { TopComunidad } from "@/components/descubrir/Exitos";
import { getEpicGratis } from "@/lib/epicGratis";
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
  playstation: { label: "PlayStation", hubKey: "psn", color: "#0070d1", icon: <PlayStationIcon size={40} /> },
  steam: { label: "Steam", hubKey: "steam", color: "#1b2838", icon: <SteamIcon size={38} /> },
  // Epic (1 oct 2026): sincroniza biblioteca, así que tiene página. No da
  // horas ni noticias públicas; lo propio de Epic son sus juegos gratis.
  epic: { label: "Epic Games", hubKey: "epic", color: "#2a2a2a", icon: <EpicGamesIcon size={38} /> },
};

export async function generateMetadata({ params }: { params: Promise<{ plataforma: string }> }) {
  const { plataforma } = await params;
  const info = PLATAFORMAS[plataforma];
  return { title: info ? `${info.label} · Descubrir · Paragon` : "Descubrir · Paragon" };
}

export default async function PlataformaPage({ params }: { params: Promise<{ plataforma: string }> }) {
  const idioma = await getLocale();
  const { plataforma } = await params;
  const info = PLATAFORMAS[plataforma];
  if (!info) notFound();

  const t = await getTranslations("Descubrir.PlataformaPage");
  const session = await auth();
  const userId = session?.user?.id;
  const esSteam = plataforma === "steam";
  const esEpic = plataforma === "epic";
  const esPlaystation = plataforma === "playstation";

  const [tendencia, masJugados, recomendados, proximos, recientes, ofertas, psPlus, jugadoresBajos, noticias, epicGratis] = await Promise.all([
    trendingOnPlatform(info.hubKey),
    mostPlayedOnPlatform(info.hubKey),
    recommendationsOnPlatform(userId ?? null, info.hubKey),
    // IGDB no distingue tiendas de PC: Epic no tiene lanzamientos propios.
    esEpic ? Promise.resolve([]) : upcomingGames(8, plataforma as "playstation" | "steam").catch((e) => {
      if (!(e instanceof IgdbNotConfiguredError)) console.error("[plataforma-upcoming]", e);
      return [];
    }),
    // Mismo límite que upcomingGames (8): dos columnas una al lado de la
    // otra con listas de tamaños distintos se ven descuadradas, una mucho
    // más larga que la otra.
    esEpic ? Promise.resolve([]) : recentReleases(8, plataforma as "playstation" | "steam").catch((e) => {
      if (!(e instanceof IgdbNotConfiguredError)) console.error("[plataforma-recent]", e);
      return [];
    }),
    esSteam ? ofertasSteam() : Promise.resolve([]),
    esPlaystation ? getPsPlusMensual() : Promise.resolve(null),
    esSteam ? casiSinJugadoresEnSteam() : Promise.resolve([]),
    // Noticias propias de esta plataforma — no las generales de /noticias.
    // Solo tiene sentido en su propia página: mezclarlas en el resto de
    // Descubrir volvería a juntar cosas de plataformas distintas otra vez.
    esSteam ? getSteamNews() : esPlaystation ? getPsNews() : Promise.resolve([]),
    esEpic ? getEpicGratis() : Promise.resolve({ ahora: [], proximos: [] }),
  ]);
  const fechaCorta = (iso: string) =>
    new Date(iso).toLocaleDateString(idioma, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

  return (
    <div>
      {/* Las listas de juegos son de servidor: sin esto habria que
          recargar a mano para ver un lanzamiento nuevo. */}
      <RefrescoAutomatico />
      <BackButton fallbackHref="/descubrir" />
      <CabeceraPlataforma nombre={info.label} color={info.color} icono={info.icon} migas={t("breadcrumb")} />

      {esEpic && (epicGratis.ahora.length > 0 || epicGratis.proximos.length > 0) && (
        <section className="mb-12">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-heading text-2xl font-bold uppercase">{t("epicGratisTitulo")}</h2>
            <a
              href="https://store.epicgames.com/es-ES/free-games"
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="rounded-md px-1 text-xs font-bold uppercase tracking-wide text-[var(--accent-text)] hover:underline"
            >
              {t("epicVerTienda")}
            </a>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[...epicGratis.ahora.map((j) => ({ ...j, ya: true })), ...epicGratis.proximos.map((j) => ({ ...j, ya: false }))].map((j) => (
              <a key={j.url + j.inicio} href={j.url} target="_blank" rel="noopener noreferrer nofollow" className="group block rounded-xl">
                <span className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-[var(--surface-2)]">
                  {j.imagen && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={j.imagen} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  )}
                  <span
                    className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-[0.6875rem] font-bold uppercase"
                    style={j.ya ? { background: "var(--accent)", color: "var(--background)" } : { background: "rgb(0 0 0 / 0.7)", color: "#fff" }}
                  >
                    {j.ya ? t("epicGratisAhora") : t("epicGratisPronto")}
                  </span>
                </span>
                <span className="mt-2 block truncate text-sm font-semibold transition-colors group-hover:text-[var(--accent-text)]">{j.titulo}</span>
                <span className="block text-xs text-muted">
                  {j.ya ? t("epicHasta", { fecha: fechaCorta(j.fin) }) : t("epicDesde", { fecha: fechaCorta(j.inicio) })}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {noticias.length > 0 && (
        <div className="mb-12">
          <NewsFeed
            titulo={t("noticiasTitulo", { plataforma: info.label })}
            badge={esSteam ? t("badgeSteam") : t("badgePlaystation")}
            items={noticias}
          />
        </div>
      )}

      {recomendados.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 font-heading text-2xl font-bold uppercase">
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
        <div className="mb-12">
          <TopComunidad items={tendencia} titulo={t("tendenciaEnParagon")} descripcion={t("tendenciaDescripcion", { plataforma: info.label })} />
        </div>
      )}

      {masJugados.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-1 font-heading text-2xl font-bold uppercase">
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
                <h2 className="mb-4 font-heading text-2xl font-bold uppercase">
                  {t("proximosLanzamientos")}
                </h2>
                <ReleaseGrid items={proximos} />
              </section>
            )}

            {recientes.length > 0 && (
              <section>
                <h2 className="mb-4 font-heading text-2xl font-bold uppercase">
                  {t("ultimosLanzamientos")}
                </h2>
                <ReleaseGrid items={recientes} />
              </section>
            )}
          </div>
        </div>
      )}

      {psPlus && psPlus.juegos.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex flex-wrap items-baseline gap-3">
            <h2 className="font-heading text-2xl font-bold uppercase">
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
          {/* eslint-disable-next-line react-hooks/purity -- Server Component: se renderiza una vez por petición, Date.now() es la hora de esa petición. */}
          {psPlus.fecha && Date.now() - new Date(psPlus.fecha).getTime() > 40 * 86_400_000 && (
            <p className="-mt-2 mb-4 text-xs text-muted">
              {t("psPlusAviso", { fecha: relativeDate(psPlus.fecha, idioma) ?? "" })}
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
            {t("preciosAviso", { fecha: relativeDate(PRECIO_PSPLUS_EUR.comprobadoEl, idioma) ?? "" })}
          </p>
        </section>
      )}

      {esSteam && ofertas.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-1 font-heading text-2xl font-bold uppercase">
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
                  <img loading="lazy" decoding="async" src={oferta.caratula} alt="" className="absolute inset-0 h-full w-full object-cover" />
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
        <section className="mb-12">
          <h2 className="mb-1 font-heading text-2xl font-bold uppercase">
            {t("jugadoresBajosTitulo")}
          </h2>
          <p className="mb-4 text-sm text-muted">
            {t("jugadoresBajosDescripcion")}
          </p>
          <RankedList items={jugadoresBajos} value={(g) => g.jugandoAhora} valueLabel={(g) => t("jugandoAhora", { n: g.jugandoAhora })} />
        </section>
      )}

      {esPlaystation && (
        <p className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
          {t("avisoNoSteam")}
        </p>
      )}
    </div>
  );
}
