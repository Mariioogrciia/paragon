"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { apuntarseSesionAction, cancelarSesionAction } from "@/app/actions";

/** Apuntarse / salirse / cancelar de una sesión — ver lib/sesiones.ts. */
export function AccionesSesion({
  sessionId,
  soyAnfitrion,
  estoyApuntado,
  llena,
}: {
  sessionId: string;
  soyAnfitrion: boolean;
  estoyApuntado: boolean;
  llena: boolean;
}) {
  const t = useTranslations("Shell.Sesiones");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function ejecutar(accion: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await accion();
      if (r.error) setError(r.error);
    });
  }

  const secundario =
    "rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-danger/50 hover:text-danger disabled:opacity-50";

  return (
    <div className="flex flex-col items-end gap-1">
      {soyAnfitrion ? (
        <button type="button" disabled={pendiente} onClick={() => ejecutar(() => cancelarSesionAction(sessionId))} className={secundario}>
          {t("cancelar")}
        </button>
      ) : estoyApuntado ? (
        <button type="button" disabled={pendiente} onClick={() => ejecutar(() => apuntarseSesionAction(sessionId, false))} className={secundario}>
          {t("salirme")}
        </button>
      ) : (
        <button
          type="button"
          disabled={pendiente || llena}
          onClick={() => ejecutar(() => apuntarseSesionAction(sessionId, true))}
          className="rounded-lg px-4 py-1.5 text-xs font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb)/0.4)] disabled:opacity-40"
          style={{ background: "var(--accent-grad)" }}
        >
          {t("apuntarme")}
        </button>
      )}
      {error && <p className="max-w-[220px] text-right text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}
