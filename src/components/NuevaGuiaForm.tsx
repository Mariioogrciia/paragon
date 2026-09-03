"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGuideAction } from "@/app/actions";

export function NuevaGuiaForm({ gameId }: { gameId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="w-full rounded-xl border-2 border-dashed py-4 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
        style={{ borderColor: "var(--border)", color: "var(--muted)" }}
      >
        + Escribir una guía
      </button>
    );
  }

  return (
    <div className="rounded-xl p-5 shadow-lg" style={{ border: "1px solid rgb(var(--accent-rgb) / 0.3)", background: "var(--surface)" }}>
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        maxLength={120}
        placeholder="Título — p. ej. «Ruta óptima sin perderse ningún coleccionable»"
        className="mb-3 w-full rounded-lg px-3.5 py-2.5 text-sm font-semibold outline-none"
        style={{ border: "1px solid var(--border)", background: "var(--background)" }}
      />
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Explícalo con calma: orden recomendado, qué te dejaría para el final, trampas típicas…"
        className="h-40 w-full resize-none rounded-lg px-3.5 py-2.5 text-sm outline-none"
        style={{ border: "1px solid var(--border)", background: "var(--background)" }}
      />
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={() => { setAbierto(false); setError(null); }}
          disabled={pending}
          className="px-4 py-2 text-sm font-semibold text-muted hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          onClick={() => {
            startTransition(async () => {
              const result = await createGuideAction(gameId, titulo, texto);
              if (result.error) {
                setError(result.error);
                return;
              }
              router.push(`/juego/${encodeURIComponent(gameId)}/guias/${result.id}`);
            });
          }}
          disabled={pending}
          className="rounded-lg px-4 py-2 text-sm font-bold text-background disabled:opacity-50"
          style={{ background: "var(--accent-grad)" }}
        >
          {pending ? "Publicando…" : "Publicar guía"}
        </button>
      </div>
    </div>
  );
}
