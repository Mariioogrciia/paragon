"use client";

import { useState } from "react";

const TOP_INICIAL = 8;

/**
 * "Horas por juego" — antes solo enseñaba el top 8 sin más (el límite
 * venía puesto en la propia consulta, `horasPorJuego(userId, 8)`). Ahora
 * recibe la lista COMPLETA ya calculada en el servidor (sin límite) y
 * corta a `TOP_INICIAL` aquí, en el cliente — un botón "Ver más" enseña
 * el resto sin volver a pedir nada al servidor, es la misma lista ya
 * cargada, solo que un simple recorte que cambia con el estado.
 */
export function PlaytimeBarChart({ juegos }: { juegos: { gameId: string; titulo: string; iconUrl: string | null; horas: number }[] }) {
  const [expandido, setExpandido] = useState(false);

  if (juegos.length === 0) {
    return (
      <div className="rounded-2xl p-5 text-sm text-muted" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
        Ninguna plataforma vinculada ha reportado horas jugadas todavía.
      </div>
    );
  }

  const visibles = expandido ? juegos : juegos.slice(0, TOP_INICIAL);
  // El máximo SIEMPRE es el de la lista completa, no el de lo visible — si
  // no, al contraer de vuelta a 8 las barras cambiarían de escala y las
  // proporciones dejarían de significar lo mismo que un segundo antes.
  const maximo = Math.max(...juegos.map((j) => j.horas), 1);

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
      {juegos.length > TOP_INICIAL && (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="mt-4 text-xs font-bold uppercase tracking-wide text-accent transition-colors hover:text-accent-text"
        >
          {expandido ? "Ver menos" : `Ver más (${juegos.length - TOP_INICIAL} juegos más)`}
        </button>
      )}
    </div>
  );
}
