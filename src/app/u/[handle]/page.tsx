import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { LibraryGrid } from "@/components/LibraryGrid";
import { StatTile } from "@/components/StatTile";
import { TrophyCountRow } from "@/components/TrophyCounts";
import { UpcomingGames } from "@/components/UpcomingGames";
import { listCollections } from "@/lib/collections";
import { getLibrary, getProfileByHandle, getUserBadges } from "@/lib/profiles";
import { summarise } from "@/lib/stats";
import { FavoritePicker } from "@/components/FavoritePicker";
import { AddManualGameModal } from "@/components/AddManualGameModal";
import { coverGradient } from "@/lib/design";
import { ParagonWrap } from "@/components/ParagonWrap";
import { juegosDelAnio, resumenHistorico } from "@/lib/history";
import { Badges } from "@/components/Badges";
import { getWishlistIgdbIds } from "@/lib/manualGames";
import { Pegi } from "@/components/Pegi";
import { ParagonLevelCard } from "@/components/ParagonLevelCard";
import { ParagonAchievements } from "@/components/ParagonAchievements";
import { paragonProgress } from "@/lib/level";
import { CollectionProgress } from "@/components/CollectionProgress";

export default async function PerfilPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

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
  
  let wishlistIds: number[] = [];
  if (session?.user?.id) {
    wishlistIds = await getWishlistIgdbIds(session.user.id);
  }

  const backgroundGame = games.find((game) => game.id === profile.profileBackgroundGameId) ?? (games.length > 0 ? games[0] : null);
  const backgroundImage = backgroundGame?.iconUrl;

  return (
    <div className="-mx-7 -mt-9">
      <div
        className="relative overflow-hidden border-b border-border"
        style={{
          background: backgroundImage
            ? "var(--background)"
            : "radial-gradient(700px 320px at 25% 0%, rgb(var(--accent-rgb) / 0.18), transparent 70%)",
        }}
      >
        {backgroundImage && (
          <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              filter: "blur(40px) brightness(0.4)",
              opacity: 0.5,
              transform: "scale(1.1)",
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
          <Avatar src={player.avatarUrl} name={player.name} size={92} />

          <div className="min-w-0">
            <h1 className="font-heading text-[42px] font-bold uppercase leading-none">
              {profile.displayName ?? `@${handle}`}
            </h1>
            <p className="mt-2 text-sm text-muted">
              @{handle}
              {player.accounts.map((a) => ` · ${a.username}`).join("")}
            </p>
            {profile.profileTitle && <p className="mt-2 text-sm font-semibold text-accent-2">{profile.profileTitle}</p>}
            {badges.length > 0 && <Badges earnedBadges={badges} />}
          </div>

          {!esMio && (
            <Link
              href={`/comparar/${handle}`}
              className="ml-auto rounded-[10px] px-4 py-2.5 text-[13px] font-bold text-background"
              style={{ background: "var(--accent-grad)" }}
            >
              Comparar conmigo
            </Link>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] space-y-9 px-7 pb-24 pt-6">
        {games.length > 0 && (
          <ParagonWrap
            games={games}
            esteAnio={resumen.esteAnio}
            juegosEsteAnio={juegosEsteAnio}
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile value={stats.platinos} label="Platinos" accent="var(--platinum)" />
          <StatTile value={stats.trofeos} label="Trofeos" />
          <StatTile value={stats.juegos} label="Juegos" />
          <StatTile value={`${stats.completadoMedio}%`} label="Completado medio" />
        </div>

        <ParagonLevelCard progress={nivelParagon} />
        <ParagonAchievements games={games} earnedIds={badges.map((badge) => badge.badgeId)} />
        <CollectionProgress collections={carpetas} games={games} handle={handle} />

        {((profile.favorites?.length ?? 0) > 0 || esMio) && (
          <section className="mt-8 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold uppercase tracking-wide text-muted">Juegos Favoritos</h2>
              {esMio && <FavoritePicker allGames={games} currentFavorites={profile.favorites ?? []} />}
            </div>
            
            {(profile.favorites?.length ?? 0) > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(profile.favorites ?? []).map(gameId => {
                  const game = games.find(g => g.id === gameId);
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
        )}

        <TrophyCountRow counts={stats.counts} />

        {/* Antes esto iba debajo de la biblioteca, y la biblioteca son cientos
            de juegos con carga progresiva: había que llegar al fondo del todo
            para ver los lanzamientos. Va delante justamente por eso. */}
        <UpcomingGames wishlistedIgdbIds={wishlistIds} />

        <section>
          <div className="mb-4 flex flex-wrap items-center gap-3.5">
            <h2 className="font-heading text-2xl font-bold">Biblioteca</h2>
            <span className="text-[13px] text-muted">
              {games.length} juegos · del más reciente al más antiguo
            </span>
          </div>

          <LibraryGrid games={games} handle={handle} collections={carpetas} esMio={esMio} />
        </section>
      </div>
    </div>
  );
}
