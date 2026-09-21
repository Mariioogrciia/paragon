import { useTranslations } from "next-intl";
import type { DietaGamer as Dieta } from "@/lib/dietaGamer";

/**
 * "Dieta Gamer" — ver `dietaGamer()` en lib/dietaGamer.ts para los umbrales.
 * Aviso amistoso, no un bloqueo: solo dice que quizás toca variar antes del
 * siguiente juegazo largo del mismo tipo.
 */
export function DietaGamer({ dieta }: { dieta: Dieta }) {
  const t = useTranslations("Analitica.dietaGamer");

  return (
    <section
      className="mb-10 rounded-2xl p-5"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <h2 className="mb-2 flex items-center gap-2 font-heading text-lg font-bold uppercase tracking-wide">
        {t("titulo")}
      </h2>
      <p className="text-sm leading-relaxed text-muted">
        {t("textoPrefix")}{" "}
        {dieta.juegos.map((j, i) => (
          <span key={j.gameId}>
            <span className="font-semibold text-foreground">{j.titulo}</span>
            {i < dieta.juegos.length - 1 ? ", " : ""}
          </span>
        ))}{" "}
        {t.rich("textoSuffix", {
          genero: dieta.genero,
          horas: dieta.horasTotales,
          strong: (chunks) => <span className="font-semibold text-foreground">{chunks}</span>,
        })}
      </p>
    </section>
  );
}
