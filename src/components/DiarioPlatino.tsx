import { getTranslations } from "next-intl/server";
import type { DiarioPlatino as Diario } from "@/lib/diarioPlatino";

function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * "El Diario del Platino" — el resumen narrativo, ver `generarDiarioPlatino()`
 * en lib/diarioPlatino.ts para de dónde sale cada frase. Visible para
 * cualquiera que mire la ficha (no solo `esMio`): las fechas de cada trofeo
 * ya son públicas en la propia lista de abajo, esto solo las cuenta como
 * historia en vez de como filas sueltas.
 */
export async function DiarioPlatino({ diario, titulo }: { diario: Diario; titulo: string }) {
  const t = await getTranslations("Biblioteca.DiarioPlatino");
  const strong = (chunks: React.ReactNode) => <span className="font-semibold text-foreground">{chunks}</span>;
  const italic = (chunks: React.ReactNode) => <span className="italic">{chunks}</span>;

  return (
    <section
      className="mb-8 rounded-2xl p-5"
      style={{ border: "1px solid var(--border)", background: "linear-gradient(165deg, rgba(159, 212, 236, 0.08), var(--surface))" }}
    >
      <h2 className="mb-4 font-heading text-lg font-bold uppercase tracking-wide">{t("titulo")}</h2>
      <div className="space-y-3 text-sm leading-relaxed">
        <p>
          {t.rich("inicio", {
            b: (chunks) => <span className="font-bold">{chunks}</span>,
            strong,
            italic,
            titulo,
            fecha: fechaLarga(diario.primeraFecha),
            primerTrofeo: diario.primerTrofeo,
          })}
        </p>
        {diario.muroDias >= 3 && (
          <p>
            {t.rich("muro", {
              strong,
              italic,
              muroTrofeo: diario.muroTrofeo,
              dias: diario.muroDias,
            })}
          </p>
        )}
        {diario.masRaro && diario.masRaro.rarityPercent < 20 && (
          <p>
            {t.rich("hazana", {
              strong,
              italic,
              nombre: diario.masRaro.nombre,
              porcentaje: diario.masRaro.rarityPercent.toFixed(1),
            })}
          </p>
        )}
        <p>
          {t.rich("final", {
            strong,
            fecha: fechaLarga(diario.fechaPlatino),
            dias: diario.diasTotales,
          })}
        </p>
      </div>
    </section>
  );
}
