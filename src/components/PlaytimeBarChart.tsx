import Link from "next/link";

const TOP_MOSTRADO = 8;

/**
 * "Horas por juego" — enseña el top 8 y un enlace real a la Biblioteca
 * entera ordenada por horas (`?orden=horas`, ver biblioteca/page.tsx),
 * no un "ver más" que solo desplegaba la misma listita de barras plana.
 *
 * Pedido explícito del usuario (10 sept 2026): la primera versión de
 * este componente expandía la lista IN SITU con un botón "Ver más" — la
 * queja fue que un botón que se limita a alargar el mismo gráfico no es
 * "ver todo de una manera más organizada". La Biblioteca ya tiene
 * búsqueda, filtros y carátulas — es la vista organizada de verdad, no
 * hacía falta construir una nueva.
 *
 * Vuelve a ser Server Component (sin "use client") — la versión con
 * expandir en cliente ya no hace falta mantener ese estado aquí.
 */
export function PlaytimeBarChart({
  juegos,
  handle,
}: {
  juegos: { gameId: string; titulo: string; iconUrl: string | null; horas: number }[];
  handle: string;
}) {
  if (juegos.length === 0) {
    return (
      <div className="rounded-2xl p-5 text-sm text-muted" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
        Ninguna plataforma vinculada ha reportado horas jugadas todavía.
      </div>
    );
  }

  const visibles = juegos.slice(0, TOP_MOSTRADO);
  const maximo = Math.max(...visibles.map((j) => j.horas), 1);

  return (
    <div className="rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <h3 className="mb-4 font-heading text-sm font-bold uppercase tracking-wide">Horas por juego</h3>
      <div className="space-y-3">
        {visibles.map((j) => (
          <div key={j.gameId} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-xs font-semibold sm:w-36">{j.titulo}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full" style={{ width: `${(j.horas / maximo) * 100}%`, background: "var(--accent-grad)" }} />
            </div>
            <span className="w-12 shrink-0 text-right text-xs font-bold text-muted">{j.horas} h</span>
          </div>
        ))}
      </div>
      {/* Siempre visible, no solo cuando hay más de TOP_MOSTRADO: la
          consulta de arriba ya viene limitada a 8 (ver
          EstadisticasCompletas.tsx), así que `juegos.length` nunca lo
          superaría — comprobarlo aquí escondería el enlace siempre. */}
      <Link
        href={`/u/${handle}/biblioteca?orden=horas`}
        className="mt-4 inline-block text-xs font-bold uppercase tracking-wide text-accent transition-colors hover:text-accent-text"
      >
        Ver todas las horas en la Biblioteca →
      </Link>
    </div>
  );
}
