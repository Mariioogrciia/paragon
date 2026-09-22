import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import {
  getLibrary,
  getProfileByHandle,
  getProfileByUserId,
} from "@/lib/profiles";
import { sharedGames, summarise } from "@/lib/stats";
import { paragonProgress } from "@/lib/level";
import { sharedTrophyLeads } from "@/lib/comparison";
import { ComparePairGames } from "@/components/ComparePairGames";
import { BackButton } from "@/components/BackButton";
import { RivalryRadarLazy } from "@/components/RivalryRadarLazy";

const OUTCOME_STYLE = {
  ganas: { bg: "rgba(78, 201, 138, 0.12)", fg: "#4ec98a", border: "rgba(78, 201, 138, 0.3)" },
  pierdes: { bg: "rgba(255, 107, 107, 0.12)", fg: "#ff8f8f", border: "rgba(255, 107, 107, 0.28)" },
  empate: { bg: "rgba(135, 148, 168, 0.12)", fg: "var(--muted)", border: "rgba(135, 148, 168, 0.25)" },
};

export default async function CompararPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const t = await getTranslations("Perfil");

  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const [mio, suyo] = await Promise.all([
    getProfileByUserId(session.user.id),
    getProfileByHandle(handle),
  ]);

  if (!suyo) notFound();
  if (!mio || mio.accounts.length === 0) redirect("/bienvenida");

  if (suyo.accounts.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted">
        {t("CompararPage.sinCuenta", { handle })}
      </p>
    );
  }

  const [libA, libB] = await Promise.all([getLibrary(mio), getLibrary(suyo)]);
  const statsA = summarise(libA.games);
  const statsB = summarise(libB.games);
  const comunes = sharedGames([libA, libB]);
  const nivelA = paragonProgress(libA.games);
  const nivelB = paragonProgress(libB.games);
  // "Quién llegó antes" es la pieza más pesada de esta página (JOIN sobre
  // user_trophy + game_trophy) y la única cosa aquí que no tiene ya la app
  // móvil de respaldo — si falla, que se quede vacía esta sección en vez de
  // tirar TODA la comparativa (era exactamente eso lo que rompía la página
  // entera, "Algo se ha roto", con cualquier amigo).
  const lideres = await sharedTrophyLeads(
    mio.userId,
    suyo.userId,
    comunes.map((game) => game.id),
  ).catch((error) => {
    console.error("[comparar] sharedTrophyLeads falló", error);
    return [];
  });
  const ganados = comunes.filter((g) => g.progress[0].percent >= g.progress[1].percent).length;

  const platinoDif = statsA.platinos - statsB.platinos;
  const tagA =
    platinoDif === 0
      ? { ...OUTCOME_STYLE.empate, label: t("CompararPage.empate") }
      : platinoDif > 0
        ? { ...OUTCOME_STYLE.ganas, label: t("CompararPage.vasGanando") }
        : { ...OUTCOME_STYLE.empate, label: t("CompararPage.aPlatinos", { n: -platinoDif }) };
  const tagB =
    platinoDif === 0
      ? { ...OUTCOME_STYLE.empate, label: t("CompararPage.empate") }
      : platinoDif > 0
        ? { ...OUTCOME_STYLE.empate, label: t("CompararPage.aPlatinos", { n: platinoDif }) }
        : { ...OUTCOME_STYLE.ganas, label: t("CompararPage.vaGanando") };

  const jugadores = [
    { player: libA.player, stats: statsA, tag: tagA, leader: platinoDif >= 0 },
    { player: libB.player, stats: statsB, tag: tagB, leader: platinoDif <= 0 },
  ];

  const normalize = (val: number, max: number) => max === 0 ? 0 : Math.round((val / max) * 100);

  const radarData = [
    {
      subject: "XP Total",
      A: normalize(nivelA.xp, Math.max(nivelA.xp, nivelB.xp)),
      B: normalize(nivelB.xp, Math.max(nivelA.xp, nivelB.xp)),
      fullMark: 100
    },
    {
      subject: "Platinos",
      A: normalize(statsA.platinos, Math.max(statsA.platinos, statsB.platinos)),
      B: normalize(statsB.platinos, Math.max(statsA.platinos, statsB.platinos)),
      fullMark: 100
    },
    {
      subject: "Volumen (Juegos)",
      A: normalize(statsA.juegos, Math.max(statsA.juegos, statsB.juegos)),
      B: normalize(statsB.juegos, Math.max(statsA.juegos, statsB.juegos)),
      fullMark: 100
    },
    {
      subject: "Completismo %",
      A: statsA.completadoMedio,
      B: statsB.completadoMedio,
      fullMark: 100
    },
    {
      subject: "Trofeos Totales",
      A: normalize(statsA.trofeos, Math.max(statsA.trofeos, statsB.trofeos)),
      B: normalize(statsB.trofeos, Math.max(statsA.trofeos, statsB.trofeos)),
      fullMark: 100
    }
  ];

  return (
    <div>
      <BackButton fallbackHref="/amigos" />
      <h1 className="font-heading text-4xl font-bold uppercase leading-none tracking-[-0.01em] sm:text-[3.125rem]">
        {libA.player.name} <span className="text-accent">vs</span> {libB.player.name}
      </h1>
      <p className="mt-3 max-w-[620px] text-[0.9375rem] leading-relaxed text-muted">
        {t("CompararPage.subtitulo")}
      </p>

      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {jugadores.map(({ player, stats, tag, leader }) => (
          <div
            key={player.id}
            className="rounded-[20px] p-6"
            style={
              leader
                ? { border: "1px solid #2f5a8f", background: "linear-gradient(165deg, #14243a, #0d131c)" }
                : { border: "1px solid var(--border)", background: "var(--surface)" }
            }
          >
            <div className="flex items-center gap-3.5">
              <Avatar src={player.avatarUrl} name={player.name} size={48} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[1.0625rem] font-semibold">{player.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {player.trophyLevel !== undefined
                    ? `Nivel ${player.trophyLevel}`
                    : player.accounts.map((a) => a.username).join(" · ")}
                </p>
              </div>
              <span
                className="ml-auto shrink-0 rounded-full px-[11px] py-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.06em]"
                style={{ background: tag.bg, color: tag.fg, border: `1px solid ${tag.border}` }}
              >
                {tag.label}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3.5">
              <div>
                <p className="font-heading text-4xl font-bold leading-none text-platinum">{stats.platinos}</p>
                <p className="mt-2 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-muted">{t("CompararPage.statPlatinos")}</p>
              </div>
              <div>
                <p className="font-heading text-4xl font-bold leading-none">{stats.trofeos.toLocaleString("es-ES")}</p>
                <p className="mt-2 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-muted">{t("CompararPage.statTrofeos")}</p>
              </div>
              <div>
                <p className="font-heading text-4xl font-bold leading-none">{stats.completadoMedio}%</p>
                <p className="mt-2 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-muted">{t("CompararPage.statMedio")}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-9">
        <div className="mb-4 flex items-baseline gap-3.5">
          <h2 className="font-heading text-2xl font-bold">Radar de Rivalidad</h2>
          <span className="text-[0.8125rem] text-muted">
            Cara a cara
          </span>
        </div>
        <RivalryRadarLazy
          data={radarData}
          userA={{ name: libA.player.name, color: "var(--accent-text)" }}
          userB={{ name: libB.player.name, color: "var(--gold)" }}
        />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[{ name: libA.player.name, level: nivelA, color: "var(--accent-text)" }, { name: libB.player.name, level: nivelB, color: "var(--gold)" }].map((player) => (
          <div key={player.name} className="rounded-[18px] border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold">{t("CompararPage.nivelParagonDe", { nombre: player.name })}</h2>
              <span className="font-heading text-2xl font-bold" style={{ color: player.color }}>{t("CompararPage.nivelAbreviado", { nivel: player.level.level })}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${player.level.progreso}%`, background: player.color }} /></div>
            <p className="mt-2 text-xs text-muted">{t("CompararPage.xpParaNivel", { xp: player.level.xp.toLocaleString("es-ES"), restante: player.level.restante.toLocaleString("es-ES"), siguiente: player.level.siguienteNivel })}</p>
          </div>
        ))}
      </section>

      <section className="mt-9">
        <div className="mb-4 flex items-baseline gap-3.5">
          <h2 className="font-heading text-2xl font-bold">{t("CompararPage.juegosEnComun")}</h2>
          <span className="text-[0.8125rem] text-muted">
            {t("CompararPage.titulos", { n: comunes.length })}{comunes.length > 0 && t("CompararPage.ganasDeCuantos", { ganados, total: comunes.length })}
          </span>
        </div>

        <ComparePairGames
          comunes={comunes}
          jugadores={jugadores.map(({ player }) => ({ id: player.id, name: player.name }))}
        />
      </section>

      {lideres.length > 0 && (
        <section className="mt-9">
          <div className="mb-4 flex flex-wrap items-baseline gap-3.5">
            <h2 className="font-heading text-2xl font-bold">{t("CompararPage.quienLlegoAntes")}</h2>
            <span className="text-[0.8125rem] text-muted">{t("CompararPage.trofeosAmbos")}</span>
          </div>
          <div className="grid gap-2">
            {lideres.map((trofeo) => (
              <div key={`${trofeo.gameId}:${trofeo.trophyId}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{trofeo.trophyName}</p><p className="text-xs text-muted">{trofeo.gameTitle}</p></div>
                <span className="shrink-0 text-xs font-bold text-accent">{t("CompararPage.llegoAntes", { nombre: trofeo.firstUserId === mio.userId ? libA.player.name : libB.player.name })}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
