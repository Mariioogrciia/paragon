import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { StatTile } from "@/components/StatTile";
import { getLibrary, getProfileByHandle, getUserBadges, getFriendshipStatus } from "@/lib/profiles";
import { PLATFORM_LABEL } from "@/lib/types";
import { FriendRequestButton } from "@/components/FriendRequestButton";
import { summarise } from "@/lib/stats";
import { db } from "@/db";
import { gameTrophies } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { FavoritePicker } from "@/components/FavoritePicker";
import { AddManualGameModal } from "@/components/AddManualGameModal";
import { ImportLibraryModal } from "@/components/ImportLibraryModal";
import { TiltCard } from "@/components/TiltCard";
import { coverGradient } from "@/lib/design";
import { ParagonWrap } from "@/components/ParagonWrap";
import { juegosDelAnio, rachas as rachasDe, resumenHistorico, ultimosTrofeos } from "@/lib/history";
import { percentilTrofeosAnio } from "@/lib/wrapPercentile";
import { RecentTrophies } from "@/components/RecentTrophies";
import { Badges } from "@/components/Badges";
import { Pegi } from "@/components/Pegi";
import { ParagonLevelCard } from "@/components/ParagonLevelCard";
import { ParagonAchievements } from "@/components/ParagonAchievements";
import { paragonProgress } from "@/lib/level";
import { ShowcaseTrophies } from "@/components/ShowcaseTrophies";
import { TrophyCase } from "@/components/TrophyCase";
import { getUserTrophyCase } from "@/lib/trophyCase";
import { AvatarFrame } from "@/components/AvatarFrame";
import { normalizeSectionOrder } from "@/lib/profileSections";
import { PlatformBanner } from "@/components/BannerPresets";
import { bannerPresetKey } from "@/lib/bannerPresets";
import { BackButton } from "@/components/BackButton";
import { ProfileTabsNav } from "@/components/ProfileTabsNav";
import { PinnedGameBanner } from "@/components/PinnedGameBanner";
import { getOrComputeAuraColor } from "@/lib/coverAura";
import { getUserClan } from "@/lib/clans";


function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : null;
}

/**
 * Metadatos sociales del perfil. La IMAGEN no se declara aquí: la pone sola
 * `opengraph-image.tsx` (convención de archivo de Next), que vive en esta
 * misma carpeta.
 *
 * Los números van en la descripcion a proposito: "1.240 trofeos y 24
 * platinos" da una razon para pulsar el enlace que "Perfil de Paragon" no
 * da. Se reusa `getProfileByHandle`, que ya cachea por peticion, asi que
 * esto no duplica consultas con el render de la pagina.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const t = await getTranslations("Perfil");
  const profile = await getProfileByHandle(handle);
  if (!profile) return { title: t("PerfilPage.metaNoEncontrado") };

  const { games } = await getLibrary(profile);
  const stats = summarise(games);
  const nombre = profile.displayName ?? handle;
  const titulo = `${nombre} (@${handle}) · Paragon`;
  const descripcion =
    games.length === 0
      ? t("PerfilPage.metaDescripcionVacia", { nombre })
      : t("PerfilPage.metaDescripcionStats", {
          trofeos: stats.trofeos.toLocaleString("es-ES"),
          platinos: stats.platinos.toLocaleString("es-ES"),
          juegos: stats.juegos.toLocaleString("es-ES"),
        });

  return {
    title: titulo,
    description: descripcion,
    openGraph: { title: titulo, description: descripcion, type: "profile" },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion },
  };
}

export default async function PerfilPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const t = await getTranslations("Perfil");

  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const session = await auth();
  const esMio = session?.user?.id === profile.userId;

  const { player, games } = await getLibrary(profile);

  // Antes esto cortaba en seco si no había cuenta vinculada. Ya no vale: un
  // perfil puede tener solo juegos añadidos a mano y ninguna cuenta de PSN o
  // Steam, y aun así tiene biblioteca que enseñar.
  //
  // Bug real reportado por el usuario (23 sept 2026): a una cuenta nueva
  // (Steam vinculado, pero privado — "Detalles del juego" no está en
  // público, aunque el perfil sí) no le salía NINGÚN juego ni trofeo, y
  // este bloque no lo cubría porque `profile.accounts.length` no era 0 —
  // caía en la biblioteca normal, vacía, sin ninguna explicación de por
  // qué. El error real ya se explica al vincular (linkPlatform,
  // actions.ts), pero solo se ve una vez, en ese momento — quien no lo
  // lea entonces se queda sin ninguna pista después.
  const cuentasPrivadas = profile.accounts.filter((a) => !a.isPublic);
  const soloCuentasPrivadas = profile.accounts.length > 0 && cuentasPrivadas.length === profile.accounts.length;

  if ((profile.accounts.length === 0 || soloCuentasPrivadas) && games.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-medium">@{handle}</h1>
        <p className="mt-2 text-sm text-muted">
          {soloCuentasPrivadas
            ? (esMio
                ? t("PerfilPage.cuentaPrivadaPropio", { plataforma: PLATFORM_LABEL[cuentasPrivadas[0].platform] })
                : t("PerfilPage.cuentaPrivadaAjeno"))
            : (esMio
                ? t("PerfilPage.sinCuentaPropio")
                : t("PerfilPage.sinCuentaAjeno"))}
        </p>
        {soloCuentasPrivadas && cuentasPrivadas[0].platform === "steam" && (
          <p className="mx-auto mt-3 max-w-sm text-xs text-muted">
            {t("PerfilPage.cuentaPrivadaSteamDetalle")}
          </p>
        )}
        {esMio && soloCuentasPrivadas && (
          <Link href="/ajustes/plataformas" className="mt-4 inline-block text-sm font-bold text-[rgb(var(--accent-rgb))] hover:underline">
            {t("PerfilPage.irAAjustesPlataformas")}
          </Link>
        )}
        {esMio && (
          <div className="flex justify-center mt-4 gap-3">
            <ImportLibraryModal />
            <AddManualGameModal />
          </div>
        )}
      </div>
    );
  }
  const stats = summarise(games);
  const nivelParagon = paragonProgress(games);
  // Paralelizado EN TANDAS DE 3, no todo de golpe — y esto tiene historia.
  //
  // El 6 de septiembre de 2026 se intentó un `Promise.all` con las cinco
  // consultas a la vez y una petición se quedó colgada más de 60s; se
  // revirtió a secuencial y quedó escrito "no paralelizar aquí". La causa
  // real se encontró después, midiendo: NO era la concurrencia. Era una
  // conexión del pool que se quedaba zombi (el pool no tenía `idle_timeout`
  // ni `max_lifetime`, así que un socket colgado ocupaba su hueco para
  // siempre — ver db/index.ts, ya arreglado). Con la base sana, el mismo
  // `select` que tardaba 60s desde la app tarda 49ms medido directamente.
  //
  // Aun así se paraleliza acotado a 3, no todo de golpe: el pool sigue
  // siendo de 5 conexiones compartidas con todo lo demás que renderiza esta
  // página a la vez. Tres deja margen de sobra y ya se lleva la mayor parte
  // de la mejora — de ahí las tres tandas de abajo, cada una con `Promise.all`
  // pero ninguna con más de 3 queries a la vez (la última cuenta 3: las 2 de
  // rachas/percentil que ya iban juntas, más el estado de amistad).
  // `listCollections` ya no se pide aquí: las carpetas se enseñaban en la
  // sección "Colecciones", que vive ahora en /u/[handle]/biblioteca.
  // Pública igual que el resto de la ficha: se ve tanto en tu propio
  // perfil como en el de cualquiera que lo visite.
  const [resumen, juegosEsteAnio, badges] = await Promise.all([
    resumenHistorico(profile.userId),
    juegosDelAnio(profile.userId),
    getUserBadges(profile.userId),
  ]);
  const [recientes, palmares, clanMembership] = await Promise.all([
    ultimosTrofeos(profile.userId),
    getUserTrophyCase(profile.userId),
    getUserClan(profile.userId),
  ]);
  const [[rachasPerfil, percentilAnio], estadoAmistad] = await Promise.all([
    games.length > 0
      ? Promise.all([rachasDe(profile.userId), percentilTrofeosAnio(profile.userId)])
      : Promise.resolve([{ actual: 0, mejor: 0, diasActivos: 0, hoyCuenta: false }, null] as const),
    // Solo hace falta si estás mirando el perfil de otra persona con
    // sesión iniciada — nadie más lo va a ver.
    !esMio && session?.user?.id
      ? getFriendshipStatus(session.user.id, profile.userId)
      : Promise.resolve("ninguna" as const),
  ]);

  const showcaseTrophyIds = profile.showcaseTrophies?.map(p => p.trophyId) ?? [];
  const showcaseTrophiesData = showcaseTrophyIds.length > 0 
    ? await db.select().from(gameTrophies).where(inArray(gameTrophies.trophyId, showcaseTrophyIds))
    : [];

  // Ojo: NO conflar "hay backgroundGame" con "se encontró el juego
  // elegido" — antes de este cambio `backgroundGame` ya caía a `games[0]`
  // como último recurso, así que un `profileBackgroundGameId` que no
  // aparece en `games` (biblioteca resincronizada, cuenta desvinculada...)
  // daba igual un objeto no-null, y el código de más abajo lo trataba como
  // "elección explícita encontrada" — el fondo se quedaba pegado siempre al
  // mismo `games[0]`, sin importar qué juego se eligiera de verdad. Bug
  // real reportado tras el primer arreglo: "elijo otro juego y el fondo no
  // cambia nunca".
  const juegoDeFondoEncontrado = profile.profileBackgroundGameId
    ? games.find((game) => game.id === profile.profileBackgroundGameId)
    : undefined;
  const backgroundGame = juegoDeFondoEncontrado ?? (games.length > 0 ? games[0] : null);
  // Un banner de plataforma (arte propio de Paragon, ver BannerPresets.tsx)
  // viene marcado como "preset:<clave>" en vez de una URL de verdad.
  const presetBanner = bannerPresetKey(profile.profileBannerUrl);
  // Bug real reportado: con cualquier banner puesto (subido o preset), el
  // selector "Juego para el fondo" de Ajustes no tenía ningún efecto —
  // ganaba siempre el banner, sin avisar de nada. Un juego elegido A
  // PROPÓSITO (encontrado de verdad en la biblioteca, no el `games[0]` de
  // último recurso) es la elección más explícita de las dos, así que gana
  // ella; sin elección explícita (o si ya no se encuentra), se mantiene el
  // orden de siempre (banner > portada del primer juego).
  const juegoDeFondoElegido = Boolean(juegoDeFondoEncontrado);
  const backgroundImage = juegoDeFondoElegido
    ? backgroundGame?.iconUrl
    : !presetBanner && (profile.profileBannerUrl || backgroundGame?.iconUrl);
  // Un banner en vídeo se detecta por extensión y se pinta con <video>, no
  // como background-image (que no sabe reproducir vídeo). Con un juego de
  // fondo elegido a propósito, `backgroundImage` ya no es el banner (es la
  // portada del juego) — sin este `!juegoDeFondoElegido`, un banner en
  // vídeo puesto de antes se intentaba reproducir con la URL de la
  // portada, que no es ningún vídeo.
  const backgroundEsVideo = !juegoDeFondoElegido && Boolean(backgroundImage && profile.profileBannerUrl && /\.(mp4|webm)$/i.test(profile.profileBannerUrl));
  // `iconUrl` de un juego es la carátula/icono de trofeos (pensado para un
  // cuadrado pequeño, no una cabecera ancha) — estirada a pantalla completa
  // SIN desenfoque se ve pixelada de verdad (reportado con captura). El
  // tratamiento de "fondo ambiental" (blur+oscurecido+zoom, ya existía para
  // el respaldo silencioso de `games[0]`) tiene que aplicarse en CUALQUIER
  // caso donde lo que se ve es una carátula suelta, no arte de banner de
  // verdad — antes solo miraba `!profile.profileBannerUrl`, así que un
  // juego de fondo elegido a propósito con un banner también puesto se
  // enseñaba SIN el tratamiento, nítido y sin oscurecer.
  const fondoEsCaratulaSuelta = Boolean(juegoDeFondoElegido) || !profile.profileBannerUrl;

  const customStyle: any = {};
  if (profile.profileColor) {
    customStyle["--accent"] = profile.profileColor;
    const rgb = hexToRgb(profile.profileColor);
    if (rgb) customStyle["--accent-rgb"] = rgb;
  }

  // El tema del perfil solo pinta este contenedor: no toca el modo del
  // visitante, que sigue siendo el suyo en el resto del sitio.
  const temaClase = profile.theme && profile.theme !== "dark" ? profile.theme : "";

  // Game Aura del objetivo anclado (ver lib/coverAura.ts) — solo se pide
  // para ESE juego, no para toda la biblioteca, así que es una consulta
  // más (cacheada para siempre tras la primera vez), no N.
  const juegoAnclado = games.find((g) => g.isPinned);
  const auraAnclado = juegoAnclado ? await getOrComputeAuraColor(juegoAnclado.id, juegoAnclado.iconUrl) : null;

  return (
    <div className={`-mx-4 -mt-9 sm:-mx-7 ${temaClase}`} style={customStyle}>
      <div
        className="relative overflow-hidden border-b border-border"
        style={{
          background: backgroundImage || presetBanner
            ? "var(--background)"
            : "radial-gradient(700px 320px at 25% 0%, rgb(var(--accent-rgb) / 0.18), transparent 70%)",
        }}
      >
        {/*
          Bug real, reportado con captura: `presetBanner` se calcula solo a
          partir de `profileBannerUrl`, sin mirar si hay un juego de fondo
          elegido — así que el SVG del preset se seguía pintando DEBAJO de
          la carátula del juego (que va al 50% de opacidad), y como el
          preset es arte vivo y la carátula sale desenfocada y oscurecida,
          el preset ganaba a simple vista aunque "backgroundImage" ya fuera
          la carátula correcta. `!juegoDeFondoElegido` es justo lo que
          faltaba: el juego elegido a propósito gana también aquí, no solo
          en qué URL se usa.
        */}
        {/*
          Bug real, reportado con captura ("la imagen de fondo no se ve
          bien"): estas capas usaban `inset-0`/`h-full`, que las estira a lo
          alto que sea el contenedor — y ese contenedor no tiene alto fijo,
          crece con SU CONTENIDO (nombre, handle, cuentas, título, badges,
          palmarés, botones). En móvil ese contenido se apila en muchas más
          líneas que en escritorio, así que el contenedor podía pasar de
          fácil los 700-800px; una imagen pequeña ya desenfocada, estirada a
          cubrir esa altura con `bg-cover`, no deja ver nada reconocible —
          solo el borrón uniforme del centro. Franja de alto FIJO en vez de
          "todo el contenedor": el resto del contenido, más abajo, se queda
          sobre el fondo plano de siempre (`var(--background)`, ya puesto
          más arriba), que es sólido y no depende de ninguna imagen.
        */}
        <div className="absolute inset-x-0 top-0 z-0 h-[220px] overflow-hidden sm:h-[320px]">
          {presetBanner && !juegoDeFondoElegido && <PlatformBanner preset={presetBanner} className="absolute inset-0 h-full w-full" />}
          {backgroundImage && backgroundEsVideo && (
            <video
              src={profile.profileBannerUrl!}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          )}
          {backgroundImage && !backgroundEsVideo && (
            <div
              className={`absolute inset-0 bg-cover bg-center bg-no-repeat ${!fondoEsCaratulaSuelta ? "perfil-banner-parallax" : ""}`}
              style={{
                backgroundImage: `url(${backgroundImage})`,
                ...(fondoEsCaratulaSuelta
                  ? {
                      // Reportado: "no aprecio el juego, está demasiado
                      // difuminado" — con 40px de blur y solo al 50% de
                      // opacidad, una carátula ya pequeña (pensada para un
                      // cuadrado de trofeos, no una cabecera ancha) se
                      // volvía irreconocible. Menos blur y más opacidad:
                      // sigue sin verse nítida al 100% (es la franja fija
                      // de arriba, ver el comentario de "franja de alto
                      // FIJO"), pero ahora sí se distingue qué juego es.
                      filter: "blur(14px) brightness(0.55)",
                      opacity: 0.75,
                      transform: "scale(1.08)",
                    }
                  : {}),
              }}
            />
          )}

          {/* Capa de acento sutil encima del blur */}
          {backgroundImage && (
            <div
              className="absolute inset-0 mix-blend-overlay"
              style={{ background: "radial-gradient(700px 320px at 25% 0%, rgb(var(--accent-rgb) / 0.3), transparent 80%)" }}
            />
          )}

          {/*
            Velo de contraste: el texto de la cabecera (nombre, handle,
            título, botones) siempre sale en blanco/claro, pero el fondo
            puede ser CUALQUIER color — una zona clara de un preset o de una
            carátula deja el texto casi invisible sin esto. Degradado hacia
            abajo, donde vive todo el texto, más fuerte que el acento de
            arriba (que es solo un tinte de color, no pensado para
            legibilidad).
          */}
          {(backgroundImage || presetBanner) && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.75) 100%)" }}
            />
          )}
        </div>

        <div className="relative z-10 mx-auto max-w-[1240px] px-7 pt-6">
          <BackButton fallbackHref="/" dark />
        </div>
        <div className="relative z-10 mx-auto flex max-w-[1240px] flex-wrap items-end gap-5 px-7 pb-8 pt-2">
          <AvatarFrame frame={profile.profileFrame}>
            <Avatar src={player.avatarUrl} name={player.name} size={92} />
          </AvatarFrame>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-heading text-[2.625rem] font-bold uppercase leading-none">
                {clanMembership && (
                  <Link href={`/clanes/${clanMembership.clan.tag.toLowerCase()}`} className="mr-2 text-[var(--accent-text)] opacity-80 hover:opacity-100 transition-opacity">
                    [{clanMembership.clan.tag}]
                  </Link>
                )}
                {profile.displayName ?? `@${handle}`}
              </h1>
              {profile.esDesarrollador && (
                <span
                  className="mb-1 inline-flex items-center gap-1.5 self-end rounded-full px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.06em]"
                  style={{ background: "rgba(159, 212, 236, 0.14)", border: "1px solid rgba(159, 212, 236, 0.35)", color: "#9fd4ec" }}
                  title={t("PerfilPage.desarrolladorTooltip")}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  {t("PerfilPage.desarrolladorBadge")}
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
            <TrophyCase items={palmares} />
          </div>

          <Link
            href={`/u/${handle}/cv`}
            className={`${esMio ? "ml-auto" : ""} rounded-[10px] px-4 py-2.5 text-[0.8125rem] font-bold`}
            style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}
          >
            {t("PerfilPage.hojaDeServicios")}
          </Link>

          {!esMio && (
            <Link
              href={`/comparar/${handle}`}
              className="rounded-[10px] px-4 py-2.5 text-[0.8125rem] font-bold text-background"
              style={{ background: "var(--accent-grad)" }}
            >
              {t("PerfilPage.compararConmigo")}
            </Link>
          )}

          {!esMio && session?.user?.id && (
            <FriendRequestButton
              handle={handle}
              otherUserId={profile.userId}
              initialStatus={estadoAmistad}
              profilePath={`/u/${handle}`}
            />
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] space-y-9 px-7 pb-24 pt-6">
        {juegoAnclado && <PinnedGameBanner game={juegoAnclado} handle={handle} aura={auraAnclado} />}

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
                playerName={profile.displayName ?? player.name}
                mejorMes={resumen.mejorMes}
                rachas={rachasPerfil}
                percentil={percentilAnio}
              />
            ),
            stats: (
              <div key="stats">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatTile value={stats.platinos} label={t("PerfilPage.statPlatinos")} accent="var(--platinum)" />
                  <StatTile value={stats.trofeos} label={t("PerfilPage.statTrofeos")} />
                  <StatTile value={stats.juegos} label={t("PerfilPage.statJuegos")} />
                  <StatTile value={`${stats.completadoMedio}%`} label={t("PerfilPage.statCompletadoMedio")} />
                </div>
                <Link href={`/u/${handle}/estadisticas`} className="mt-3 inline-block text-xs font-bold uppercase tracking-wide text-accent hover:underline">
                  {t("PerfilPage.verEstadisticas")}
                </Link>
              </div>
            ),
            recientes: recientes.length > 0 && <RecentTrophies key="recientes" trofeos={recientes} handle={handle} />,
            level: <ParagonLevelCard key="level" progress={nivelParagon} />,
            achievements: (
              <ParagonAchievements key="achievements" games={games} earnedIds={badges.map((badge) => badge.badgeId)} />
            ),
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
                      xp: trophyRaw.xp ?? undefined,
                    };
                    return { game, trophy };
                  })
                  .filter((item): item is NonNullable<typeof item> => item !== null)}
              />
            ),
            favoritos: ((profile.favorites?.length ?? 0) > 0 || esMio) && (
              <section key="favoritos" className="mt-8 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-xl font-bold uppercase tracking-wide text-muted">{t("PerfilPage.favoritosTitulo")}</h2>
                  {esMio && <FavoritePicker allGames={games} currentFavorites={profile.favorites ?? []} />}
                </div>

                {(profile.favorites?.length ?? 0) > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {(profile.favorites ?? []).map((gameId) => {
                      const game = games.find((g) => g.id === gameId);
                      if (!game) return null;
                      return (
                        <TiltCard 
                          key={game.id} 
                          href={`/u/${handle}/${game.id}`}
                          className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-border/50 transition-all hover:shadow-2xl hover:border-accent block"
                          style={{ background: coverGradient(game.id) }}
                        >
                          <div className="w-full h-full">
                            {game.iconUrl && (
                              <div
                                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-110"
                                style={{ backgroundImage: `url(${game.iconUrl})` }}
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                            {game.pegi && <span className="absolute right-3 top-3"><Pegi edad={game.pegi} /></span>}
                            <div className="absolute bottom-4 left-4 right-4 text-sm font-bold text-white leading-tight drop-shadow-md translate-y-2 group-hover:translate-y-0 transition-transform">
                              {game.title}
                            </div>
                          </div>
                        </TiltCard>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center border border-dashed rounded-xl border-border bg-surface text-muted text-sm">
                    {t("PerfilPage.favoritosVacio")}
                  </div>
                )}
              </section>
            ),
            // `collections` y `biblioteca` viven ahora en
            // /u/[handle]/biblioteca, en su propia ruta.
          };

          // Las tres pestañas del perfil son AHORA TRES RUTAS, no tres
          // bloques renderizados a la vez y ocultos con `hidden`:
          //   /u/[handle]            → esto (Resumen)
          //   /u/[handle]/biblioteca → carpetas + grid de juegos
          //   /u/[handle]/estadisticas → EstadisticasCompletas
          //
          // El motivo es medido, no estético: `LibraryGrid` es un componente
          // de CLIENTE y recibía los 291 juegos enteros, así que el perfil
          // mandaba 1.030 KB en cada visita aunque la pestaña por defecto
          // fuera "Resumen" y nadie mirase la biblioteca. Con una ruta por
          // pestaña, cada una paga solo lo suyo.
          //
          // Se respeta igual el orden de secciones de /ajustes
          // (`profileSectionOrder`): las claves de biblioteca simplemente ya
          // no viven aquí, y `normalizeSectionOrder` sigue mandando en el
          // resto.
          const orden = normalizeSectionOrder(profile.profileSectionOrder);
          const resumenNodos = orden.map((c) => secciones[c] || null);

          return (
            <>
              <ProfileTabsNav handle={handle} juegos={stats.juegos} />
              <div className="space-y-9">{resumenNodos}</div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
