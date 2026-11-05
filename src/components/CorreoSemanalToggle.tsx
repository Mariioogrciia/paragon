"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { cambiarCorreoSemanalAction } from "@/app/actions/correo";

/** Ajustes → Avisos → Resumen por correo (lib/correo.ts): alta expresa, nunca marcada por defecto. */
export function CorreoSemanalToggle({ suscrito, email, resultado }: { suscrito: boolean; email: string | null; resultado?: string }) {
  const t = useTranslations("Onboarding.correoSemanal");
  const [activo, setActivo] = useState(suscrito);
  const [pendiente, empezar] = useTransition();

  return (
    <section className="ajustes-grupo">
      <h2 className="mb-1 font-semibold">{t("titulo")}</h2>
      <p className="mb-4 text-sm text-muted">{t("descripcion")}</p>
      {resultado === "baja" && <p className="mb-3 text-sm font-semibold">{t("bajaOk")}</p>}
      {resultado === "enlace-roto" && <p className="mb-3 text-sm font-semibold text-danger">{t("enlaceRoto")}</p>}
      {email ? (
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={activo}
            disabled={pendiente}
            onChange={(e) => {
              const nuevo = e.target.checked;
              setActivo(nuevo);
              empezar(() => cambiarCorreoSemanalAction(nuevo));
            }}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          <span>{t("casilla", { email })}</span>
        </label>
      ) : (
        <p className="text-sm text-muted">{t("sinCorreo")}</p>
      )}
    </section>
  );
}
