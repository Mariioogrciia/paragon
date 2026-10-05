"use client";

import { useState } from "react";

/**
 * Noticias de tus equipos / todas: el servidor pinta las dos listas (las
 * tarjetas son componentes de servidor) y aquí solo se elige cuál se ve.
 */
export function PestanasNoticias({
  etiquetas,
  deEquipos,
  todas,
}: {
  etiquetas: { equipos: string; todas: string };
  deEquipos: React.ReactNode;
  todas: React.ReactNode;
}) {
  const [pestana, setPestana] = useState<"equipos" | "todas">("equipos");
  return (
    <div>
      <div role="tablist" className="mb-6 inline-flex rounded-full border border-border bg-surface p-1">
        {(["equipos", "todas"] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            id={`noticias-tab-${p}`}
            aria-selected={pestana === p}
            aria-controls={`noticias-panel-${p}`}
            onClick={() => setPestana(p)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
              pestana === p ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2/60 hover:text-foreground"
            }`}
          >
            {etiquetas[p]}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="noticias-panel-equipos" aria-labelledby="noticias-tab-equipos" hidden={pestana !== "equipos"}>
        {deEquipos}
      </div>
      <div role="tabpanel" id="noticias-panel-todas" aria-labelledby="noticias-tab-todas" hidden={pestana !== "todas"}>
        {todas}
      </div>
    </div>
  );
}
