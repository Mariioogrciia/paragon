"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setManualGameCompletedAction } from "@/app/actions";

/**
 * Juegos sin API: no hay lista de logros que enseñar, así que en vez de
 * "Todos los trofeos" hay un botón. Es la única acción que tiene sentido
 * aquí — el resto del progreso (rating, reseña, carpetas) ya es común a
 * todas las plataformas y vive en el resto de la página.
 */
export function ManualGameStatus({
  gameId,
  completed: initialCompleted,
}: {
  gameId: string;
  completed: boolean;
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [isPending, startTransition] = useTransition();

  function toggle(next: boolean) {
    setCompleted(next);
    startTransition(async () => {
      await setManualGameCompletedAction(gameId, next);
      router.refresh();
    });
  }

  return (
    <section
      className="rounded-[18px] p-5"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
        Progreso
      </h2>
      <p className="mb-4 text-[13px] text-muted">
        Este juego se añadió a mano: no hay logros que sincronizar, así que el
        progreso lo marcas tú.
      </p>
      <div className="flex gap-2 max-w-sm">
        <button
          onClick={() => toggle(false)}
          disabled={isPending}
          className="flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
          style={
            !completed
              ? { background: "rgb(var(--accent-rgb) / 0.14)", border: "1px solid rgb(var(--accent-rgb) / 0.35)", color: "var(--accent-text)" }
              : { background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }
          }
        >
          Sin empezar
        </button>
        <button
          onClick={() => toggle(true)}
          disabled={isPending}
          className="flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
          style={
            completed
              ? { background: "rgb(var(--accent-rgb) / 0.14)", border: "1px solid rgb(var(--accent-rgb) / 0.35)", color: "var(--accent-text)" }
              : { background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }
          }
        >
          Completado
        </button>
      </div>
    </section>
  );
}
