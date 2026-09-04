"use client";

import { useEffect } from "react";
import { BackButton } from "@/components/BackButton";

/**
 * Red de seguridad de toda la app: sin este archivo, cualquier fallo en
 * cualquier página (una API externa caída, un dato con forma inesperada,
 * un bug de verdad) tumbaba al visitante en la pantalla de error genérica
 * de Next — en inglés, sin "Volver", sin nada de la identidad de Paragon.
 * Esta sesión ya tocó ese caso una vez de verdad (un CSS mal codificado
 * rompiendo el build entero), y HANDOFF.md lleva varios bugs de fallo
 * silencioso documentados — no era una posibilidad remota.
 *
 * `error.tsx` cubre los fallos de renderizado dentro del layout normal
 * (esta página). El fallo del layout raíz en sí — sesión, auth, el propio
 * `<html>` — lo cubre `global-error.tsx`, que es quien de verdad sustituye
 * a la pantalla en blanco de Next si algo revienta ahí arriba.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error.tsx]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 rounded-full bg-accent/10 p-6">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
      </div>
      <h1 className="font-heading mb-2 text-3xl font-bold uppercase">Algo se ha roto</h1>
      <p className="max-w-md text-muted">
        No ha sido cosa tuya — un fallo real en esta página, ya registrado.
        Puedes intentarlo otra vez o volver a donde estabas.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-muted/60">
          Referencia: <span className="font-mono">{error.digest}</span>
        </p>
      )}
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg px-6 py-2.5 font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-lg"
          style={{ background: "var(--accent-grad)" }}
        >
          Reintentar
        </button>
        <BackButton fallbackHref="/" className="mb-0" />
      </div>
    </div>
  );
}
