import { getTranslations } from "next-intl/server";
import { EsportsHub } from "@/components/EsportsHub";
import { BackButton } from "@/components/BackButton";
import { getEsportsNews } from "@/lib/esportsNews";
import { TarjetaNoticia } from "@/components/TarjetaNoticia";
import { getAllPandaScoreMatches } from "@/lib/pandascore";
import type { NewsItem } from "@/lib/rss";

export const metadata = {
  title: "eSports - Paragon",
};

export default async function EsportsPage() {
  const t = await getTranslations("Descubrir.EsportsPage");
  const [esportsNewsRaw, pandascore] = await Promise.all([
    getEsportsNews(9),
    getAllPandaScoreMatches()
  ]);
  
  const esportsNews: NewsItem[] = esportsNewsRaw.map((item) => ({
    id: item.id,
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    summary: item.summary ?? undefined,
    imageUrl: item.imageUrl,
  }));

  return (
    <div className="mx-auto max-w-[1240px] px-7 py-12">
      <BackButton fallbackHref="/" />
      <div className="mb-8 flex flex-col gap-8">
        <div>
          <h1 className="font-heading text-3xl font-bold mb-2">{t("titulo")}</h1>
          <p className="text-muted">{t("subtitulo")}</p>
        </div>
        
        <EsportsHub live={pandascore.live} upcoming={pandascore.upcoming} past={pandascore.past} />
      </div>

      {esportsNews.length > 0 && (
        <div className="mt-16 border-t border-border pt-12">
          <div className="mb-8">
            <h2 className="font-heading text-3xl font-bold mb-2">{t("noticiasTitulo")}</h2>
            <p className="text-muted">{t("noticiasDescripcion")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {esportsNews.map((item) => (
              <TarjetaNoticia key={item.id} item={item} badge={t("badge")} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
