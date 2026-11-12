import Link from "@/components/Enlace";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { TiltCard } from "@/components/TiltCard";
import { auth } from "@/auth";
import { TrophyCountRow } from "@/components/TrophyCounts";
import { TrophyIcon } from "@/components/TrophyIcon";
import { coverGradient } from "@/lib/design";
import { getLibrary, getProfileByUserId } from "@/lib/profiles";
import { gameProgress, summarise } from "@/lib/stats";
import { platinables, type Platinable } from "@/lib/platinables";
import { getRetirados } from "@/lib/retirados";
import { MAX_CAZAS, cazasDeBiblioteca, consolasParaRetirar, dispositivosDe, nombreConsola, sinRetirados } from "@/lib/retiradosReglas";
import { doblesPlatinos, extrasPlatinables, type DoblePlatino, type ExtrasJuego } from "@/lib/platinablesExtras";
import { PlatinablesPanel, type FilaPlatinable } from "@/components/PlatinablesPanel";
import { MisCazas, type CazaFila } from "@/components/MisCazas";
import { ActivityFeed } from "@/components/ActivityFeed";
import { getFeed } from "@/lib/feed";
import { UpcomingGames } from "@/components/UpcomingGames";
import { TrophyHistory } from "@/components/TrophyHistory";
import { rachas, resumenHistorico, trofeosPorMes, talDiaComoHoy } from "@/lib/history";
import { TalDiaComoHoy } from "@/components/TalDiaComoHoy";
import { diasSinAvance } from "@/lib/profileStats";
import { AvisoAtasco } from "@/components/AvisoAtasco";
import { MonthlySummary } from "@/components/MonthlySummary";
import { getWishlistIgdbIds } from "@/lib/manualGames";
import { getWeeklyMissions } from "@/lib/missions";
import { WeeklyMissions } from "@/components/WeeklyMissions";
import { ActivityStats } from "@/components/ActivityStats";
import { getTrophyRecommendations } from "@/lib/recommendations";
import { TrophyRecommendations } from "@/components/TrophyRecommendations";
import { paragonProgress } from "@/lib/level";
import { PLATFORM_LABEL } from "@/lib/types";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { esPlatinoEquivalente } from "@/lib/stats";
import { Landing } from "@/components/landing/Portada";
import { SlidersHorizontal } from "lucide-react";
import { getPanelOculto, type SeccionPanel } from "@/lib/panelPreferences";
import { idiomaActual } from "@/lib/trofeosIdioma";
import { TextosRuta } from "@/components/TextosRuta";

export { metadatosPortada as metadata } from "@/components/landing/Portada";

/** La portada lleva sus textos aquí: `/` no tiene carpeta propia con layout (ver components/TextosRuta.tsx). */
export default async function HomePage() {
  return (
    <TextosRuta ruta="/">
      <Inicio />
    </TextosRuta>
  );
}

async function Inicio() {
  const session = await auth();
  if (!session?.user) return <Landing />;

  const t = await getTranslations("Shell.Home");
  const idioma = await getLocale();

  const profile = await getProfileByUserId(session.user.id);
  if (!profile?.handle || profile.accounts.length === 0) redirect("/bienvenida");

  const { player, games, xpMisiones } = await getLibrary(profile);
  const stats = summarise(games);
  const nivelParagon = paragonProgress(games, xpMisiones);

  // Mismo bug real que en /u/[handle] (23 sept 2026): con una cuenta
  // vinculada pero privada (frecuente en Steam: "Detalles del juego" no
  // está en público aunque el perfil sí), `accounts.length` no es 0, así
  // que no salta el redirect a /bienvenida — pero tampoco hay ni un solo
  // juego que enseñar en todo el panel, sin ninguna pista de por qué.
  const cuentaPrivadaSinJuegos =
    games.length === 0 && profile.accounts.length > 0 && profile.accounts.every((a) => !a.isPublic)
      ? profile.accounts[0]
      : null;

  const recientes = games.filter(g => !g.isWishlist).slice(0, 6);

  // Detector de Atascos: solo tiene sentido mirarlo si hay un juego anclado
  // Y todavía no está platinado/100% (un juego ya terminado no se "atasca").
  const juegoAnclado = games.find((g) => g.isPinned && !esPlatinoEquivalente(g)) ?? null;

  // Secciones ocultas por el usuario (Ajustes → Ocultar): ni se pintan ni
  // se piden sus datos.
  const oculto = await getPanelOculto(session.user.id).catch(() => new Set<SeccionPanel>());
  const ver = (s: SeccionPanel) => !oculto.has(s);
  const nada = <T,>(v: T) => Promise.resolve(v);

  const [mesesHistorico, rachasUsuario, resumen, wishlistIds, misiones, recomendaciones, efemerides, diasAtascado, feed] = await Promise.all([
    ver("ritmo") ? trofeosPorMes(session.user.id) : nada([]),
    ver("ritmo") ? rachas(session.user.id) : nada(null),
    ver("ritmo") ? resumenHistorico(session.user.id) : nada(null),
    ver("lanzamientos") ? getWishlistIgdbIds(session.user.id) : nada([]),
    ver("misiones") ? getWeeklyMissions(session.user.id) : nada([]),
    ver("recomendaciones") ? getTrophyRecommendations(session.user.id, 6, await idiomaActual()) : nada([]),
    ver("talDia") ? talDiaComoHoy(session.user.id) : nada([]),
    juegoAnclado ? diasSinAvance(session.user.id, juegoAnclado.id) : Promise.resolve(null),
    ver("actividad") ? getFeed(session.user.id, { limite: 15 }) : nada([]),
  ]);

  const UMBRAL_ATASCO = 5;
  const mostrarAtasco = juegoAnclado && diasAtascado !== null && diasAtascado >= UMBRAL_ATASCO;

  // Qué te puedes platinar (8 nov 2026, lib/platinables.ts): lo que menos te
  // queda, lo que estás jugando, platinos fáciles sin empezar y doble platino,
  // sin las consolas y juegos que ya no tienes (lib/retirados.ts). La tarjeta
  // grande es el primero de "más cerca"; la lista va debajo con pestañas.
  const marcas = await getRetirados(session.user.id);
  const listas = platinables(sinRetirados(games, marcas), undefined, marcas.instalados);
  const [extras, dobles] = await Promise.all([
    extrasPlatinables(session.user.id, [...listas.cerca, ...listas.jugando].map((p) => p.game.id)).catch(() => new Map<string, ExtrasJuego>()),
    doblesPlatinos(sinRetirados(games, marcas)).catch(() => []),
  ]);
  const sugerenciaRetirar = consolasParaRetirar(games, marcas)[0] ?? null;

  // «Reanuda tus cazas» (12 nov 2026): lo que has elegido platinar, arriba del todo.
  const ahoraMs = new Date().getTime();
  const cazas: CazaFila[] = cazasDeBiblioteca(games, marcas).map((g) => {
    const faltan = Math.max(0, g.definedTotal - g.earnedTotal);
    const dias = g.lastPlayedAt ? Math.max(0, Math.floor((ahoraMs - new Date(g.lastPlayedAt).getTime()) / 86_400_000)) : null;
    const horas = g.hltb?.completionist ? Math.max(0, Math.round(g.hltb.completionist - (g.playtimeMinutes ?? 0) / 60)) : null;
    return {
      id: g.id,
      titulo: g.title,
      iconUrl: g.iconUrl ?? null,
      percent: g.progressPercent,
      href: `/u/${profile.handle}/${g.id}`,
      faltan:
        g.earnedTotal === 0
          ? t("platinables.sinEmpezar", { count: faltan })
          : (g.defined?.platinum ?? 0) > 0
            ? t("platinables.faltan", { count: faltan })
            : t("platinables.faltanCien", { count: faltan }),
      extra: [
        ...(g.earnedTotal > 0 && dias !== null && dias <= 365 ? [t("platinables.jugado", { count: dias })] : []),
        ...(horas ? [t("platinables.horas", { n: horas })] : []),
      ],
    };
  });
  const nearPlatinum = listas.cerca.slice(0, 1).map((p) => ({ game: p.game, progress: gameProgress(p.game) }));
  const fila = (p: Platinable): FilaPlatinable => {
    const e = extras.get(p.game.id);
    return {
      id: p.game.id,
      titulo: p.game.title,
      iconUrl: p.game.iconUrl ?? null,
      percent: p.percent,
      href: `/u/${profile.handle}/${p.game.id}`,
      faltan:
        p.game.earnedTotal === 0
          ? t("platinables.sinEmpezar", { count: p.faltan })
          : (p.game.defined?.platinum ?? 0) > 0
            ? t("platinables.faltan", { count: p.faltan })
            : t("platinables.faltanCien", { count: p.faltan }),
      extra: [
        ...(p.game.earnedTotal > 0 && p.diasDesdeJugado !== null && p.diasDesdeJugado <= 365 ? [t("platinables.jugado", { count: p.diasDesdeJugado })] : []),
        ...(p.horasRestantes ? [t("platinables.horas", { n: p.horasRestantes })] : []),
        ...(p.game.earnedTotal === 0 && p.rarezaPlatino !== null ? [t("platinables.rarezaPlatino", { r: p.rarezaPlatino.toLocaleString(idioma, { maximumFractionDigits: 1 }) })] : []),
      ],
      dispositivos: p.dispositivos,
      horas: p.horasRestantes,
      instalado: p.instalado,
      suscripcion: p.suscripcion !== null,
      avisos: [
        ...(e && e.perdibles > 0 ? [t("platinables.perdibles", { count: e.perdibles })] : []),
        ...(e && e.masRaroPendiente !== null && e.masRaroPendiente < 2 ? [t("platinables.dificil", { r: e.masRaroPendiente.toLocaleString(idioma, { maximumFractionDigits: 1 }) })] : []),
        ...(p.suscripcion === "ps_plus" ? ["PS Plus"] : p.suscripcion === "game_pass" ? ["Game Pass"] : []),
        ...(p.instalado ? [t("platinables.instalado")] : []),
      ],
      amigos: e && e.amigos.length > 0 ? t("platinables.amigos", { nombres: e.amigos.map((a) => `${a.nombre ?? a.handle} (${a.percent} %)`).join(", ") }) : null,
    };
  };
  const filaDoble = (d: DoblePlatino): FilaPlatinable => ({
    id: d.otra.id,
    titulo: d.otra.titulo,
    iconUrl: d.otra.iconUrl,
    percent: d.laTienes ?? 0,
    href: d.laTienes !== null ? `/u/${profile.handle}/${d.otra.id}` : `/juego/${d.otra.id}`,
    faltan: d.laTienes !== null ? t("platinables.dobleLaTienes", { consola: nombreConsola(d.otra.dispositivo) }) : t("platinables.dobleOtra", { consola: nombreConsola(d.otra.dispositivo) }),
    extra: [t("platinables.dobleYa", { consola: nombreConsola(d.platinado.dispositivo) })],
    dispositivos: dispositivosDe(d.otra.dispositivo),
    horas: null,
    instalado: false,
    suscripcion: false,
    avisos: [],
    amigos: null,
    sinOcultar: true,
  });

  // Lo contrario de "a un paso": empezados y parados hace más de un año
  // (mismo umbral que el filtro "Abandonados" de la biblioteca). Sin esto,
  // solo se ve en el panel lo que va bien.
  const abandonados = games
    .map((g) => ({ game: g, progress: gameProgress(g) }))
    .filter((g) => g.progress.status === "abandonado")
    .sort((a, b) => new Date(a.game.lastPlayedAt ?? 0).getTime() - new Date(b.game.lastPlayedAt ?? 0).getTime())
    .slice(0, 4);

  const now = new Date().getTime();

  const nearPlatinumSection = (listas.cerca.length > 0 || listas.jugando.length > 0 || listas.faciles.length > 0 || dobles.length > 0) && (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline gap-3.5">
        <h2 className="font-heading text-2xl font-bold">{t("aUnPasoDelPlatino")}</h2>

        <Link
          href={`/u/${profile.handle}/biblioteca?estado=a-punto`}
          className="ml-auto text-xs font-bold uppercase tracking-wide text-accent hover:underline"
        >
          {t("verTodos")}
        </Link>
      </div>

      <div className="grid gap-4">
        {nearPlatinum.length > 0 && (<>
        {/* Widget Hero (El Próximo Objetivo Principal) */}
        <TiltCard
          href={`/u/${profile.handle}/${nearPlatinum[0].game.id}`}
          className="group relative block overflow-hidden rounded-[20px] transition-all duration-300 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]"
          style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
        >
          <div className="relative flex flex-col sm:flex-row p-6 items-center sm:items-stretch overflow-hidden min-h-[220px]">
            <div
              className="absolute inset-[-15%] bg-cover bg-center blur-2xl opacity-30"
              style={nearPlatinum[0].game.iconUrl ? { backgroundImage: `url(${nearPlatinum[0].game.iconUrl})` } : { background: coverGradient(nearPlatinum[0].game.id) }}
            />

            {/* Portada a la izquierda (en escritorio) */}
            <div className="relative z-10 w-32 h-44 sm:w-40 sm:h-56 shrink-0 rounded-xl overflow-hidden shadow-2xl mb-4 sm:mb-0 sm:mr-8 border border-border/50">
               {nearPlatinum[0].game.iconUrl ? (
                  <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${nearPlatinum[0].game.iconUrl})` }} />
               ) : (
                  <div className="w-full h-full" style={{ background: coverGradient(nearPlatinum[0].game.id) }} />
               )}
            </div>

            {/* Info a la derecha */}
            <div className="relative z-10 flex flex-col justify-center flex-1 w-full text-center sm:text-left">
              <h3 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
                {nearPlatinum[0].game.title}
              </h3>
              <p className="mb-2 mt-1 text-sm font-semibold text-[var(--accent-text)]">{t("siguientePlatino")}</p>

              <div className="mt-auto pt-4 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
                <div className="flex items-end gap-3">
                  <p className="font-heading text-[3.375rem] font-bold leading-[0.8] text-platinum">
                    {nearPlatinum[0].progress.total - nearPlatinum[0].progress.earned}
                  </p>
                  <p className="pb-1 text-xs font-bold uppercase leading-tight tracking-[0.1em] text-muted text-left whitespace-pre-line">
                    {t("trofeosParaTerminarlo")}
                  </p>
                </div>

                <div className="w-full sm:w-1/2">
                  <div className="flex justify-between text-xs text-muted mb-2 font-medium">
                    <span>{nearPlatinum[0].progress.earned}/{nearPlatinum[0].progress.total}</span>
                    <span className="font-bold text-accent-text">{nearPlatinum[0].progress.percent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2 shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                      style={{ width: `${nearPlatinum[0].progress.percent}%`, background: "var(--accent-grad-h)" }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-background via-background/80 to-transparent opacity-90" />
          </div>
        </TiltCard>

        </>)}

        {/* Los demás, con pestañas: más cerca / lo que juegas ahora */}
        <PlatinablesPanel
          listas={{
            cerca: listas.cerca.slice(1).map(fila),
            jugando: listas.jugando.map(fila),
            faciles: listas.faciles.map(fila),
            dobles: dobles.map(filaDoble),
          }}
          sugerencia={
            sugerenciaRetirar
              ? { dispositivo: sugerenciaRetirar.dispositivo, texto: t("platinables.retirarPregunta", { anios: sugerenciaRetirar.anios, consola: nombreConsola(sugerenciaRetirar.dispositivo) }) }
              : null
          }
          cazasIniciales={marcas.cazas}
          nombresConsola={Object.fromEntries(Object.values(listas).flat().flatMap((p) => p.dispositivos).map((d) => [d, nombreConsola(d)]))}
          textos={{
            cerca: t("platinables.cerca"),
            jugando: t("platinables.jugando"),
            faciles: t("platinables.faciles"),
            dobles: t("platinables.dobles"),
            desc_cerca: t("platinables.descCerca"),
            desc_jugando: t("platinables.descJugando"),
            desc_faciles: t("platinables.descFaciles"),
            desc_dobles: t("platinables.descDobles"),
            vacio_cerca: t("platinables.vacioCerca"),
            vacio_jugando: t("platinables.vacio"),
            vacio_faciles: t("platinables.vacioFaciles"),
            vacio_dobles: t("platinables.vacioCerca"),
            verMas: t("platinables.verMas", { n: "{n}" }),
            verMenos: t("platinables.verMenos"),
            yaNoLoTengo: t("platinables.yaNoLoTengo"),
            todas: t("platinables.todas"),
            corto: t("platinables.filtroCorto"),
            instalados: t("platinables.filtroInstalados"),
            suscripcion: t("platinables.filtroSuscripcion"),
            quitar: t("platinables.retirarSi"),
            dejar: t("platinables.retirarNo"),
            cazar: t("cazas.cazar"),
            enCazas: t("cazas.enCazas"),
            cazaLlena: t("cazas.llena", { n: MAX_CAZAS }),
          }}
        />
      </div>
    </section>
  );

  const abandonadosSection = abandonados.length > 0 && (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline gap-3.5">
        <h2 className="font-heading text-2xl font-bold">{t("juegosParados")}</h2>
        <p className="text-[0.8125rem] text-muted">
          {t("empezadosSinTocar")}
        </p>
        <Link
          href={`/u/${profile.handle}/biblioteca?estado=abandonado`}
          className="ml-auto text-xs font-bold uppercase tracking-wide text-accent hover:underline"
        >
          {t("verTodos")}
        </Link>
      </div>

      {/* Cerrado por defecto: de las secciones de "Progreso y actividad", esta
          es la que menos pide verse cada visita — son juegos que, por
          definición, llevan más de un año sin tocarse. Recuerda si ya
          lo abriste una vez, por si de verdad vuelves a por ella. */}
      <CollapsibleSection storageKey="juegos-parados" toggleLabel={t("juegosParadosToggle", { n: abandonados.length })}>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {abandonados.map(({ game, progress }) => (
            <Link
              key={game.id}
              href={`/u/${profile.handle}/${game.id}`}
              className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-2"
              style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
            >
              <span
                className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-cover bg-center"
                style={{ background: game.iconUrl ? `url(${game.iconUrl}) center/cover` : coverGradient(game.id) }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-semibold" title={game.title}>
                  {game.title}
                </p>
                <p className="text-[0.6875rem] text-muted">{t("sinTocarHaceTiempo", { porcentaje: progress.percent })}</p>
              </div>
            </Link>
          ))}
        </div>
      </CollapsibleSection>
    </section>
  );

  const recientesSection = (
    <section>
      <div className="mb-4 flex items-baseline gap-3.5">
        <h2 className="font-heading text-2xl font-bold">{t("jugadoRecientemente")}</h2>
        <Link
          href={`/u/${profile.handle}`}
          className="ml-auto text-xs font-bold uppercase tracking-wide text-accent"
        >
          {t("todaLaBiblioteca", { juegos: stats.juegos })}
        </Link>
      </div>

      {recientes.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          {t("sinJuegosVinculados")}
        </p>
      ) : (
        <div className="relative -mx-4 overflow-hidden px-4 sm:mx-0 sm:px-0">
          <div className={`flex w-max gap-4 ${recientes.length >= 3 ? "animate-marquee" : ""} hover:[animation-play-state:paused]`}>
            {[...recientes, ...recientes, ...recientes].map((game, i) => {
              const progress = gameProgress(game);
              return (
                <TiltCard
                  key={`${game.id}-${i}`}
                  href={`/u/${profile.handle}/${game.id}`}
                  className="group relative w-[160px] shrink-0 cursor-pointer overflow-hidden rounded-[20px] transition-all duration-300 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] sm:w-[220px]"
                  style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
                >
                  <div className="relative flex aspect-[3/4] items-end p-4 overflow-hidden">
                    <div
                      className="absolute inset-[-15%] bg-cover bg-center blur-2xl opacity-40"
                      style={game.iconUrl ? { backgroundImage: `url(${game.iconUrl})` } : { background: coverGradient(game.id) }}
                    />
                    {game.iconUrl && (
                      <div
                        className="absolute inset-0 bg-contain bg-no-repeat bg-center opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ backgroundImage: `url(${game.iconUrl})`, margin: '10% 10% 30% 10%' }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
                    {!!game.playtimeRecentMinutes && (
                      <span
                        className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-bold"
                        style={{ background: "rgba(0, 0, 0, 0.55)", color: "#4ec98a", backdropFilter: "blur(4px)" }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-good" style={{ boxShadow: "0 0 6px #4ec98a" }} />
                        {t("horasQuincena", { horas: (game.playtimeRecentMinutes / 60).toFixed(1) })}
                      </span>
                    )}
                    <p
                      className="font-heading relative z-10 translate-y-2 text-[0.9375rem] font-bold leading-tight text-foreground transition-transform duration-300 group-hover:translate-y-0 sm:text-[1.0625rem]"
                      style={{ textShadow: "0 1px 10px var(--background)" }}
                    >
                      {game.title}
                    </p>
                  </div>
                  <div className="relative z-10 bg-[var(--surface)] p-4 pt-1">
                    <div className="h-[5px] overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${progress.percent}%`, background: "var(--accent-grad-h)" }}
                      />
                    </div>
                    <div className="mt-2.5 flex justify-between text-[0.75rem] font-medium text-muted">
                      <span className="font-bold" style={{ color: "var(--accent-text)" }}>{progress.percent}%</span>
                      <span>{progress.earned}/{progress.total}</span>
                    </div>
                  </div>
                </TiltCard>
              );
            })}
          </div>
          {recientes.length >= 3 && (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-20" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-20" />
            </>
          )}
        </div>
      )}
    </section>
  );

  // Cabina de widgets (rediseño del 1 oct 2026): las mismas secciones de
  // siempre, ahora como módulos de una rejilla de 12 columnas en vez de dos
  // pestañas. Una pareja de módulos de media anchura se convierte en uno a lo
  // ancho si el otro está oculto o vacío, para no dejar huecos en la rejilla.
  const pareja = (a: ReactNode, b: ReactNode) =>
    a && b ? (
      <>
        <div className="cabina-celda lg:col-span-6">{a}</div>
        <div className="cabina-celda lg:col-span-6">{b}</div>
      </>
    ) : a || b ? (
      <div className="cabina-celda lg:col-span-12">{a || b}</div>
    ) : null;

  const hayHeroe = ver("aUnPaso") && !!nearPlatinumSection;
  const lecturas = [
    { valor: stats.trofeos.toLocaleString(idioma), etiqueta: t("trofeos") },
    { valor: stats.juegos.toLocaleString(idioma), etiqueta: t("juegos") },
    { valor: `${stats.completadoMedio}%`, etiqueta: t("completadoMedio") },
  ];

  const moduloPlatinos = (
    <div
      className="relative flex h-full flex-col justify-between overflow-hidden rounded-[20px] p-5 sm:p-6"
      style={{
        border: "1px solid var(--border)",
        background:
          "radial-gradient(400px 200px at 80% 0%, rgb(var(--accent-rgb) / 0.2), transparent 70%), linear-gradient(165deg, var(--surface-2), var(--surface))",
      }}
    >
      <div className="flex items-center gap-2.5 text-platinum">
        <TrophyIcon grade="platinum" size={22} />
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em]">{t("platinos")}</p>
      </div>
      <p className="cabina-cifra font-heading mt-2.5 text-[4.5rem] font-bold leading-[0.85] tabular-nums sm:text-[5.5rem]">{stats.platinos}</p>
    </div>
  );

  const moduloLecturas = (
    <div className="h-full rounded-[20px] border border-border bg-surface p-5">
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">{t("lecturas")}</p>
      <dl className="mt-3 divide-y divide-[var(--border)]">
        {lecturas.map((l) => (
          <div key={l.etiqueta} className="flex items-baseline justify-between gap-3 py-2.5">
            <dt className="text-[0.8125rem] font-semibold text-muted">{l.etiqueta}</dt>
            <dd className="font-heading text-[1.75rem] font-bold leading-none tabular-nums">{l.valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  const ritmo = ver("ritmo") && rachasUsuario && resumen ? { rachas: rachasUsuario, resumen } : null;

  return (
    <div className="space-y-8">
      {cuentaPrivadaSinJuegos && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4">
          <div>
            <p className="text-sm text-foreground">
              {t("cuentaPrivadaAviso", { plataforma: PLATFORM_LABEL[cuentaPrivadaSinJuegos.platform] })}
            </p>
            {cuentaPrivadaSinJuegos.platform === "steam" && (
              <p className="mt-1 text-xs text-muted">{t("cuentaPrivadaSteamDetalle")}</p>
            )}
          </div>
          <Link href="/ajustes/plataformas" className="shrink-0 text-sm font-bold text-[rgb(var(--accent-rgb))] hover:underline">
            {t("cuentaPrivadaAvisoEnlace")}
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4 sm:gap-6">
        <div className="min-w-0">
          <h1 className="font-heading text-[clamp(2rem,6vw,2.625rem)] font-bold uppercase leading-none tracking-tight">
            {t("hola", { nombre: player.name })}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-good" aria-hidden="true" />
            {player.accounts.map((a) => a.username).join(" · ")}
            {t("nivelParagon", { nivel: nivelParagon.level })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Link
            href="/ajustes/ocultar"
            className="flex items-center gap-2 rounded-[10px] border border-border bg-[var(--surface)] px-4 py-2.5 text-[0.8125rem] font-semibold text-muted transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            {t("editarPanel")}
          </Link>
          <Link
            href={`/u/${profile.handle}`}
            className="rounded-[10px] border border-border bg-[var(--surface)] px-4 py-2.5 text-[0.8125rem] font-semibold text-[var(--accent-text)] transition-colors hover:bg-[var(--surface-2)]"
          >
            {t("verPerfilCompleto")}
          </Link>
        </div>
      </div>

      <div className="cabina">
        <div className="cabina-celda lg:col-span-12">
          <MisCazas
            cazas={cazas}
            max={MAX_CAZAS}
            candidatos={sinRetirados(games, marcas)
              .filter((g) => !g.isWishlist && g.platform !== "manual" && g.definedTotal > 0 && !esPlatinoEquivalente(g))
              .map((g) => ({ id: g.id, titulo: g.title, iconUrl: g.iconUrl ?? null, percent: g.progressPercent }))}
            textos={{
              titulo: t("cazas.titulo"),
              sub: t("cazas.sub"),
              vacio: t("cazas.vacio"),
              quitar: t("cazas.quitar"),
              elegir: t("cazas.elegir"),
              buscar: t("cazas.buscar"),
              cerrar: t("cazas.cerrar"),
              anadir: t("cazas.anadir"),
              anadida: t("cazas.anadida"),
              llena: t("cazas.llena", { n: MAX_CAZAS }),
              cuenta: t("cazas.cuenta", { n: "{n}", max: "{max}" }),
              sinResultados: t("cazas.sinResultados"),
            }}
          />
        </div>

        {hayHeroe ? (
          <>
            <div className="cabina-celda lg:col-span-8">{nearPlatinumSection}</div>
            <div className="cabina-pila lg:col-span-4">
              <div className="cabina-celda">{moduloPlatinos}</div>
              <div className="cabina-celda">{moduloLecturas}</div>
            </div>
          </>
        ) : (
          <>
            <div className="cabina-celda lg:col-span-7">{moduloPlatinos}</div>
            <div className="cabina-celda lg:col-span-5">{moduloLecturas}</div>
          </>
        )}

        <div className="cabina-celda lg:col-span-12">
          <TrophyCountRow
            counts={stats.counts}
            summary={t("trofeosEnJuegos", { trofeos: stats.trofeos.toLocaleString(idioma), juegos: stats.juegos })}
            tieneMetales={stats.tieneMetales}
            logrosSinMetal={stats.logrosSinMetal}
          />
        </div>

        {mostrarAtasco && juegoAnclado && (
          <div className="cabina-celda lg:col-span-12">
            <AvisoAtasco gameId={juegoAnclado.id} titulo={juegoAnclado.title} dias={diasAtascado!} handle={profile.handle} />
          </div>
        )}

        {ritmo && (
          <>
            <div className="cabina-celda lg:col-span-4">
              <MonthlySummary meses={mesesHistorico} />
            </div>
            <div className="cabina-celda lg:col-span-8">
              <TrophyHistory meses={mesesHistorico} rachas={ritmo.rachas} resumen={ritmo.resumen} totalPerfil={stats.trofeos} />
            </div>
          </>
        )}

        {pareja(
          ver("misiones") && <WeeklyMissions missions={misiones} />,
          ver("talDia") && efemerides.length > 0 && <TalDiaComoHoy efemerides={efemerides} handle={profile.handle} />,
        )}

        {ver("recomendaciones") && (
          <div className="cabina-celda lg:col-span-12">
            <TrophyRecommendations recommendations={recomendaciones} handle={profile.handle} showcaseTrophies={profile.showcaseTrophies ?? []} />
          </div>
        )}

        {ver("lanzamientos") && (
          <div className="cabina-celda lg:col-span-12">
            <UpcomingGames wishlistedIgdbIds={wishlistIds} />
          </div>
        )}

        {pareja(ver("estadisticas") && <ActivityStats games={games} now={now} />, ver("parados") && abandonadosSection)}

        {ver("recientes") && <div className="cabina-celda lg:col-span-12">{recientesSection}</div>}

        {ver("actividad") && (
          <div className="cabina-celda lg:col-span-12">
            <section>
              <ActivityFeed activities={feed} currentUserId={session.user.id} />
              <p className="mt-3 text-right">
                <Link href="/feed" className="text-xs font-bold uppercase tracking-wide text-accent hover:underline">
                  {t("verComunidad")}
                </Link>
              </p>
            </section>
          </div>
        )}

        <Link
          href="/ajustes/ocultar"
          className="cabina-editar flex flex-wrap items-center justify-between gap-3 rounded-[20px] px-5 py-4 lg:col-span-12"
        >
          <span className="text-[0.8125rem] font-semibold text-muted">{t("cabinaPie", { n: oculto.size })}</span>
          <span className="flex items-center gap-2 text-[0.8125rem] font-bold text-[var(--accent-text)]">
            <SlidersHorizontal size={15} aria-hidden="true" />
            {t("cabinaPieAccion")}
          </span>
        </Link>
      </div>
    </div>
  );
}
