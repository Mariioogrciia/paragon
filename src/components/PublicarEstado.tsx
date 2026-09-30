"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { publicarEstadoAction, type ActionState } from "@/app/actions";

const MAXIMO = 280;

/** Caja de "¿Qué estás cazando?" arriba del feed de Comunidad. */
export function PublicarEstado() {
  const t = useTranslations("Analitica.activityFeed");
  const [estado, publicar, enviando] = useActionState<ActionState, FormData>(publicarEstadoAction, {});
  const [texto, setTexto] = useState("");
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- vaciar la caja solo tras publicar con éxito.
    if (estado.success) setTexto("");
  }, [estado]);

  return (
    <form ref={form} action={publicar} className="mb-5 rounded-xl border border-border bg-surface p-3 sm:p-4">
      <textarea
        name="texto"
        value={texto}
        onChange={(e) => setTexto(e.target.value.slice(0, MAXIMO))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && texto.trim()) form.current?.requestSubmit();
        }}
        rows={2}
        placeholder={t("estadoPlaceholder")}
        className="w-full resize-none bg-transparent text-sm placeholder:text-muted focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className={`text-xs ${estado.error ? "font-semibold text-red-400" : "text-muted"}`}>
          {estado.error ?? `${texto.length}/${MAXIMO}`}
        </span>
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-[var(--background)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "var(--accent-grad)" }}
        >
          {enviando ? t("publicando") : t("publicar")}
        </button>
      </div>
    </form>
  );
}
