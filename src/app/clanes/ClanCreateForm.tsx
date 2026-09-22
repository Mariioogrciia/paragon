"use client";

import { useState } from "react";
import { createClanAction } from "./actions";

export function ClanCreateForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function action(formData: FormData) {
    setError("");
    setLoading(true);
    try {
      await createClanAction(formData);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el clan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-[10px] bg-[var(--accent)] px-4 py-2 font-bold text-[var(--accent-text-contrast)]"
      >
        Crear Clan
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Fundar un Nuevo Clan</h2>
            <p className="text-sm text-muted mb-6">
              Recuerda: necesitas nivel 5 de Paragon.
            </p>
            
            <form action={action} className="space-y-4">
              <div>
                <label htmlFor="clan-name" className="text-sm font-semibold">Nombre del Clan</label>
                <input
                  id="clan-name"
                  name="name"
                  type="text"
                  required
                  placeholder="Ej: Cazadores de Sombras"
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2"
                />
              </div>

              <div>
                <label htmlFor="clan-tag" className="text-sm font-semibold">Etiqueta (Tag)</label>
                <input
                  id="clan-tag"
                  name="tag"
                  type="text"
                  required
                  maxLength={5}
                  placeholder="Ej: SHDW"
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2 uppercase"
                />
                <p className="text-xs text-muted mt-1">Máximo 5 caracteres.</p>
              </div>

              <div>
                <label htmlFor="clan-description" className="text-sm font-semibold">Descripción (Opcional)</label>
                <textarea
                  id="clan-description"
                  name="description"
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2"
                ></textarea>
              </div>

              {error && (
                <div className="rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-500">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-[10px] px-4 py-2 font-bold text-muted hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-[10px] bg-[var(--accent)] px-4 py-2 font-bold text-[var(--accent-text-contrast)] disabled:opacity-50"
                >
                  {loading ? "Creando..." : "Crear Clan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
