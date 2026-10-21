"use client";

import { useState, type ReactNode } from "react";

/**
 * "+N" de la cabecera del perfil (21 oct 2026): pliega el resto del
 * palmarés y las medallas de temporadas pasadas. Va dentro de una fila
 * flex-wrap; al abrirse, lo plegado ocupa la línea siguiente entera.
 */
export function MasHonores({ n, etiquetaAbrir, etiquetaCerrar, children }: { n: number; etiquetaAbrir: string; etiquetaCerrar: string; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-label={abierto ? etiquetaCerrar : etiquetaAbrir}
        className="inline-flex h-7 items-center rounded-full border border-[var(--border)] px-2.5 text-xs font-bold text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        {abierto ? "−" : `+${n}`}
      </button>
      {abierto && <div className="flex basis-full flex-wrap items-center gap-2">{children}</div>}
    </>
  );
}
