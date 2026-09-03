import type { EtaPlatino } from "@/lib/eta";

const FORMATO_FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" });

/** Cuándo, a tu ritmo de los últimos 30 días, tocarías el platino/100%. */
export function EtaPlatinoCard({ eta, esMio }: { eta: EtaPlatino; esMio: boolean }) {
  return (
    <section
      className="rounded-[18px] p-5"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
        A tu ritmo, terminas
      </h2>
      <div className="flex flex-wrap items-baseline gap-3">
        <p className="font-heading text-2xl font-bold">{FORMATO_FECHA.format(eta.fecha)}</p>
        <span className="text-[13px] text-muted">
          {eta.diasRestantes === 1 ? "mañana" : `en ${eta.diasRestantes.toLocaleString("es-ES")} días`}
        </span>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Calculado con {esMio ? "tu" : "su"} ritmo de los últimos 30 días (
        {eta.ritmoDiario >= 1
          ? `${eta.ritmoDiario.toFixed(1)} trofeos/día`
          : `1 trofeo cada ${Math.round(1 / eta.ritmoDiario)} días`}
        ). Si {esMio ? "aflojas o le metes caña" : "afloja o le mete caña"}, la fecha se mueve sola en la próxima sincronización.
      </p>
    </section>
  );
}
