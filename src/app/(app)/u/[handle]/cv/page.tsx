/* eslint-disable @next/next/no-img-element -- carátulas de CDNs externos (PSN, Steam, Xbox...), como en el resto de la web: next/image gastaría la cuota de optimización del plan Hobby */
import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Avatar } from "@/components/Avatar";
import { AchievementIcon } from "@/components/AchievementIcon";
import { BADGE_DEFINITIONS } from "@/components/Badges";
import { DescargarPdfButton } from "@/components/DescargarPdfButton";
import { BackButton } from "@/components/BackButton";
import { TrophyIcon } from "@/components/TrophyIcon";
import { coverGradient } from "@/lib/design";
import { paragonProgress } from "@/lib/level";
import { getLibrary, getProfileByHandle, getUserBadges } from "@/lib/profiles";
import { DOMINIO } from "@/lib/site";
import { esPlatinoEquivalente, summarise } from "@/lib/stats";
import { PLATFORM_LABEL } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const t = await getTranslations("Perfil");
  return { title: t("CvPage.meta", { handle }) };
}

/**
 * "Hoja de servicios": el perfil entero en una sola página pensada para
 * imprimirse o guardarse como PDF — algo que la gente sí comparte fuera de
 * la app. El botón usa el diálogo de impresión del navegador (ver
 * DescargarPdfButton), sin generar PDF en el servidor.
 *
 * Rediseño (21 oct 2026, "demasiado sosa"): ahora es un expediente de
 * verdad — cabecera con nº de expediente y fecha, el avatar dentro del
 * anillo de progreso del nivel, cifras en libro de cuentas, reparto por
 * metales, condecoraciones con su nombre, últimos platinos con carátula,
 * campañas destacadas con su progreso y un sello. Usa los colores del tema
 * en pantalla y pasa a blanco y negro al imprimir.
 */

const METALES = ["platinum", "gold", "silver", "bronze"] as const;
const ROTULO = "text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-muted print:text-black/60";

/** Anillo de progreso del nivel alrededor del avatar. */
function AnilloNivel({ progreso, children }: { progreso: number; children: React.ReactNode }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[124px] w-[124px] shrink-0">
      <svg viewBox="0 0 124 124" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="62" cy="62" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle
          cx="62"
          cy="62"
          r={r}
          fill="none"
          stroke="rgb(var(--accent-rgb))"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(progreso / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-[14px] overflow-hidden rounded-full">{children}</div>
    </div>
  );
}

export default async function HojaDeServiciosPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [t, locale] = await Promise.all([getTranslations("Perfil"), getLocale()]);

  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const { player, games, xpMisiones } = await getLibrary(profile);
  if (games.length === 0) notFound();

  const stats = summarise(games);
  const nivel = paragonProgress(games, xpMisiones);
  const badges = await getUserBadges(profile.userId);
  const jugados = games.filter((g) => !g.isWishlist);
  const horas = Math.round(jugados.reduce((total, g) => total + (g.playtimeMinutes ?? 0), 0) / 60);

  // Nº de expediente estable (sale del id, no lo revela) y fecha de emisión.
  const expediente = `PG-${createHash("sha256").update(profile.userId).digest("hex").slice(0, 6).toUpperCase()}`;
  const emitido = new Date().toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });

  // Los 6 juegos más "exprimidos": por horas si las hay, y si no, por
  // trofeos — mismo criterio que el Wrap.
  const destacados = [...jugados]
    .sort((a, b) => (b.playtimeMinutes ?? 0) - (a.playtimeMinutes ?? 0) || b.earnedTotal - a.earnedTotal)
    .slice(0, 6);
  const platinos = jugados
    .filter((g) => esPlatinoEquivalente(g))
    .sort((a, b) => (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""))
    .slice(0, 8);
  const totalMetales = METALES.reduce((s, k) => s + stats.counts[k], 0);
  const condecoraciones = badges.filter((b) => BADGE_DEFINITIONS[b.badgeId]);

  return (
    <div className="mx-auto max-w-[900px] px-5 pb-24 pt-9 sm:px-7 print:max-w-none print:px-0 print:pt-0">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden" data-no-print>
        <BackButton fallbackHref={`/u/${handle}`} className="mb-0" />
        <DescargarPdfButton />
      </div>

      <article
        className="relative overflow-hidden rounded-[22px] print:rounded-none print:border-0 print:bg-white print:text-black"
        style={{ border: "1px solid var(--border)", background: "linear-gradient(180deg, var(--surface), var(--background) 70%)" }}
      >
        {/* Franja de cabecera del expediente */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-3 sm:px-9 print:border-black/20">
          <p className={ROTULO}>
            <span className="text-[var(--accent-text)] print:text-black">Paragon</span> · {t("CvPage.marca")}
          </p>
          <p className="text-[0.6875rem] font-semibold tabular-nums text-muted print:text-black/60">
            {t("CvPage.expediente", { n: expediente })} · {t("CvPage.emitido", { fecha: emitido })}
          </p>
        </div>

        <div className="px-6 py-8 sm:px-9">
          {/* Identidad */}
          <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <AnilloNivel progreso={nivel.progreso}>
              <Avatar src={player.avatarUrl} name={player.name} size={96} />
            </AnilloNivel>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-heading text-4xl font-bold uppercase leading-none sm:text-5xl">{player.name}</h1>
              <p className="mt-2 text-sm text-muted print:text-black/60">
                @{handle}
                {profile.profileTitle && <span className="text-[var(--accent-text)] print:text-black"> · {profile.profileTitle}</span>}
              </p>
              {player.accounts.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {player.accounts.map((a) => (
                    <li
                      key={`${a.platform}-${a.accountId}`}
                      className="rounded-full border border-border px-2.5 py-1 text-[0.6875rem] font-semibold print:border-black/20"
                    >
                      <span className="text-muted print:text-black/60">{PLATFORM_LABEL[a.platform]}</span> {a.username}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="sm:w-[190px] sm:text-right">
              <p className={ROTULO}>{t("CvPage.rango")}</p>
              <p className="font-heading text-4xl font-bold leading-none">{t("CvPage.nivel", { nivel: nivel.level })}</p>
              <div className="mt-2 h-1.5 rounded-full bg-[var(--surface-2)] print:bg-black/10">
                <div className="h-full rounded-full print:bg-black" style={{ width: `${nivel.progreso}%`, background: "rgb(var(--accent-rgb))" }} />
              </div>
              <p className="mt-1.5 text-[0.6875rem] tabular-nums text-muted print:text-black/60">
                {t("CvPage.xpParagon", { xp: nivel.xp.toLocaleString(locale) })} ·{" "}
                {t("CvPage.paraSiguiente", { xp: nivel.restante.toLocaleString(locale), n: nivel.siguienteNivel })}
              </p>
            </div>
          </header>

          {/* Libro de cuentas */}
          {/* En móvil los platinos van solos arriba y el resto en 2×2, sin cifra huérfana */}
          <section className="mt-9 grid grid-cols-2 border-y border-border sm:grid-cols-5 print:border-black/20">
            {[
              { valor: stats.platinos.toLocaleString(locale), etiqueta: t("CvPage.statPlatinos"), color: "var(--platinum)" },
              { valor: stats.trofeos.toLocaleString(locale), etiqueta: t("CvPage.statTrofeos") },
              { valor: stats.juegos.toLocaleString(locale), etiqueta: t("CvPage.statJuegos") },
              { valor: `${stats.completadoMedio}%`, etiqueta: t("CvPage.completado") },
              { valor: horas > 0 ? t("CvPage.horas", { horas: horas.toLocaleString(locale) }) : "—", etiqueta: t("CvPage.statJugadas") },
            ].map((item, i) => (
              <div
                key={item.etiqueta}
                className={`px-3 py-5 text-center ${i === 0 ? "col-span-2 border-b border-border sm:col-span-1 sm:border-b-0 print:border-black/20" : "sm:border-l sm:border-border sm:print:border-black/20"} ${i % 2 === 0 && i > 0 ? "border-l border-border print:border-black/20" : ""}`}
              >
                <p className="font-heading text-3xl font-bold tabular-nums leading-none" style={item.color ? { color: item.color } : undefined}>
                  {item.valor}
                </p>
                <p className={`mt-2 ${ROTULO}`}>{item.etiqueta}</p>
              </div>
            ))}
          </section>

          {/* Metales */}
          {totalMetales > 0 && (
            <section className="mt-8">
              <h2 className={`mb-3 ${ROTULO}`}>{t("CvPage.metales")}</h2>
              <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-[4px]">
                {METALES.filter((k) => stats.counts[k] > 0).map((k) => (
                  <div key={k} style={{ flexGrow: stats.counts[k], background: `var(--${k})` }} />
                ))}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {METALES.filter((k) => stats.counts[k] > 0).map((k) => (
                  <li key={k} className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
                    <TrophyIcon grade={k} size={18} /> {stats.counts[k].toLocaleString(locale)}
                  </li>
                ))}
                {stats.logrosSinMetal > 0 && (
                  <li className="text-sm text-muted print:text-black/60">
                    + {t("CvPage.logrosSinMetal", { n: stats.logrosSinMetal.toLocaleString(locale) })}
                  </li>
                )}
              </ul>
            </section>
          )}

          <div className={`mt-9 grid grid-cols-1 gap-9 ${platinos.length > 0 && condecoraciones.length > 0 ? "md:grid-cols-2" : ""}`}>
            {/* Últimos platinos */}
            {platinos.length > 0 && (
              <section>
                <h2 className={`mb-3 ${ROTULO}`}>{t("CvPage.platinosRecientes")}</h2>
                <div className={`grid grid-cols-4 gap-2 ${condecoraciones.length > 0 ? "" : "sm:grid-cols-8"}`}>
                  {platinos.map((g) => (
                    <div
                      key={g.id}
                      title={g.title}
                      className="relative aspect-square overflow-hidden rounded-lg ring-1 ring-[rgb(159_212_236/0.4)] print:ring-black/20"
                      style={{ background: coverGradient(g.id) }}
                    >
                      {g.iconUrl && <img src={g.iconUrl} alt={g.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Condecoraciones */}
            {condecoraciones.length > 0 && (
              <section>
                <h2 className={`mb-3 ${ROTULO}`}>{t("CvPage.condecoraciones", { n: condecoraciones.length })}</h2>
                <ul className={`grid grid-cols-2 gap-x-4 gap-y-2 ${platinos.length > 0 ? "" : "sm:grid-cols-3 md:grid-cols-4"}`}>
                  {condecoraciones.map(({ badgeId }) => (
                    <li key={badgeId} className="flex min-w-0 items-center gap-2">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ background: BADGE_DEFINITIONS[badgeId].bg }}
                      >
                        <AchievementIcon id={badgeId} size={12} />
                      </span>
                      <span className="truncate text-[0.8125rem] font-semibold">{t(`Badges.items.${badgeId}.name`)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Campañas destacadas */}
          {destacados.length > 0 && (
            <section className="mt-9">
              <h2 className={`mb-3 ${ROTULO}`}>{t("CvPage.destacados")}</h2>
              <ol className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {destacados.map((g, i) => (
                  <li key={g.id} className="flex items-center gap-3">
                    <span className="w-5 shrink-0 font-heading text-lg font-bold text-muted print:text-black/40">{i + 1}</span>
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg" style={{ background: coverGradient(g.id) }}>
                      {g.iconUrl && <img src={g.iconUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold" title={g.title}>
                          <span className="truncate">{g.title}</span>
                          {esPlatinoEquivalente(g) && <TrophyIcon grade="platinum" size={13} />}
                        </p>
                        <p className="shrink-0 text-xs tabular-nums text-muted print:text-black/60">
                          {g.playtimeMinutes ? t("CvPage.horas", { horas: Math.round(g.playtimeMinutes / 60).toLocaleString(locale) }) : t("CvPage.trofeosCount", { n: g.earnedTotal })}
                        </p>
                      </div>
                      <div className="mt-1.5 h-1 rounded-full bg-[var(--surface-2)] print:bg-black/10">
                        <div className="h-full rounded-full print:bg-black" style={{ width: `${Math.max(2, g.progressPercent)}%`, background: "rgb(var(--accent-rgb))" }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Pie con sello */}
          <footer className="mt-12 flex flex-wrap items-end justify-between gap-6 border-t border-border pt-6 print:border-black/20">
            <p className="text-[0.6875rem] text-muted print:text-black/60">
              {t("CvPage.footer", { url: `${DOMINIO.replace(/^www\./, "")}/u/${handle}` })}
            </p>
            <div
              className="ml-auto flex h-24 w-24 -rotate-12 flex-col items-center justify-center rounded-full border-2 text-center print:border-black print:text-black"
              style={{ borderColor: "rgb(var(--accent-rgb) / 0.7)", color: "rgb(var(--accent-rgb))" }}
              aria-hidden="true"
            >
              <span className="text-[0.5625rem] font-bold uppercase tracking-[0.18em]">{t("CvPage.sello")}</span>
              <span className="font-heading text-2xl font-bold leading-none">{nivel.level}</span>
              <span className="text-[0.5625rem] font-bold uppercase tracking-[0.18em]">Paragon</span>
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
}
