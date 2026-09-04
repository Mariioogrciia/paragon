import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { GameGrid } from "@/components/GameGrid";
import { RankedList } from "@/components/RankedList";
import { ReleaseGrid } from "@/components/ReleaseGrid";
import { CardCarousel } from "@/components/CardCarousel";
import { PosterCard } from "@/components/PosterCard";
import { PlayStationIcon, SteamIcon } from "@/lib/platformIcons";
import {
  trendingOnPlatform,
  mostPlayedOnPlatform,
  recommendationsOnPlatform,
  casiSinJugadoresEnSteam,
  type PlataformaHub,
} from "@/lib/platformHub";
import { upcomingGames, recentReleases, IgdbNotConfiguredError } from "@/lib/igdb/client";
import { ofertasSteam } from "@/lib/prices";
import { getPsPlusMensual } from "@/lib/psPlus";

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

  const session = await auth();
  const userId = session?.user?.id;
  const esSteam = plataforma === "steam";

  const [tendencia, masJugados, recomendados, proximos, recientes, ofertas, psPlus, jugadoresBajos] = await Promise.all([
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
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: info.color }}
        >
          {info.icon}
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            <Link href="/descubrir" className="hover:underline">Descubrir</Link> / {info.label}
          </p>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide">{info.label}</h1>
        </div>
      </div>

      {recomendados.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">
            {userId ? "Recomendado para ti en " : "Popular en "}
            {info.label}
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
            Tendencia en Paragon
          </h2>
          <CardCarousel>
            {tendencia.map((g) => (
              <PosterCard
                key={g.igdbId}
                game={g}
                badge={
                  <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
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
            Los más jugados en Paragon
          </h2>
          <p className="mb-4 text-sm text-muted">Por horas registradas de quien tiene cuenta vinculada aquí, no un dato global de {info.label}.</p>
          <RankedList items={masJugados} value={(g) => g.horas} valueLabel={(g) => `${g.horas} h`} />
        </section>
      )}

      {(proximos.length > 0 || recientes.length > 0) && (
        <div className="mb-10">
          {esSteam && (
            <p className="mb-4 text-sm text-muted">IGDB no distingue Steam de otras tiendas de PC — puede incluir Epic, GOG u otras.</p>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            {proximos.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold uppercase tracking-wide">
                  Próximos lanzamientos destacados
                </h2>
                <ReleaseGrid items={proximos} />
              </section>
            )}

            {recientes.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold uppercase tracking-wide">
                  Últimos lanzamientos
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
              PlayStation Plus — juegos del mes
            </h2>
            <a
              href={psPlus.link}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="ml-auto text-xs font-bold uppercase tracking-wide text-accent hover:underline"
            >
              Ver el anuncio →
            </a>
          </div>
          <GameGrid items={psPlus.juegos} itemKey={(g) => g.igdbId} columns="grid-cols-2 gap-3 sm:grid-cols-4">
            {(g) => <PosterCard game={{ ...g, genres: [] }} fluid />}
          </GameGrid>
        </section>
      )}

      {esSteam && ofertas.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 flex items-center gap-2 font-heading text-xl font-bold uppercase tracking-wide">
            Ofertas en Steam
          </h2>
          <p className="mb-4 text-sm text-muted">Vía CheapShark.</p>
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
                  <span className="absolute right-2 top-2 rounded-full bg-good px-2 py-0.5 text-[10px] font-bold text-black">
                    -{oferta.ahorro}%
                  </span>
                </div>
                <div className="p-3">
                  <p className="truncate text-[13px] font-semibold">{oferta.titulo}</p>
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
            Casi sin jugadores ahora mismo
          </h2>
          <p className="mb-4 text-sm text-muted">
            Contador público de Steam, en vivo — solo de los juegos de Steam que ya hay catalogados aquí, no un barrido de todo Steam.
          </p>
          <RankedList items={jugadoresBajos} value={(g) => g.jugandoAhora} valueLabel={(g) => `${g.jugandoAhora} jugando`} />
        </section>
      )}

      {!esSteam && (
        <p className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
          Sony no publica cuánta gente juega cada título ahora mismo (ni ofertas de PS Store) — a diferencia de Steam, no hay
          fuente pública para esos dos datos, así que no aparecen aquí.
        </p>
      )}
    </div>
  );
}
