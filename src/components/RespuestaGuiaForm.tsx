"use client";

import { useState, useTransition } from "react";
import { replyToGuideAction } from "@/app/actions";

export function RespuestaGuiaForm({ guideId, gameId }: { guideId: string; gameId: string }) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Responde con tu experiencia, una corrección, una duda…"
        className="h-24 w-full resize-none rounded-lg px-3.5 py-2.5 text-sm outline-none"
        style={{ border: "1px solid var(--border)", background: "var(--background)" }}
      />
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <div className="mt-2 flex justify-end">
        <button
          onClick={() => {
            startTransition(async () => {
              const result = await replyToGuideAction(guideId, gameId, texto);
              if (result.error) {
                setError(result.error);
                return;
              }
              setTexto("");
              setError(null);
            });
          }}
          disabled={pending || !texto.trim()}
          className="rounded-lg px-4 py-2 text-sm font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb) / 0.4)] disabled:pointer-events-none disabled:opacity-50"
          style={{ background: "var(--accent-grad)" }}
        >
          {pending ? "Enviando…" : "Responder"}
        </button>
      </div>
    </div>
  );
}
