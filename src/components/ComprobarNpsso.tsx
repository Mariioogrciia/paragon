"use client";

import { useState, useTransition } from "react";
import { comprobarNpssoAction } from "@/app/actions";

type Resultado = Awaited<ReturnType<typeof comprobarNpssoAction>>;
type Clave = NonNullable<Resultado>["resultado"];

/**
 * "Comprobar ahora" del NPSSO en Admin → Sistema (21 oct 2026): tras
 * cambiarlo en Vercel y redesplegar, dice al momento si Sony lo acepta, en
 * vez de esperar a la siguiente pasada del cron. Los textos llegan del
 * servidor (namespace Admin).
 */
export function ComprobarNpsso({ textos }: { textos: { boton: string; comprobando: string } & Record<Clave, string> }) {
  const [resultado, setResultado] = useState<Resultado>(null);
  const [pendiente, empezar] = useTransition();
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => empezar(async () => setResultado(await comprobarNpssoAction()))}
        className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-semibold transition-colors hover:border-accent disabled:opacity-50"
      >
        {pendiente ? textos.comprobando : textos.boton}
      </button>
      {resultado && !pendiente && (
        <span className={`text-xs ${resultado.resultado === "ok" ? "text-green-400" : "text-red-400"}`}>{textos[resultado.resultado]}</span>
      )}
      {/* Lo que dijo Sony y la forma del NPSSO puesto (22 oct 2026): para saber si
          es la sesión, un pegado raro o un bloqueo, sin adivinar. */}
      {resultado?.detalle && !pendiente && (
        <p className="w-full font-mono text-[0.6875rem] text-muted [overflow-wrap:anywhere]">{resultado.detalle}</p>
      )}
    </div>
  );
}
