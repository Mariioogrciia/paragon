"use client";

import { useState, useTransition } from "react";
import { saveGameNotesAction } from "@/app/actions";

/**
 * Nota privada tuya sobre este juego — un recordatorio de progreso ("me
 * falta el coleccionable 14 del capítulo 3"), NUNCA pública. A diferencia
 * de `ReviewEditor` (que sí se enseña a quien visite tu perfil), este
 * componente solo se monta cuando `esMio` — ver la ficha del juego.
 */
export function GameNotes({ gameId, initialNotes }: { gameId: string; initialNotes: string | null }) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [isSaving, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      await saveGameNotesAction(gameId, notes);
      setIsEditing(false);
    });
  };

  if (!isEditing && !initialNotes) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="w-full rounded-xl border-2 border-dashed border-border py-3 text-sm font-semibold text-muted transition-colors hover:border-[rgb(var(--accent-rgb))] hover:text-[rgb(var(--accent-rgb))]"
      >
        + Añadir una nota privada
      </button>
    );
  }

  if (!isEditing && initialNotes) {
    return (
      <div className="group relative rounded-xl border border-border bg-surface p-4">
        <button
          onClick={() => setIsEditing(true)}
          className="absolute right-3 top-3 text-xs font-semibold text-muted opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
        >
          Editar
        </button>
        <p className="mb-2 flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Tu nota (solo la ves tú)
        </p>
        <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{initialNotes}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[rgb(var(--accent-rgb)/0.3)] bg-surface p-4 shadow-lg">
      <p className="mb-2 flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted">
        Nota privada — solo la ves tú
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={500}
        placeholder="Ej: me falta el coleccionable 14 del capítulo 3"
        autoFocus
        className="h-24 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm transition-all focus:border-[rgb(var(--accent-rgb))] focus:outline-none"
      />
      <div className="mb-3 mt-1 text-right text-xs text-muted">{notes.length}/500</div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            setNotes(initialNotes ?? "");
            setIsEditing(false);
          }}
          disabled={isSaving}
          className="px-4 py-2 text-sm font-semibold text-muted hover:text-white"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-[rgb(var(--accent-rgb))] px-4 py-2 text-sm font-bold text-black shadow-md transition-all hover:bg-[rgb(var(--accent-rgb)/0.8)] disabled:opacity-50"
        >
          {isSaving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
