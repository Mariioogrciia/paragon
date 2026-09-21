import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TiltCard } from "@/components/TiltCard";
import { auth } from "@/auth";
import { StatTile } from "@/components/StatTile";
import { TrophyCountRow } from "@/components/TrophyCounts";
import { TrophyIcon, TrophyTile } from "@/components/TrophyIcon";
import { coverGradient } from "@/lib/design";
import { getLibrary, getProfileByUserId, getGlobalStats, getTopHunters, getRarestTrophiesThisWeek } from "@/lib/profiles";
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
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { SectionTabs } from "@/components/SectionTabs";
import { esPlatinoEquivalente } from "@/lib/stats";
import { CardBuilder } from "@/components/CardBuilder";

const GRADE_ACCENT = {
  platinum: "#9fd4ec",
  gold: "#e2b53e",
  silver: "#b9c2cc",
  bronze: "#c07b4a",
} as const;

const SAMPLE_NEXT = [
  { name: "Maestro de las artes marciales", rarity: "18,4%", grade: "gold" as const },
  { name: "Coleccionista de hechizos", rarity: "31,7%", grade: "silver" as const },
  { name: "Portador de la Gran Runa", rarity: "48,9%", grade: "bronze" as const },
];

const SAMPLE_SHELF = [
  { title: "Elden Ring", pct: 74, ratio: "32/42", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg" },
  { title: "Bloodborne", pct: 100, ratio: "40/40", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/cob99l.jpg" },
  { title: "God of War Ragnarök", pct: 100, ratio: "36/36", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/coba3d.jpg" },
  { title: "Returnal", pct: 41, ratio: "12/31", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co3wc1.jpg" },
  { title: "Hollow Knight", pct: 63, ratio: "39/63", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/cobfzp.jpg" },
  { title: "Ghost of Tsushima", pct: 100, ratio: "55/55", cover: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2crj.jpg" },
];

const FEATURE_KEYS = ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8"] as const;

async function Landing() {
  const globalStats = await getGlobalStats();
  const topHunters = await getTopHunters(5);
  const rareTrophies = await getRarestTrophiesThisWeek(6);
  const t = await getTranslations("Shell.Home");

  const FEATURES = FEATURE_KEYS.map((key, i) => ({
    num: String(i + 1).padStart(2, "0"),
    title: t(`features.${key}.titulo`),
    body: t(`features.${key}.cuerpo`),
  }));

  return (
    <div>
      <section className="grid items-center gap-14 py-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <span
            className="inline-flex items-center gap-2.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em]"
            style={{ background: "rgb(var(--accent-rgb) / 0.1)", border: "1px solid rgb(var(--accent-rgb) / 0.28)", color: "var(--accent-text)" }}
          >
            <span className="h-[7px] w-[7px] rounded-full bg-good" style={{ boxShadow: "0 0 10px #4ec98a" }} />
            {t("badge")}
          </span>

          <h1 className="font-heading mt-5 text-[4.625rem] font-bold uppercase leading-[0.98] tracking-[-0.02em]">
            {t("heroTitleLine1")}
            <br />
            <span className="text-gradient">{t("heroTitleLine2")}</span>
          </h1>

          <p className="mt-6 max-w-[540px] text-lg leading-relaxed text-muted">
            {t("heroDescription")}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/entrar"
              className="rounded-xl px-6 py-4 text-[0.9375rem] font-bold text-background transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_40px_rgb(var(--accent-rgb) / 0.6)]"
              style={{ background: "var(--accent-grad)", boxShadow: "0 12px 34px rgb(var(--accent-rgb) / 0.3)" }}
            >
              {t("ctaEmpezar")}
            </Link>
            <Link
              href="/ejemplo"
              className="rounded-xl px-[22px] py-4 text-[0.9375rem] font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "#dbe5f2" }}
            >
              {t("ctaVerEjemplo")}
            </Link>
          </div>

          <p className="mt-[18px] text-[0.8125rem] text-muted">
            {t("soloIdPublico")}
          </p>
        </div>

        <div
          className="relative rounded-[20px] p-[26px]"
          style={{ border: "1px solid #232c3d", background: "linear-gradient(#141b28, #0f141d)", boxShadow: "0 30px 80px rgba(0, 0, 0, 0.5)" }}
        >
          <div className="flex items-center gap-3.5">
            <span
              className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-2xl"
              style={{ background: "linear-gradient(155deg, #cfeaf7, #6fb6d8 55%, #2b5f7d)", boxShadow: "0 0 34px rgba(159, 212, 236, 0.4)" }}
            >
              <TrophyIcon grade="platinum" size={34} />
            </span>
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">{t("platinoMasCercano")}</p>
              <p className="font-heading mt-1 text-[1.375rem] font-bold">Elden Ring</p>
            </div>
          </div>

          <div className="mt-[22px] flex items-end gap-3">
            <span className="font-heading text-[4.25rem] font-bold leading-[0.85] text-platinum">10</span>
            <span className="pb-2 text-[0.8125rem] font-semibold text-muted whitespace-pre-line">
              {t("trofeosParaElPlatino")}
            </span>
          </div>

          <div className="mt-[18px] h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{ width: "74%", background: "var(--accent-grad-h)" }} />
          </div>
          <div className="mt-2.5 flex justify-between text-xs text-muted">
            <span>{t("conseguidos", { conseguidos: 32, total: 42 })}</span>
            <span className="font-bold" style={{ color: "var(--accent-text)" }}>74%</span>
          </div>

          <ul className="mt-6 space-y-2">
            {SAMPLE_NEXT.map((s) => (
              <li
                key={s.name}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: "#121824", border: "1px solid #1e2634" }}
              >
                <TrophyTile grade={s.grade} size={30} />
                <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold">{s.name}</span>
                <span className="shrink-0 text-xs font-bold" style={{ color: GRADE_ACCENT[s.grade] }}>
                  {s.rarity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 pt-2 lg:grid-cols-4">
        <div className="rounded-2xl p-[22px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgb(var(--accent-rgb) / 0.15)]" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <p className="font-heading text-4xl font-bold leading-none text-platinum">{globalStats.platinos > 0 ? globalStats.platinos : "87"}</p>
          <p className="mt-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">{t("statPlatinosGrupo")}</p>
        </div>
        <div className="rounded-2xl p-[22px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <p className="font-heading text-4xl font-bold leading-none">{globalStats.trofeos > 0 ? globalStats.trofeos.toLocaleString("es-ES") : "4.312"}</p>
          <p className="mt-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">{t("statTrofeosContados")}</p>
        </div>
        <div className="rounded-2xl p-[22px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <p className="font-heading text-4xl font-bold leading-none">{globalStats.juegos > 0 ? globalStats.juegos.toLocaleString("es-ES") : "214"}</p>
          <p className="mt-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">{t("statJuegosRastreados")}</p>
        </div>
        <div className="rounded-2xl p-[22px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <p className="font-heading text-4xl font-bold leading-none">{globalStats.completadoMedio > 0 ? `${globalStats.completadoMedio}%` : "68%"}</p>
          <p className="mt-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">{t("statCompletadoMedio")}</p>
        </div>
      </section>

      {topHunters.length > 0 && (
        <section className="pt-[72px]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-[2.125rem] font-bold uppercase leading-tight tracking-[-0.01em]">
                {t("muroFamaTitulo")}
              </h2>
              <p className="mt-2 max-w-[560px] text-base text-muted">{t("muroFamaDescripcion")}</p>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {topHunters.map((hunter, i) => (
              <Link
                key={hunter.userId}
                href={`/u/${hunter.handle}`}
                className="group relative flex flex-col items-center gap-3 rounded-2xl p-6 text-center transition-all duration-300 hover:-translate-y-1"
                style={
                  i === 0
                    ? { border: "1px solid rgb(var(--accent-rgb) / 0.4)", background: "linear-gradient(var(--surface), rgb(var(--accent-rgb) / 0.08))", boxShadow: "0 0 30px rgb(var(--accent-rgb) / 0.12)" }
                    : { border: "1px solid var(--border)", background: "var(--surface)" }
                }
              >
                <span
                  className="font-heading absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-[0.6875rem] font-bold"
                  style={
                    i === 0
                      ? { background: "var(--accent-grad)", color: "#061021" }
                      : { background: "var(--surface-2)", color: "var(--muted)" }
                  }
                >
                  {i + 1}
                </span>
                <Avatar src={hunter.image} name={hunter.name ?? hunter.handle ?? "?"} size={64} />
                <div className="min-w-0">
                  <p className="truncate text-[0.9375rem] font-bold">{hunter.name ?? `@${hunter.handle}`}</p>
                  <p className="truncate text-xs text-muted">@{hunter.handle}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrophyIcon grade="platinum" size={16} />
                  <span className="font-heading text-lg font-bold text-platinum">{hunter.platinos}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {rareTrophies.length > 0 && (
        <section className="pt-[72px]">
          <h2 className="font-heading text-[2.125rem] font-bold uppercase leading-tight tracking-[-0.01em]">
            {t("rarosTitulo")}
          </h2>
          <p className="mt-2 max-w-[560px] text-base text-muted">{t("rarosDescripcion")}</p>

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rareTrophies.map((rt, i) => (
              <Link
                key={`${rt.userId}-${rt.gameId}-${i}`}
                href={`/u/${rt.handle}`}
                className="flex items-center gap-3.5 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1"
                style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
              >
                <TrophyPhoto trophy={{ iconUrl: rt.trophyIconUrl, grade: rt.grade }} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] font-bold">{rt.trophyName}</p>
                  <p className="truncate text-xs text-muted">{rt.gameTitle}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Avatar src={rt.image} name={rt.name ?? rt.handle ?? "?"} size={18} />
                    <span className="truncate text-[0.6875rem] text-muted">@{rt.handle}</span>
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
                  style={{ background: "rgb(var(--accent-rgb) / 0.12)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent-text)" }}
                >
                  {t("rarosPorcentaje", { percent: rt.rarityPercent.toFixed(1) })}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section id="biblioteca" className="pt-[72px]">
        <h2 className="font-heading text-[2.125rem] font-bold uppercase leading-tight tracking-[-0.01em]">
          {t("bibliotecaTitulo")}
        </h2>
        <p className="mb-6 mt-2 max-w-[620px] text-base text-muted">
          {t("bibliotecaDescripcion")}
        </p>

        <div className="relative -mx-4 overflow-hidden px-4 sm:mx-0 sm:px-0">
          <div className="flex w-max gap-4 animate-marquee hover:[animation-play-state:paused]">
            {[...SAMPLE_SHELF, ...SAMPLE_SHELF, ...SAMPLE_SHELF].map((g, i) => (
              <TiltCard
                key={`${g.title}-${i}`}
                href="#biblioteca"
                className="group relative w-[160px] shrink-0 cursor-pointer overflow-hidden rounded-[20px] transition-all duration-300 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] sm:w-[220px]"
                style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
              >
                <div
                  className="relative flex aspect-[3/4] items-end p-4 bg-cover bg-center"
                  style={{ backgroundImage: `url(${g.cover})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d13] via-[#0a0d13]/40 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
                  <p
                    className="font-heading relative z-10 translate-y-2 text-[0.9375rem] font-bold leading-tight text-white transition-transform duration-300 group-hover:translate-y-0 sm:text-[1.0625rem]"
                    style={{ textShadow: "0 2px 16px rgba(0, 0, 0, 0.9)" }}
                  >
                    {g.title}
                  </p>
                </div>
                <div className="relative z-10 bg-[var(--surface)] p-4 pt-1">
                  <div className="h-[5px] overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${g.pct}%`, background: "var(--accent-grad-h)" }}
                    />
                  </div>
                  <div className="mt-2.5 flex justify-between text-[0.75rem] font-medium text-muted">
                    <span className="font-bold" style={{ color: "var(--accent-text)" }}>{g.pct}%</span>
                    <span>{g.ratio}</span>
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
          {/* Sombra lateral para difuminar los bordes del marquee */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
        </div>

        <div className="mt-[72px]">
          <h2 className="font-heading text-[1.875rem] font-bold uppercase leading-tight tracking-[-0.01em] text-center mb-8">
            {t("comoFuncionaTitulo")}
          </h2>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.num}
                className="rounded-[18px] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgb(var(--accent-rgb) / 0.08)]"
                style={{ border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" }}
              >
                <span
                  className="font-heading inline-flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-[0.8125rem] font-bold"
                  style={{ background: "rgb(var(--accent-rgb) / 0.12)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent-text)" }}
                >
                  {f.num}
                </span>
                <h3 className="font-heading mt-4 text-[1.0625rem] font-bold leading-tight">{f.title}</h3>
                <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/como-funciona" className="text-sm font-bold uppercase tracking-wide text-accent hover:underline">
              {t("verTodoComoFunciona")}
            </Link>
          </div>
        </div>
      </section>

      <section className="pt-[72px]">
        <h2 className="font-heading text-[2.125rem] font-bold uppercase leading-tight tracking-[-0.01em]">
          {t("comparativaTitulo")}
        </h2>
        <p className="mt-2 max-w-[560px] text-base text-muted">{t("comparativaDescripcion")}</p>

        <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-[20px] p-7 opacity-80 grayscale" style={{ border: "1px solid #2a2f38", background: "#181b20" }}>
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-[#8a8f98]">{t("comparativaAntesTitulo")}</p>
            <div className="mt-5 space-y-2">
              {["t1", "t2", "t3", "t4"].map((key) => (
                <div key={key} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: "#20242b" }}>
                  <span className="h-7 w-7 shrink-0 rounded-full" style={{ background: "#3a3f47" }} />
                  <span className="truncate text-sm text-[#a8adb5]">{t(`comparativaAntesItem.${key}`)}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-[20px] p-7"
            style={{ border: "1px solid rgb(var(--accent-rgb) / 0.35)", background: "linear-gradient(var(--surface), rgb(var(--accent-rgb) / 0.06))", boxShadow: "0 0 40px rgb(var(--accent-rgb) / 0.1)" }}
          >
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--accent-text)" }}>
              {t("comparativaDespuesTitulo")}
            </p>
            <div className="mt-5 space-y-2">
              <div className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                <TrophyIcon grade="gold" size={28} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{t("comparativaAntesItem.t1")}</span>
                  <span className="block text-xs" style={{ color: "var(--accent-text)" }}>{t("comparativaRareza", { percent: "6.2" })}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                <TrophyIcon grade="silver" size={28} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{t("comparativaAntesItem.t2")}</span>
                  <span className="block text-xs" style={{ color: "var(--accent-text)" }}>{t("comparativaRareza", { percent: "22.8" })}</span>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                <span className="text-sm font-semibold">{t("comparativaDificultad")}</span>
                <span className="rounded-full px-2.5 py-1 text-[0.6875rem] font-bold" style={{ background: "rgb(239 68 68 / 0.15)", color: "#f87171" }}>
                  {t("comparativaDificultadValor")}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                <span className="text-sm font-semibold">{t("comparativaEta")}</span>
                <span className="text-sm font-bold" style={{ color: "var(--accent-text)" }}>{t("comparativaEtaValor")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CardBuilder games={SAMPLE_SHELF} />

      <section className="py-[72px]">
        <div
          className="relative overflow-hidden rounded-[24px] p-12 sm:p-16"
          style={{
            border: "1px solid #26364d",
            background:
              "radial-gradient(600px 300px at 20% 0%, rgb(var(--accent-rgb) / 0.22), transparent 70%), linear-gradient(160deg, #101a2b, #0b0f17)",
          }}
        >
          <h2 className="font-heading max-w-[640px] text-[3.25rem] font-bold uppercase leading-none tracking-[-0.02em]">
            {t("ctaFinalTitulo")}
          </h2>
          <div className="mt-[30px] flex flex-wrap items-center gap-[18px]">
            <Link
              href="/entrar"
              className="rounded-xl px-[26px] py-4 text-[0.9375rem] font-bold text-background transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_40px_rgb(var(--accent-rgb) / 0.6)]"
              style={{ background: "var(--accent-grad)", boxShadow: "0 14px 40px rgb(var(--accent-rgb) / 0.35)" }}
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

  const profile = await getProfileByUserId(session.user.id);
  if (!profile?.handle || profile.accounts.length === 0) redirect("/bienvenida");

  const { player, games } = await getLibrary(profile);
  const stats = summarise(games);
  const nivelParagon = paragonProgress(games);

  const recientes = games.filter(g => !g.isWishlist).slice(0, 6);

  // Detector de Atascos: solo tiene sentido mirarlo si hay un juego anclado
  // Y todavía no está platinado/100% (un juego ya terminado no se "atasca").
  const juegoAnclado = games.find((g) => g.isPinned && !esPlatinoEquivalente(g)) ?? null;

  const [mesesHistorico, rachasUsuario, resumen, wishlistIds, misiones, recomendaciones, efemerides, diasAtascado] = await Promise.all([
    trofeosPorMes(session.user.id),
    rachas(session.user.id),
    resumenHistorico(session.user.id),
    getWishlistIgdbIds(session.user.id),
    getWeeklyMissions(session.user.id),
    getTrophyRecommendations(session.user.id),
    talDiaComoHoy(session.user.id),
    juegoAnclado ? diasSinAvance(session.user.id, juegoAnclado.id) : Promise.resolve(null),
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
  const feed = await getFeed(session.user.id);

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
              <div className="inline-block mb-3 px-3 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest bg-accent/20 text-accent-text border border-accent/30 w-fit mx-auto sm:mx-0">
                {t("siguientePlatino")}
              </div>
              <h3 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-2" style={{ textShadow: "0 2px 14px rgba(0, 0, 0, 0.9)" }}>
                {nearPlatinum[0].game.title}
              </h3>

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

            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-[#0a0d13] via-[#0a0d13]/80 to-transparent opacity-90" />
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
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d13] via-[#0a0d13]/50 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
                  <p
                    className="font-heading relative z-10 translate-y-1 text-lg font-bold text-white transition-transform duration-300 group-hover:translate-y-0"
                    style={{ textShadow: "0 2px 14px rgba(0, 0, 0, 0.9)" }}
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
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d13] via-[#0a0d13]/60 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
                    <p
                      className="font-heading relative z-10 translate-y-2 text-[0.9375rem] font-bold leading-tight text-white transition-transform duration-300 group-hover:translate-y-0 sm:text-[1.0625rem]"
                      style={{ textShadow: "0 2px 16px rgba(0, 0, 0, 0.9)" }}
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

  return (
    <div className="space-y-9">
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
            <span className="h-[7px] w-[7px] rounded-full bg-good" style={{ boxShadow: "0 0 10px #4ec98a" }} />
            {player.accounts.map((a) => a.username).join(" · ")}
            {t("nivelParagon", { nivel: nivelParagon.level })}
          </p>
          <h1 className="font-heading text-[2.625rem] font-bold uppercase leading-none tracking-tight">
            {t("hola", { nombre: player.name })}
          </h1>
        </div>

        <Link
          href={`/u/${profile.handle}`}
          className="ml-auto rounded-[10px] px-4 py-2.5 text-[0.8125rem] font-semibold"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--accent-text)" }}
        >
          {t("verPerfilCompleto")}
        </Link>
      </div>

      <SectionTabs
        storageKey="panel"
        tabs={[
          {
            key: "resumen",
            label: t("tabResumen"),
            content: (
              <>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
                  <div
                    className="relative overflow-hidden rounded-[20px] p-6"
                    style={{
                      border: "1px solid var(--border)",
                      background:
                        "radial-gradient(400px 200px at 80% 0%, rgba(159, 212, 236, 0.22), transparent 70%), linear-gradient(165deg, #14202c, #0d131c)",
                    }}
                  >
                    <div className="flex items-center gap-2.5 text-platinum">
                      <TrophyIcon grade="platinum" size={22} />
                      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em]">{t("platinos")}</p>
                    </div>
                    <p
                      className="font-heading mt-2.5 text-[6rem] font-bold leading-[0.85]"
                      style={{ color: "#dff0f8", textShadow: "0 0 40px rgba(159, 212, 236, 0.35)" }}
                    >
                      {stats.platinos}
                    </p>
                  </div>

                  <StatTile value={stats.trofeos} label={t("trofeos")} />
                  <StatTile value={stats.juegos} label={t("juegos")} />
                  <StatTile value={`${stats.completadoMedio}%`} label={t("completadoMedio")} />
                </div>

                <TrophyCountRow
                  counts={stats.counts}
                  summary={t("trofeosEnJuegos", { trofeos: stats.trofeos.toLocaleString("es-ES"), juegos: stats.juegos })}
                />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2.5fr]">
                  <div className="h-full">
                    <MonthlySummary meses={mesesHistorico} />
                  </div>
                  <TrophyHistory
                    meses={mesesHistorico}
                    rachas={rachasUsuario}
                    resumen={resumen}
                    totalPerfil={stats.trofeos}
                  />
                </div>

                <WeeklyMissions missions={misiones} />
                {mostrarAtasco && juegoAnclado && (
                  <AvisoAtasco gameId={juegoAnclado.id} titulo={juegoAnclado.title} dias={diasAtascado!} handle={profile.handle} />
                )}
                <TalDiaComoHoy efemerides={efemerides} handle={profile.handle} />
                <ActivityStats games={games} now={now} />
                <TrophyRecommendations recommendations={recomendaciones} handle={profile.handle} showcaseTrophies={profile.showcaseTrophies ?? []} />
              </>
            ),
          },
          {
            key: "actividad",
            label: t("tabActividad"),
            content: (
              <>
                {nearPlatinumSection}
                {abandonadosSection}
                <UpcomingGames wishlistedIgdbIds={wishlistIds} />
                {recientesSection}
                <section>
                  <ActivityFeed activities={feed} currentUserId={session.user.id} />
                </section>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
