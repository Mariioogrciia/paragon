import Link from "next/link";
import type { CosteHora } from "@/lib/backlog";

function Fila({ g }: { g: CosteHora }) {
  return (
    <Link
      href={`/juego/${g.gameId}`}
      className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-2"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      {g.iconUrl && <img src={g.iconUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold" title={g.titulo}>{g.titulo}</p>
        <p className="text-xs text-muted">{g.precio.toFixed(2)}€ · {Math.round(g.horas)}h jugadas</p>
      </div>
      <p className="shrink-0 text-right font-heading text-base font-bold">{g.costeHora.toFixed(2)}€/h</p>
    </Link>
  );
}

/**
 * Coste por hora — solo tiene sentido con al menos un par de juegos con
 * precio y horas puestos a mano (ver `costePorHora()` en lib/backlog.ts).
 * Enseña los mejores y los peores, no la lista entera: es una curiosidad,
 * no una tabla que consultar a fondo.
 */
export function CostePorHora({ juegos }: { juegos: CosteHora[] }) {
  if (juegos.length === 0) return null;

  const mejores = juegos.slice(0, 3);
  const peores = juegos.length > 3 ? [...juegos].reverse().slice(0, 3) : [];

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Mejor amortizados</h3>
        <div className="flex flex-col gap-2">
          {mejores.map((g) => <Fila key={g.gameId} g={g} />)}
        </div>
      </div>
      {peores.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Más caros por hora</h3>
          <div className="flex flex-col gap-2">
            {peores.map((g) => <Fila key={g.gameId} g={g} />)}
          </div>
        </div>
      )}
    </div>
  );
}
