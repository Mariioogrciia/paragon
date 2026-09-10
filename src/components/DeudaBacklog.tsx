import type { DeudaBacklog as DeudaBacklogData } from "@/lib/backlog";

/**
 * "Deuda de backlog" en horas reales, no en número de juegos — ver
 * `deudaBacklog()` en lib/backlog.ts para por qué no hay una fecha
 * estimada de "cuándo la liquidas": no hay dato real para eso, y una
 * fecha inventada sería peor que no ponerla.
 */
export function DeudaBacklog({ deuda }: { deuda: DeudaBacklogData }) {
  if (deuda.juegosContados === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
        <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-muted">Para ver los créditos</p>
        <p className="font-heading text-2xl font-bold">{deuda.horasHistoriaRestantes}h</p>
        <p className="mt-1 text-xs text-muted">de historia te faltan en lo que ya tienes empezado</p>
      </div>
      <div className="rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
        <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-muted">Para el 100%</p>
        <p className="font-heading text-2xl font-bold">{deuda.horasPlatinoRestantes}h</p>
        <p className="mt-1 text-xs text-muted">te faltan para platinar/completar lo empezado</p>
      </div>
      <p className="sm:col-span-2 text-xs text-muted">
        Con {deuda.juegosContados} {deuda.juegosContados === 1 ? "juego empezado con" : "juegos empezados con"} duración de HowLongToBeat guardada — lo empezado sin ese dato no suma aquí.
      </p>
    </div>
  );
}
