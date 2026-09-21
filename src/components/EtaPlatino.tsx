import { getTranslations } from "next-intl/server";
import type { EtaPlatino } from "@/lib/eta";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" });

/** Cuándo, a tu ritmo de los últimos 30 días, tocarías el platino/100%. */
export async function EtaPlatinoCard({ eta, esMio }: { eta: EtaPlatino; esMio: boolean }) {
  const t = await getTranslations("Biblioteca");
  const pronoun = esMio ? "mine" : "theirs";
  const rate =
    eta.ritmoDiario >= 1
      ? t("EtaPlatino.rateFast", { count: eta.ritmoDiario.toFixed(1) })
      : t("EtaPlatino.rateSlow", { days: Math.round(1 / eta.ritmoDiario) });

  return (
    <section
      className="rounded-[18px] p-5"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <h2 className="mb-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
        {t("EtaPlatino.heading")}
      </h2>
      <div className="flex flex-wrap items-baseline gap-3">
        <p className="font-heading text-2xl font-bold">{FORMATO_FECHA.format(eta.fecha)}</p>
        <span className="text-[0.8125rem] text-muted">
          {eta.diasRestantes === 1 ? t("EtaPlatino.tomorrow") : t("EtaPlatino.inDays", { days: eta.diasRestantes.toLocaleString("es-ES") })}
        </span>
      </div>
      <p className="mt-3 text-[0.6875rem] leading-relaxed text-muted">
        {t("EtaPlatino.calculated", { pronoun, rate })}
      </p>
    </section>
  );
}
