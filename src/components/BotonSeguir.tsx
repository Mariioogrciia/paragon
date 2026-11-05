"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { cambiarSeguirAction } from "@/app/actions/seguir";

/**
 * Seguir a alguien desde su perfil (lib/seguir.ts): sin pedir amistad, sus
 * trofeos salen en tu Comunidad. El contador de seguidores se actualiza al
 * momento y vuelve atrás si el servidor dice que no.
 */
export function BotonSeguir({ userId, inicial, seguidores, ruta }: { userId: string; inicial: boolean; seguidores: number; ruta: string }) {
  const t = useTranslations("Perfil.PerfilPage.seguir");
  const [sigo, setSigo] = useState(inicial);
  const [cuenta, setCuenta] = useState(seguidores);
  const [error, setError] = useState("");
  const [pendiente, empezar] = useTransition();

  function cambiar() {
    const nuevo = !sigo;
    setSigo(nuevo);
    setCuenta((n) => n + (nuevo ? 1 : -1));
    setError("");
    empezar(async () => {
      const res = await cambiarSeguirAction(userId, nuevo, ruta);
      if (!res.ok) {
        setSigo(!nuevo);
        setCuenta((n) => n + (nuevo ? -1 : 1));
        setError(res.error ?? t("error"));
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={cambiar}
        disabled={pendiente}
        aria-pressed={sigo}
        className="rounded-[10px] px-4 py-2.5 text-[0.8125rem] font-bold transition-all hover:-translate-y-0.5 disabled:opacity-60"
        style={sigo ? { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" } : { background: "var(--surface)", border: "1px solid var(--accent-line)", color: "var(--accent-text)" }}
      >
        {sigo ? t("siguiendo") : t("seguir")} · {t("seguidores", { count: cuenta })}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
