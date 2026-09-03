import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { LibraryGrid } from "@/components/LibraryGrid";
import { StatTile } from "@/components/StatTile";
import { TrophyCountRow } from "@/components/TrophyCounts";
import { listCollections } from "@/lib/collections";
import { getLibrary, getProfileByHandle, getUserBadges } from "@/lib/profiles";
import { summarise, type GameStatus } from "@/lib/stats";
import { db } from "@/db";
import { gameTrophies } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { FavoritePicker } from "@/components/FavoritePicker";
import { AddManualGameModal } from "@/components/AddManualGameModal";
import { coverGradient } from "@/lib/design";
import { ParagonWrap } from "@/components/ParagonWrap";
import { juegosDelAnio, resumenHistorico } from "@/lib/history";
import { Badges } from "@/components/Badges";
import { Pegi } from "@/components/Pegi";
import { ParagonLevelCard } from "@/components/ParagonLevelCard";
import { ParagonAchievements } from "@/components/ParagonAchievements";
import { paragonProgress } from "@/lib/level";
import { CollectionProgress } from "@/components/CollectionProgress";
import { ShowcaseTrophies } from "@/components/ShowcaseTrophies";
import { AvatarFrame } from "@/components/AvatarFrame";
import { normalizeSectionOrder } from "@/lib/profileSections";
import { PlatformBanner } from "@/components/BannerPresets";
import { bannerPresetKey } from "@/lib/bannerPresets";

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : null;
}

const ESTADOS_VALIDOS = [
  "platinado",
  "completado",
  "en-curso",
  "sin-empezar",
  "deseados",
  "a-punto",
  "abandonado",
];

export default async function PerfilPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ estado?: string }>;
}) {
  const { handle } = await params;
  const { estado } = await searchParams;
  const initialStatus = ESTADOS_VALIDOS.includes(estado ?? "")
    ? (estado as GameStatus)
    : undefined;

  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const session = await auth();
  const esMio = session?.user?.id === profile.userId;

  const { player, games } = await getLibrary(profile);

  // Antes esto cortaba en seco si no había cuenta vinculada. Ya no vale: un
  // perfil puede tener solo juegos añadidos a mano y ninguna cuenta de PSN o
  // Steam, y aun así tiene biblioteca que enseñar.
  if (profile.accounts.length === 0 && games.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-medium">@{handle}</h1>
        <p className="mt-2 text-sm text-muted">
          {esMio
            ? "Todavía no has vinculado ninguna cuenta ni añadido ningún juego."
            : "Todavía no ha vinculado ninguna cuenta de juego."}
        </p>
        {esMio && (
          <div className="flex justify-center mt-4">
            <AddManualGameModal />
          </div>
        )}
      </div>
    );
  }
  const stats = summarise(games);
  const nivelParagon = paragonProgress(games);
  // Las carpetas del dueño del perfil: son parte de cómo ordena su biblioteca.
  const carpetas = await listCollections(profile.userId);
  const resumen = await resumenHistorico(profile.userId);
  const juegosEsteAnio = await juegosDelAnio(profile.userId);
  const badges = await getUserBadges(profile.userId);

  const showcaseTrophyIds = profile.showcaseTrophies?.map(p => p.trophyId) ?? [];
  const showcaseTrophiesData = showcaseTrophyIds.length > 0 
    ? await db.select().from(gameTrophies).where(inArray(gameTrophies.trophyId, showcaseTrophyIds))
    : [];

  const backgroundGame = games.find((game) => game.id === profile.profileBackgroundGameId) ?? (games.length > 0 ? games[0] : null);
  // Un banner de plataforma (arte propio de Paragon, ver BannerPresets.tsx)
  // viene marcado como "preset:<clave>" en vez de una URL de verdad.
  const presetBanner = bannerPresetKey(profile.profileBannerUrl);
  const backgroundImage = !presetBanner && (profile.profileBannerUrl || backgroundGame?.iconUrl);
  // Un banner en vídeo se detecta por extensión y se pinta con <video>, no
  // como background-image (que no sabe reproducir vídeo).
  const backgroundEsVideo = Boolean(backgroundImage && profile.profileBannerUrl && /\.(mp4|webm)$/i.test(profile.profileBannerUrl));

  const customStyle: any = {};
  if (profile.profileColor) {
    customStyle["--accent"] = profile.profileColor;
    const rgb = hexToRgb(profile.profileColor);
    if (rgb) customStyle["--accent-rgb"] = rgb;
  }

  // El tema del perfil solo pinta este contenedor: no toca el modo del
  // visitante, que sigue siendo el suyo en el resto del sitio.
  const temaClase = profile.theme && profile.theme !== "dark" ? profile.theme : "";

  return (
    <div className={`-mx-7 -mt-9 ${temaClase}`} style={customStyle}>
      <div
        className="relative overflow-hidden border-b border-border"
        style={{
          background: backgroundImage || presetBanner
            ? "var(--background)"
            : "radial-gradient(700px 320px at 25% 0%, rgb(var(--accent-rgb) / 0.18), transparent 70%)",
        }}
      >
        {presetBanner && <PlatformBanner preset={presetBanner} className="absolute inset-0 z-0 h-full w-full" />}
        {backgroundImage && backgroundEsVideo && (
          <video
            src={profile.profileBannerUrl!}
            className="absolute inset-0 z-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        )}
        {backgroundImage && !backgroundEsVideo && (
          <div
            className={`absolute inset-0 z-0 bg-cover bg-center bg-no-repeat ${profile.profileBannerUrl ? "perfil-banner-parallax" : ""}`}
            style={{
              backgroundImage: `url(${backgroundImage})`,
              ...(profile.profileBannerUrl
                ? {}
                : {
                    filter: "blur(40px) brightness(0.4)",
                    opacity: 0.5,
                    transform: "scale(1.1)",
                  }),
            }}
          />
        )}
        
        {/* Capa de acento sutil encima del blur */}
        {backgroundImage && (
          <div 
            className="absolute inset-0 z-0 mix-blend-overlay"
            style={{ background: "radial-gradient(700px 320px at 25% 0%, rgb(var(--accent-rgb) / 0.3), transparent 80%)" }}
          />
        )}

        <div className="relative z-10 mx-auto flex max-w-[1240px] flex-wrap items-end gap-5 px-7 pb-8 pt-10">
          <AvatarFrame frame={profile.profileFrame}>
            <Avatar src={player.avatarUrl} name={player.name} size={92} />
          </AvatarFrame>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-heading text-[42px] font-bold uppercase leading-none">
                {profile.displayName ?? `@${handle}`}
              </h1>
              {profile.esDesarrollador && (
                <span
                  className="mb-1 inline-flex items-center gap-1.5 self-end rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em]"
                  style={{ background: "rgba(159, 212, 236, 0.14)", border: "1px solid rgba(159, 212, 236, 0.35)", color: "#9fd4ec" }}
                  title="Esta cuenta es de quien hace Paragon"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  Desarrollador
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-muted">
              @{handle}
              {player.accounts.map((a) => ` · ${a.username}`).join("")}
            </p>
            {profile.statusText && (
              <p className="mt-2 text-sm italic opacity-80" style={{ color: "var(--foreground)" }}>
                &quot;{profile.statusText}&quot;
              </p>
            )}
            {profile.profileTitle && <p className="mt-2 text-sm font-semibold text-[rgb(var(--accent-rgb))]">{profile.profileTitle}</p>}
            {badges.length > 0 && <Badges earnedBadges={badges} />}
          </div>

          <Link
            href={`/u/${handle}/cv`}
            className={`${esMio ? "ml-auto" : ""} rounded-[10px] px-4 py-2.5 text-[13px] font-bold`}
            style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}
          >
            Hoja de servicios
          </Link>

          {!esMio && (
            <Link
              href={`/comparar/${handle}`}
              className="rounded-[10px] px-4 py-2.5 text-[13px] font-bold text-background"
              style={{ background: "var(--accent-grad)" }}
            >
              Comparar conmigo
            </Link>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] space-y-9 px-7 pb-24 pt-6">
        {(() => {
          // Cada sección se define una vez, con su clave; el orden en que
          // salen en pantalla lo decide `profile.profileSectionOrder`
          // (editable en /ajustes), no este objeto. Si el orden guardado
          // falta una clave nueva, `normalizeSectionOrder` la añade al final.
          const secciones: Partial<Record<string, ReactNode>> = {
            wrap: games.length > 0 && (
              <ParagonWrap
                key="wrap"
                games={games}
                esteAnio={resumen.esteAnio}
                juegosEsteAnio={juegosEsteAnio}
                handle={handle}
              />
            ),
            stats: (
              <div key="stats" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile value={stats.platinos} label="Platinos" accent="var(--platinum)" />
                <StatTile value={stats.trofeos} label="Trofeos" />
                <StatTile value={stats.juegos} label="Juegos" />
                <StatTile value={`${stats.completadoMedio}%`} label="Completado medio" />
              </div>
            ),
            level: <ParagonLevelCard key="level" progress={nivelParagon} />,
            achievements: (
              <ParagonAchievements key="achievements" games={games} earnedIds={badges.map((badge) => badge.badgeId)} />
            ),
            collections: <CollectionProgress key="collections" collections={carpetas} games={games} handle={handle} />,
            showcase: (
              <ShowcaseTrophies
                key="showcase"
                handle={handle}
                items={(profile.showcaseTrophies ?? [])
                  .map((pin) => {
                    const game = games.find((g) => g.id === pin.gameId);
                    if (!game) return null;
                    const trophyRaw = showcaseTrophiesData.find((t) => t.trophyId === pin.trophyId);
                    if (!trophyRaw) return null;
                    const trophy = {
                      ...trophyRaw,
                      id: trophyRaw.trophyId,
                      earned: true,
                      grade: trophyRaw.grade ?? undefined,
                      // La fila de la tabla admite null (columna sin valor); el
                      // tipo Trophy usa undefined para "no hay" — el mismo ajuste
                      // que ya se hace arriba con `grade`.
                      iconUrl: trophyRaw.iconUrl ?? undefined,
                      groupName: trophyRaw.groupName ?? undefined,
                    };
                    return { game, trophy };
                  })
                  .filter((item): item is NonNullable<typeof item> => item !== null)}
              />
            ),
            favoritos: ((profile.favorites?.length ?? 0) > 0 || esMio) && (
              <section key="favoritos" className="mt-8 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-xl font-bold uppercase tracking-wide text-muted">Juegos Favoritos</h2>
                  {esMio && <FavoritePicker allGames={games} currentFavorites={profile.favorites ?? []} />}
                </div>

                {(profile.favorites?.length ?? 0) > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {(profile.favorites ?? []).map((gameId) => {
                      const game = games.find((g) => g.id === gameId);
                      if (!game) return null;
                      return (
                        <Link key={game.id} href={`/u/${handle}/${game.id}`}>
                          <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-border/50 group transition-all hover:scale-105 hover:shadow-xl hover:border-accent" style={{ background: coverGradient(game.id) }}>
                            {game.iconUrl && (
                              <div
                                className="absolute inset-0 bg-contain bg-center bg-no-repeat transition-transform group-hover:scale-110"
                                style={{ backgroundImage: `url(${game.iconUrl})`, margin: '10% 10% 30% 10%' }}
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                            {game.pegi && <span className="absolute right-3 top-3"><Pegi edad={game.pegi} /></span>}
                            <div className="absolute bottom-3 left-3 right-3 text-sm font-bold text-white leading-tight drop-shadow-md">
                              {game.title}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center border border-dashed rounded-xl border-border bg-surface text-muted text-sm">
                    Aún no has fijado tus juegos favoritos.
                  </div>
                )}
              </section>
            ),
            biblioteca: (
              <div key="biblioteca" className="space-y-9">
                <TrophyCountRow counts={stats.counts} />
                <section>
                  <div className="mb-4 flex flex-wrap items-center gap-3.5">
                    <h2 className="font-heading text-2xl font-bold">Biblioteca</h2>
                    <span className="text-[13px] text-muted">
                      {games.length} juegos · del más reciente al más antiguo
                    </span>
                  </div>

                  <LibraryGrid games={games} handle={handle} collections={carpetas} esMio={esMio} initialStatus={initialStatus} />
                </section>
              </div>
            ),
          };

          return normalizeSectionOrder(profile.profileSectionOrder).map((clave) => secciones[clave] || null);
        })()}
      </div>
    </div>
  );
}
