/* eslint-disable @next/next/no-img-element -- imágenes de CDNs externos (PSN, Steam, Xbox, IGDB...), como en el resto de la web: next/image gastaría la cuota de optimización del plan Hobby */
import Link from "@/components/Enlace";
import { metaPublica } from "@/lib/seo";
import { haceRato } from "@/lib/design";
import { JsonLd } from "@/components/JsonLd";
import { datosAplicacion } from "@/lib/datosEstructurados";
import { dominioPublico } from "@/lib/site";
import { getLocale, getTranslations } from "next-intl/server";
import { TrophyIcon } from "@/components/TrophyIcon";
import { getGlobalStats, getTopHunters, getRarestTrophiesThisWeek, getRecentPlatinumActivity } from "@/lib/profiles";
import { Avatar } from "@/components/Avatar";
import { TrophyPhoto } from "@/components/TrophyList";
import { FAQSection } from "@/components/FAQ";
import { CardBuilder } from "@/components/CardBuilder";
import { LandingThemeSwitcher } from "@/components/LandingThemeSwitcher";
import { Convergencia } from "@/components/landing/Convergencia";
import { ArrowRight, Eye, Gift, Route, ShieldCheck } from "lucide-react";


/*
 * La portada sin sesión (sacada de app/(app)/page.tsx el 21 oct 2026): la
 * usan la portada de siempre y su copia cacheable de `(publico)`.
 */
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

/**
 * Nombre que se enseña en la portada pública (sin sesión): solo el de pila.
 * `name` es el nombre completo que llega de Google/Discord, y la portada la
 * ve cualquiera — el @handle ya identifica a la persona (auditoría, 28 sept
 * 2026).
 */
function nombrePublico(name: string | null | undefined, handle: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] || (handle ? `@${handle}` : "?");
}

export async function Landing() {
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
      {/* Para buscadores: qué es Paragon (gratis, web, Android e iOS). */}
      <JsonLd datos={datosAplicacion(dominioPublico())} />
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
                <span className="text-[0.6875rem] text-muted">· {haceRato(p.createdAt, idioma)}</span>
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
                        {t("landing.cartelaPor", { handle: rt.handle ?? "?" })} · {haceRato(rt.earnedAt, idioma)}
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
                      {nombrePublico(p.name, p.handle)} · {haceRato(p.createdAt, idioma)}
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

// La portada, con su URL canónica (sin ?parámetros ni la dirección vieja).
export const metadatosPortada = metaPublica(
  "/",
  "Paragon · Trofeos y logros de PlayStation, Steam, Xbox y Epic",
  "Tus trofeos y logros de PlayStation, Steam, Xbox y Epic en un solo perfil: platinos, rareza, ligas con amigos y guías. Gratis, en la web y en el móvil.",
);
