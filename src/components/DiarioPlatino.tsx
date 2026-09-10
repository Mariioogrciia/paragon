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
export function DiarioPlatino({ diario, titulo }: { diario: Diario; titulo: string }) {
  return (
    <section
      className="mb-8 rounded-2xl p-5"
      style={{ border: "1px solid var(--border)", background: "linear-gradient(165deg, rgba(159, 212, 236, 0.08), var(--surface))" }}
    >
      <h2 className="mb-4 font-heading text-lg font-bold uppercase tracking-wide">📖 El diario del platino</h2>
      <div className="space-y-3 text-sm leading-relaxed">
        <p>
          Tu aventura en <span className="font-bold">{titulo}</span> empezó el{" "}
          <span className="font-semibold text-foreground">{fechaLarga(diario.primeraFecha)}</span>, con{" "}
          <span className="italic">&ldquo;{diario.primerTrofeo}&rdquo;</span>.
        </p>
        {diario.muroDias >= 3 && (
          <p>
            Tu mayor muro fue superar <span className="italic">&ldquo;{diario.muroTrofeo}&rdquo;</span> — estuviste{" "}
            <span className="font-semibold text-foreground">{diario.muroDias} {diario.muroDias === 1 ? "día" : "días"}</span> sin desbloquear nada antes de conseguirlo.
          </p>
        )}
        {diario.masRaro && diario.masRaro.rarityPercent < 20 && (
          <p>
            Tu mayor hazaña fue <span className="italic">&ldquo;{diario.masRaro.nombre}&rdquo;</span>, conseguido solo por el{" "}
            <span className="font-semibold text-foreground">{diario.masRaro.rarityPercent.toFixed(1)}%</span> de quienes juegan esto.
          </p>
        )}
        <p>
          Finalmente, te coronaste el{" "}
          <span className="font-semibold text-foreground">{fechaLarga(diario.fechaPlatino)}</span>, tras{" "}
          <span className="font-semibold text-foreground">{diario.diasTotales} {diario.diasTotales === 1 ? "día" : "días"}</span> de caza.
        </p>
      </div>
    </section>
  );
}
