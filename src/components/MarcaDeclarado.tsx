"use client";

import { ShieldQuestion } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Marca del progreso declarado (Epic, ver lib/declarado.ts): un icono
 * pequeño con tooltip, junto al nombre de la plataforma, que explica por
 * qué ese progreso no suma puntos. `title` para el ratón y `aria-label` /
 * texto oculto para lectores de pantalla (un tooltip solo no es accesible).
 */
export function MarcaDeclarado({ className = "" }: { className?: string }) {
  const t = useTranslations("Shell.Declarado");
  return (
    <span className={`marca-declarado ${className}`} title={t("explicacion")}>
      <ShieldQuestion size={13} aria-hidden="true" />
      <span className="sr-only">{t("etiqueta")}. {t("explicacion")}</span>
    </span>
  );
}
