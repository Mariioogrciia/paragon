import { getLocale, getTranslations } from "next-intl/server";
import { formatDistanceToNow } from "date-fns";
import { es, enUS, de, fr } from "date-fns/locale";
import { auth } from "@/auth";
import { EsportsHub } from "@/components/EsportsHub";
import { BackButton } from "@/components/BackButton";
import { getEsportsNews, getNoticiasDeEquipos, type NoticiaDeEquipo } from "@/lib/esportsNews";
import { TarjetaNoticia } from "@/components/TarjetaNoticia";
import { getAllPandaScoreMatches, getStandingsDeTorneos } from "@/lib/pandascore";
import { getFavoritos } from "@/lib/esportsFavoritos";
import type { NewsItem } from "@/lib/rss";
import { SeccionTabs } from "@/components/SeccionTabs";
import { FavoritosProvider } from "@/components/esports/Favoritos";
import { PestanasNoticias } from "@/components/esports/PestanasNoticias";
import { Escudo } from "@/components/esports/Escudo";

export const metadata = {
  title: "eSports - Paragon",
};

const DATE_FNS_LOCALES = { es, en: enUS, de, fr } as const;
const ORDEN_NIVEL: Record<string, number> = { s: 0, a: 1, b: 2 };

export default async function EsportsPage() {
  const t = await getTranslations("Descubrir.EsportsPage");
  const locale = await getLocale();
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [esportsNewsRaw, pandascore, favoritos] = await Promise.all([
    getEsportsNews(9),
    getAllPandaScoreMatches(),
    userId ? getFavoritos(userId) : Promise.resolve([]),
  ]);

  // Tablas solo de los torneos de nivel S/A/B (los que salen desplegados).
  const torneos = [...pandascore.live, ...pandascore.upcoming, ...pandascore.past]
    .filter((m) => m.tournamentId != null && (m.tier ?? "") in ORDEN_NIVEL)
    .sort((a, b) => ORDEN_NIVEL[a.tier!] - ORDEN_NIVEL[b.tier!])
    .map((m) => m.tournamentId!);

  const [standings, noticiasEquipos] = await Promise.all([
    getStandingsDeTorneos(torneos),
    favoritos.length > 0 ? getNoticiasDeEquipos(favoritos.map((f) => f.nombre), locale) : Promise.resolve([] as NoticiaDeEquipo[]),
  ]);

  const esportsNews: NewsItem[] = esportsNewsRaw.map((item) => ({
    id: item.id,
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    summary: item.summary ?? undefined,
    imageUrl: item.imageUrl,
  }));
  const logos = new Map(favoritos.map((f) => [f.nombre, f.logo]));
  const dateFnsLocale = DATE_FNS_LOCALES[locale as keyof typeof DATE_FNS_LOCALES] ?? es;

  const todas =
    esportsNews.length > 0 ? (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {esportsNews.map((item) => (
          <TarjetaNoticia key={item.id} item={item} badge={t("badge")} />
        ))}
      </div>
    ) : (
      <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">{t("sinNoticias")}</p>
    );

  return (
    <FavoritosProvider iniciales={favoritos} logueado={!!userId}>
      <div className="mx-auto max-w-[1240px] px-7 py-12">
        <BackButton fallbackHref="/" />
        <SeccionTabs seccion="descubrir" />
        <EsportsHub
          live={pandascore.live}
          upcoming={pandascore.upcoming}
          past={pandascore.past}
          standings={standings}
          cabecera={
            <>
              <h1 className="font-heading text-[clamp(1.875rem,5vw,2.75rem)] font-bold uppercase leading-tight">
                <span className="carreras-titulo">{t("titulo")}</span>
              </h1>
              <p className="mt-2 max-w-md text-muted">{t("subtitulo")}</p>
            </>
          }
        />

        <section className="mt-16 border-t border-border pt-12" aria-labelledby="esports-noticias">
          <div className="mb-6">
            <h2 id="esports-noticias" className="mb-2 font-heading text-3xl font-bold">
              {t("noticiasTitulo")}
            </h2>
            <p className="text-muted">{favoritos.length > 0 ? t("noticiasDescripcionEquipos") : t("noticiasDescripcion")}</p>
          </div>

          {favoritos.length > 0 ? (
            <PestanasNoticias
              etiquetas={{ equipos: t("deTusEquipos"), todas: t("todas") }}
              todas={todas}
              deEquipos={
                noticiasEquipos.length > 0 ? (
                  <ol className="overflow-hidden rounded-2xl border border-border bg-surface">
                    {noticiasEquipos.map((n) => (
                      <li key={n.id} className="border-b border-border last:border-0">
                        <a
                          href={n.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-surface-2/60"
                        >
                          <Escudo logo={logos.get(n.equipo) ?? null} name={n.equipo} size={32} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold leading-snug transition-colors group-hover:text-[var(--accent-text)]">{n.title}</span>
                            <span className="mt-1 block text-xs text-muted">
                              <span className="font-bold text-foreground/80">{n.equipo}</span>
                              {n.fuente && <> · {n.fuente}</>} · {formatDistanceToNow(new Date(n.pubDate), { addSuffix: true, locale: dateFnsLocale })}
                            </span>
                          </span>
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-1 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                            <path d="M7 17L17 7M8 7h9v9" />
                          </svg>
                        </a>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">{t("sinNoticiasEquipos")}</p>
                )
              }
            />
          ) : (
            todas
          )}
        </section>
      </div>
    </FavoritosProvider>
  );
}
