import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { TiltCard } from "@/components/TiltCard";
import { auth } from "@/auth";
import { TrophyCountRow } from "@/components/TrophyCounts";
import { TrophyIcon } from "@/components/TrophyIcon";
import { coverGradient } from "@/lib/design";
import { getLibrary, getProfileByUserId, getGlobalStats, getTopHunters, getRarestTrophiesThisWeek, getRecentPlatinumActivity } from "@/lib/profiles";
import { Avatar } from "@/components/Avatar";
import { TrophyPhoto } from "@/components/TrophyList";
import { gameProgress, summarise } from "@/lib/stats";
import { ActivityFeed } from "@/components/ActivityFeed";
import { getFeed } from "@/lib/feed";
import { UpcomingGames } from "@/components/UpcomingGames";
import { TrophyHistory } from "@/components/TrophyHistory";
import { rachas, resumenHistorico, trofeosPorMes, talDiaComoHoy } from "@/lib/history";
import { TalDiaComoHoy } from "@/components/TalDiaComoHoy";
import { diasSinAvance } from "@/lib/profileStats";
import { AvisoAtasco } from "@/components/AvisoAtasco";
import { FAQSection } from "@/components/FAQ";
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
import { CardBuilder } from "@/components/CardBuilder";
import { LandingThemeSwitcher } from "@/components/LandingThemeSwitcher";
import { Convergencia } from "@/components/landing/Convergencia";
import { ArrowRight, Eye, Gift, Route, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { getPanelOculto, type SeccionPanel } from "@/lib/panelPreferences";

const GRADE_ACCENT = {
  platinum: "#9fd4ec",
  gold: "#e2b53e",
  silver: "#b9c2cc",
  bronze: "#c07b4a",
} as const;

// Ejemplo con trofeos reales de God of War Ragnarök (nombre, metal, foto y
// rareza tal cual están en la base): los más a mano primero. Antes eran
// nombres inventados con una copa genérica en vez de la foto del trofeo.
const PSN_GOWR = "https://psnobj.prod.dl.playstation.net/psnobj/NPWR22392_00";
const SAMPLE_NEXT = [
  { name: "Spartan Ways", rarity: 44.0, grade: "silver" as const, icon: `${PSN_GOWR}/151b65f4-414a-42b6-a583-ffe985f6ad35.png` },
  { name: "Phalanx", rarity: 19.0, grade: "silver" as const, icon: `${PSN_GOWR}/b94e7ff1-31f2-4fd1-8612-e1f16597daba.png` },
  { name: "Ready for Commitment", rarity: 14.5, grade: "gold" as const, icon: `${PSN_GOWR}/eca08e73-0f8b-4975-90e6-61d01c28eee8.png` },
];

const SAMPLE_SHELF = [
  { title: "Elden Ring", pct: 74, ratio: "32/42", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg" },
  { title: "Bloodborne", pct: 100, ratio: "40/40", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/cob99l.jpg" },
  { title: "God of War Ragnarök", pct: 100, ratio: "36/36", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/coba3d.jpg" },
  { title: "Returnal", pct: 41, ratio: "12/31", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co3wc1.jpg" },
  { title: "Hollow Knight", pct: 63, ratio: "39/63", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/cobfzp.jpg" },
  { title: "Ghost of Tsushima", pct: 100, ratio: "55/55", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2crj.jpg" },
];

function haceTiempo(date: Date | string, locale: string): string {
  // Mismo criterio de estilo que `relativeDate` (lib/design.ts): en francés
  // y alemán el "narrow" sale raro ("-5 min"), ahí va "short".
  const rtf = new Intl.RelativeTimeFormat(locale, { style: locale === "es" || locale === "en" ? "narrow" : "short" });
  const minutos = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 60_000));
  if (minutos < 60) return rtf.format(-minutos, "minute");
  const horas = Math.round(minutos / 60);
  if (horas < 24) return rtf.format(-horas, "hour");
  return rtf.format(-Math.round(horas / 24), "day");
}

/**
 * Nombre que se enseña en la portada pública (sin sesión): solo el de pila.
 * `name` es el nombre completo que llega de Google/Discord, y la portada la
 * ve cualquiera — el @handle ya identifica a la persona (auditoría, 28 sept
 * 2026).
 */
function nombrePublico(name: string | null | undefined, handle: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] || (handle ? `@${handle}` : "?");
}

async function Landing() {
  const idioma = await getLocale();
  // Cuatro consultas independientes entre sí: en paralelo, no en cascada —
  // esta es la página pública más visitada (sin sesión), así que un
  // waterfall aquí pega directo al TTFB de todo el tráfico no autenticado.
  const [globalStats, topHunters, rareTrophies, recentPlatinums, t] = await Promise.all([
    getGlobalStats(),
    getTopHunters(5),
    getRarestTrophiesThisWeek(6),
    getRecentPlatinumActivity(10),
    getTranslations("Shell.Home"),
  ]);

  const pasos = (["p1", "p2", "p3", "p4"] as const).map((clave) => ({
    clave,
    titulo: t(`landing.pasos.${clave}.titulo`),
    cuerpo: t(`landing.pasos.${clave}.cuerpo`),
  }));
  const numero = (n: number) => n.toLocaleString(idioma);

  return (
    <div>
      <section className="relative pt-6 text-center sm:pt-10">
        <div className="landing-hero-halo pointer-events-none absolute inset-x-0 -top-24 bottom-0 -z-10 [mask-image:linear-gradient(90deg,transparent,black_18%,black_82%,transparent)]" aria-hidden="true" />

        <h1 className="font-heading mx-auto max-w-[20ch] text-[clamp(2.5rem,9vw,5rem)] font-bold uppercase leading-[0.95] tracking-[-0.025em] [overflow-wrap:anywhere]">
          {t("heroTitleLine1")} <span className="text-[var(--accent-text)]">{t("heroTitleLine2")}</span>
        </h1>

        <p className="mx-auto mt-6 max-w-[60ch] text-base leading-relaxed text-muted sm:text-lg">{t("heroDescription")}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/entrar"
            className="flex flex-col items-center rounded-xl px-7 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110"
            style={{ background: "var(--accent-grad)", boxShadow: "0 14px 32px -12px rgb(var(--accent-rgb) / 0.7)" }}
          >
            <span className="text-[0.9375rem] font-bold text-background">{t("ctaEmpezar")}</span>
            <span className="mt-0.5 text-[0.6875rem] font-semibold text-background/80">{t("ctaEmpezarSubtext")}</span>
          </Link>
          <Link
            href="/ejemplo"
            className="flex items-center gap-2 rounded-xl border border-border bg-[var(--surface)] px-6 py-4 text-[0.9375rem] font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgb(var(--accent-rgb)/0.5)] hover:bg-[var(--surface-2)]"
          >
            <Eye size={17} className="text-muted" aria-hidden="true" />
            {t("ctaVerEjemplo")}
          </Link>
        </div>

        <ul className="mx-auto mt-6 flex w-fit max-w-full flex-col items-start gap-2 text-[0.8125rem] text-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-6">
          <li className="flex max-w-[34rem] items-start gap-2 text-left sm:items-center">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-good sm:mt-0" aria-hidden="true" />
            {t("soloIdPublico")}
          </li>
          <li className="flex max-w-[34rem] items-start gap-2 text-left sm:items-center">
            <Gift size={15} className="mt-0.5 shrink-0 text-good sm:mt-0" aria-hidden="true" />
            {t("gratisSinLimite")}
          </li>
        </ul>

      </section>

      <Convergencia cazadores={topHunters.slice(0, 5).map((h) => ({ id: h.userId, nombre: nombrePublico(h.name, h.handle), imagen: h.image }))} />

      {recentPlatinums.length >= 4 && (
        <div className="relative -mx-4 mt-20 overflow-hidden border-y border-border px-4 py-3 sm:mx-0 sm:px-0">
          <div className="flex w-max items-center gap-10 animate-marquee hover:[animation-play-state:paused]" style={{ animationDuration: "40s" }}>
            {[...recentPlatinums, ...recentPlatinums].map((p, i) => (
              <div key={`${p.userId}-${p.gameTitle}-${i}`} className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[0.8125rem]" aria-hidden={i >= recentPlatinums.length || undefined}>
                <TrophyIcon grade="platinum" size={16} />
                <span className="font-semibold text-platinum">{nombrePublico(p.name, p.handle)}</span>
                <span className="text-muted">{t("tickerAcabaDePlatinar")}</span>
                <span className="font-semibold">{p.gameTitle}</span>
                <span className="text-[0.6875rem] text-muted">· {haceTiempo(p.createdAt, idioma)}</span>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
        </div>
      )}

      <section className="pt-20 sm:pt-24" aria-labelledby="vitrina-titulo">
        <div className="max-w-[46rem]">
          <h2 id="vitrina-titulo" className="font-heading text-[clamp(1.875rem,5vw,2.75rem)] font-bold uppercase leading-[1.05] tracking-[-0.015em]">
            {t("rarosTitulo")}
          </h2>
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted">{t("rarosDescripcion")}</p>
          {globalStats.trofeos > 0 && globalStats.juegos > 0 && (
            <p className="mt-2 text-sm text-muted">
              {t("landing.statsLinea", {
                trofeos: numero(globalStats.trofeos),
                juegos: numero(globalStats.juegos),
                platinos: numero(globalStats.platinos),
              })}
            </p>
          )}
        </div>

        {rareTrophies.length > 0 ? (
          <div className={`mt-10 grid grid-cols-2 gap-y-10 ${rareTrophies.length >= 3 ? "sm:grid-cols-3" : rareTrophies.length === 2 ? "max-w-3xl" : "max-w-xs grid-cols-1"}`}>
            {rareTrophies.map((rt, i) => {
              // Solo filas completas: 2 por balda en móvil, 3 en escritorio (sin huérfanos ni huecos).
              const n = rareTrophies.length;
              const enMovil = n < 2 || i < n - (n % 2);
              const enEscritorio = n < 3 || i < n - (n % 3);
              return (
                <div key={`${rt.userId}-${rt.gameId}-${i}`} className={`${enMovil ? "block" : "hidden"} ${enEscritorio ? "sm:block" : "sm:hidden"}`}>
                  <Link href={`/u/${rt.handle}`} className="group mx-1 block rounded-xl p-2 transition-colors duration-200 hover:bg-[var(--surface)] sm:mx-3">
                    <span className="landing-nicho flex h-28 items-end justify-center rounded-t-xl pb-3 sm:h-36">
                      <span className="transition-transform duration-300 group-hover:-translate-y-1">
                        <TrophyPhoto trophy={{ iconUrl: rt.trophyIconUrl, grade: rt.grade }} size={72} />
                      </span>
                    </span>
                    <span className="block border-t border-[var(--border)] pt-3">
                      <span className="block truncate font-heading text-[0.9375rem] font-bold">{rt.trophyName}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">{rt.gameTitle}</span>
                      <span className="mt-2 block text-[0.6875rem] font-bold tabular-nums text-[var(--accent-text)]">
                        {t("landing.cartelaRareza", { percent: rt.rarityPercent.toLocaleString(idioma, { maximumFractionDigits: 1 }) })}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.6875rem] text-muted">
                        {t("landing.cartelaPor", { handle: rt.handle ?? "?" })} · {haceTiempo(rt.earnedAt, idioma)}
                      </span>
                    </span>
                  </Link>
                  <div className="landing-repisa mt-2 h-2" aria-hidden="true" />
                </div>
              );
            })}
          </div>
        ) : recentPlatinums.length > 0 ? (
          <div className="mt-8">
            <p className="text-sm text-muted">{t("landing.vitrinaVacia")}</p>
            <div className="landing-balda mt-3 grid grid-cols-1 gap-2 rounded-2xl border border-border p-3 sm:grid-cols-3">
              {recentPlatinums.slice(0, 6).map((p, i) => (
                <Link
                  key={`${p.userId}-${p.gameTitle}-${i}`}
                  href={p.handle ? `/u/${p.handle}` : "/"}
                  className="flex items-center gap-3 rounded-xl p-3 transition-colors duration-200 hover:bg-[var(--surface-2)]"
                >
                  <TrophyIcon grade="platinum" size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{p.gameTitle}</span>
                    <span className="block truncate text-xs text-muted">
                      {nombrePublico(p.name, p.handle)} · {haceTiempo(p.createdAt, idioma)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-10 pt-20 sm:pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-start" aria-labelledby="ruta-titulo">
        <div className="min-w-0">
          <h2 id="ruta-titulo" className="font-heading text-[clamp(1.875rem,5vw,2.75rem)] font-bold uppercase leading-[1.05] tracking-[-0.015em]">
            {t("landing.rutaTitulo")}
          </h2>
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted">{t("landing.rutaDescripcion")}</p>

          <ol className="landing-ruta relative mt-8 grid gap-7">
            {pasos.map((paso, i) => (
              <li key={paso.clave} className="relative flex gap-5">
                <span className="font-heading relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-background text-sm font-bold text-[var(--accent-text)]">
                  {i + 1}
                </span>
                <div className="pt-1.5">
                  <h3 className="font-heading text-lg font-bold leading-tight">{paso.titulo}</h3>
                  <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-muted">{paso.cuerpo}</p>
                </div>
              </li>
            ))}
          </ol>

          <Link href="/como-funciona" className="mt-8 inline-flex items-center gap-1.5 rounded-md px-1 text-sm font-bold text-[var(--accent-text)] transition-colors hover:bg-[var(--surface-2)] hover:underline">
            {t("verTodoComoFunciona").replace(/\s*→\s*$/, "")}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="relative min-w-0 rounded-3xl border border-border bg-[var(--surface)] p-5 sm:p-6 lg:sticky lg:top-24" style={{ boxShadow: "0 24px 50px -28px rgb(0 0 0 / 0.6)" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-muted">{t("platinoMasCercano")}</p>
              <p className="font-heading mt-1 text-xl font-bold">God of War Ragnarök</p>
            </div>
            <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[0.6875rem] font-semibold text-muted">{t("landing.ejemplo")}</span>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-text)]">
            <Route size={14} aria-hidden="true" />
            {t("calloutRuta")}
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-2">
            {SAMPLE_NEXT.map((s, i) => (
              <li key={s.name} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
                <TrophyPhoto trophy={{ iconUrl: s.icon, grade: s.grade }} size={34} />
                <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold">{s.name}</span>
                {i === 0 && (
                  <span className="hidden shrink-0 rounded-full bg-[rgb(var(--accent-rgb)/0.14)] px-2 py-0.5 text-[0.625rem] font-bold text-[var(--accent-text)] sm:inline">
                    {t("calloutRareza")}
                  </span>
                )}
                <span className="shrink-0 text-xs font-bold tabular-nums" style={{ color: GRADE_ACCENT[s.grade] }}>
                  {s.rarity.toLocaleString(idioma, { minimumFractionDigits: 1 })} %
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <LandingThemeSwitcher />

      {topHunters.length > 0 && (
        <section className="pt-20 sm:pt-24" aria-labelledby="fama-titulo">
          <h2 id="fama-titulo" className="font-heading text-[clamp(1.875rem,5vw,2.75rem)] font-bold uppercase leading-[1.05] tracking-[-0.015em]">
            {t("muroFamaTitulo")}
          </h2>
          <p className="mt-3 max-w-[60ch] text-base text-muted">{t("muroFamaDescripcion")}</p>

          <ol className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {topHunters.map((hunter, i) => (
              <li key={hunter.userId} className="[&:last-child:nth-child(odd)]:col-span-2 sm:[&:last-child:nth-child(odd)]:col-span-1">
                <Link
                  href={`/u/${hunter.handle}`}
                  className="group relative flex h-full flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[rgb(var(--accent-rgb)/0.5)]"
                  style={
                    i === 0
                      ? { borderColor: "rgb(226 181 62 / 0.45)", background: "linear-gradient(180deg, rgb(226 181 62 / 0.08), var(--surface) 60%)" }
                      : { borderColor: "var(--border)", background: "var(--surface)" }
                  }
                >
                  <span
                    className="font-heading absolute left-3 top-3 text-sm font-bold tabular-nums"
                    style={{ color: i === 0 ? "#e2b53e" : "var(--muted)" }}
                  >
                    {i + 1}
                  </span>
                  <Avatar src={hunter.image} name={nombrePublico(hunter.name, hunter.handle)} size={60} />
                  <span className="min-w-0 max-w-full">
                    <span className="block truncate text-[0.9375rem] font-bold">{nombrePublico(hunter.name, hunter.handle)}</span>
                    <span className="block truncate text-xs text-muted">@{hunter.handle}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <TrophyIcon grade="platinum" size={16} />
                    <span className="font-heading text-lg font-bold tabular-nums text-platinum">{hunter.platinos}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="pt-20 sm:pt-24">
        <div className="relative overflow-hidden rounded-3xl p-7 sm:p-12" style={{ border: "1px solid #36393f", background: "linear-gradient(145deg, #2f3136, #202225)" }}>
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-heading text-[clamp(1.625rem,4vw,2rem)] font-bold leading-tight text-white">{t("botDiscordTitulo")}</h2>
              <p className="mt-4 max-w-[55ch] text-base text-[#c4c6ca]">{t("botDiscordDesc")}</p>
              <ul className="mt-6 space-y-3 text-sm text-[#c4c6ca]">
                <li className="flex flex-wrap items-baseline gap-x-2.5"><code className="font-semibold text-[#8b95f5]">/perfil</code> {t("botDiscordCmd1")}</li>
                <li className="flex flex-wrap items-baseline gap-x-2.5"><code className="font-semibold text-[#8b95f5]">/comparar</code> {t("botDiscordCmd2")}</li>
                <li className="flex flex-wrap items-baseline gap-x-2.5"><code className="font-semibold text-[#8b95f5]">/platino</code> {t("botDiscordCmd3")}</li>
              </ul>
            </div>

            <div className="relative rounded-lg border border-white/5 p-4 shadow-xl" style={{ background: "#36393f" }} aria-hidden="true">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5865F2]">
                  <TrophyIcon grade="platinum" size={24} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium text-white">Paragon Bot</span>
                    <span className="rounded bg-[#5865F2] px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-white">BOT</span>
                    <span className="text-xs text-[#a3a6aa]">{t("landing.discordHora")}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#dcddde]">
                    <span className="font-semibold text-white">@hunter</span> {t("landing.discordAnuncio")} <span className="font-semibold text-white">Elden Ring</span>
                  </p>
                  <div className="mt-3 rounded border-l-4 border-[#5865F2] bg-[#2f3136] p-4">
                    <div className="flex items-start gap-4">
                      <img loading="lazy" decoding="async" src="https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg" alt="" className="h-24 w-16 rounded object-cover shadow-md" />
                      <div>
                        <p className="text-base font-bold text-[#00aff4]">Elden Ring</p>
                        <p className="mt-1.5 text-sm text-[#dcddde]">
                          {t("landing.discordRareza")}: <span className="font-semibold text-[#f87171]">4,2 %</span>
                        </p>
                        <p className="mt-1 text-xs text-[#b9bbbe]">{t("landing.discordDificultad", { n: 8 })}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CardBuilder games={SAMPLE_SHELF} />

      <section className="py-20 sm:py-24">
        <div className="relative overflow-hidden rounded-3xl border border-[rgb(var(--accent-rgb)/0.35)] px-7 py-12 text-center sm:px-16 sm:py-16" style={{ background: "linear-gradient(180deg, rgb(var(--accent-rgb) / 0.14), var(--surface) 70%)" }}>
          <h2 className="font-heading mx-auto max-w-[18ch] text-[clamp(2.25rem,7vw,3.75rem)] font-bold uppercase leading-[0.98] tracking-[-0.02em] [text-wrap:balance]">
            {t("ctaFinalTitulo")}
          </h2>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              href="/entrar"
              className="rounded-xl px-8 py-4 text-[0.9375rem] font-bold text-background transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110"
              style={{ background: "var(--accent-grad)", boxShadow: "0 14px 32px -12px rgb(var(--accent-rgb) / 0.7)" }}
            >
              {t("ctaFinalBoton")}
            </Link>
            <span className="text-sm text-muted">{t("ctaFinalNota")}</span>
          </div>
        </div>
      </section>

      <FAQSection />
    </div>
  );
}

export default async function HomePage() {
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
    ver("recomendaciones") ? getTrophyRecommendations(session.user.id) : nada([]),
    ver("talDia") ? talDiaComoHoy(session.user.id) : nada([]),
    juegoAnclado ? diasSinAvance(session.user.id, juegoAnclado.id) : Promise.resolve(null),
    ver("actividad") ? getFeed(session.user.id, { limite: 15 }) : nada([]),
  ]);

  const UMBRAL_ATASCO = 5;
  const mostrarAtasco = juegoAnclado && diasAtascado !== null && diasAtascado >= UMBRAL_ATASCO;

  const nearPlatinum = games
    .map((g) => ({ game: g, progress: gameProgress(g) }))
    .filter((g) => g.progress.hasPlatinum && !g.progress.platinumEarned)
    .sort((a, b) => a.progress.total - a.progress.earned - (b.progress.total - b.progress.earned))
    .slice(0, 3);

  // Lo contrario de "a un paso": empezados y parados hace más de un año
  // (mismo umbral que el filtro "Abandonados" de la biblioteca). Sin esto,
  // solo se ve en el panel lo que va bien.
  const abandonados = games
    .map((g) => ({ game: g, progress: gameProgress(g) }))
    .filter((g) => g.progress.status === "abandonado")
    .sort((a, b) => new Date(a.game.lastPlayedAt ?? 0).getTime() - new Date(b.game.lastPlayedAt ?? 0).getTime())
    .slice(0, 4);

  const now = new Date().getTime();

  const nearPlatinumSection = nearPlatinum.length > 0 && (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline gap-3.5">
        <h2 className="font-heading text-2xl font-bold">{t("aUnPasoDelPlatino")}</h2>
        <p className="text-[0.8125rem] text-muted">
          {t("loQueMenosTeQueda")}
        </p>
        <Link
          href={`/u/${profile.handle}/biblioteca?estado=a-punto`}
          className="ml-auto text-xs font-bold uppercase tracking-wide text-accent hover:underline"
        >
          {t("verTodos")}
        </Link>
      </div>

      <div className="grid gap-4">
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

        {/* Los demás juegos, si hay, en formato pequeño debajo */}
        {nearPlatinum.slice(1).length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {nearPlatinum.slice(1).map(({ game, progress }) => (
              <TiltCard
                key={game.id}
                href={`/u/${profile.handle}/${game.id}`}
                className="group relative block overflow-hidden rounded-[20px] transition-all duration-300 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]"
                style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
              >
                <div className="relative flex aspect-[21/9] items-end p-4 overflow-hidden">
                  {/* La carátula NÍTIDA como imagen de fondo — antes esto
                      llevaba solo una versión desenfocada (blur-2xl) a modo
                      de decoración, así que la carátula real nunca llegaba a
                      verse, solo un borrón de color irreconocible. */}
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={game.iconUrl ? { backgroundImage: `url(${game.iconUrl})` } : { background: coverGradient(game.id) }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
                  <p
                    className="font-heading relative z-10 translate-y-1 text-lg font-bold text-foreground transition-transform duration-300 group-hover:translate-y-0"
                    style={{ textShadow: "0 1px 10px var(--background)" }}
                  >
                    {game.title}
                  </p>
                </div>
                <div className="relative z-10 bg-[var(--surface)] p-[14px]">
                  <div className="flex items-end gap-2.5">
                    <p className="font-heading text-3xl font-bold leading-[0.9] text-platinum">
                      {progress.total - progress.earned}
                    </p>
                    <p className="pb-1 text-[0.625rem] font-bold uppercase leading-tight tracking-[0.1em] text-muted">
                      {t("restantes")}
                    </p>
                    <span className="ml-auto font-bold text-sm" style={{ color: "var(--accent-text)" }}>{progress.percent}%</span>
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${progress.percent}%`, background: "var(--accent-grad-h)" }}
                    />
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
        )}
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
