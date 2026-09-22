import { useTranslations } from "next-intl";

/**
 * Horas estimadas por HowLongToBeat — historia y platino/100% por separado
 * (pedido explícito: "por un lado modo historia y por otro para el
 * platino"). Distinto de `EtaPlatinoCard`: esa calcula CUÁNDO terminarás TÚ
 * según tu ritmo real (solo tiene sentido si ya has empezado); esto es
 * cuánto tarda la gente en general, de media — útil incluso antes de
 * empezar el juego.
 */
export function HltbCard({ hltb }: { hltb?: { main?: number; mainExtra?: number; completionist?: number } }) {
  const t = useTranslations("Biblioteca");

  if (!hltb || (hltb.main == null && hltb.completionist == null)) return null;

  return (
    <section className="rounded-[18px] p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
        {t("HltbCard.title")}
      </h2>
      <div className="flex flex-wrap gap-6">
        {hltb.main != null && (
          <div>
            <p className="font-heading text-2xl font-bold">{hltb.main}h</p>
            <p className="text-[0.6875rem] text-muted">{t("HltbCard.mainStory")}</p>
          </div>
        )}
        {hltb.completionist != null && (
          <div>
            <p className="font-heading text-2xl font-bold" style={{ color: "var(--platinum)" }}>
              {hltb.completionist}h
            </p>
            <p className="text-[0.6875rem] text-muted">{t("HltbCard.platinum100")}</p>
          </div>
        )}
      </div>
      <p className="mt-3 text-[0.625rem] text-muted">
        {t("HltbCard.note")}
      </p>
    </section>
  );
}
