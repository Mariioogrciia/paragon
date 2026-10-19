"use client";

import { useTranslations } from "next-intl";
import { anunciosActivos } from "@/lib/publicidad";

declare global {
  interface Window {
    googlefc?: { callbackQueue: unknown[]; showRevocationMessage: () => void };
  }
}

/**
 * "Gestionar cookies" (19 oct 2026): vuelve a abrir el mensaje de
 * consentimiento de Google para cambiar o retirar el permiso, que el RGPD
 * exige que sea tan fácil como darlo. Solo con anuncios activos.
 */
export function GestionarConsentimiento({ className }: { className?: string }) {
  const t = useTranslations("Shell.Footer");
  if (!anunciosActivos()) return null;
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.googlefc = window.googlefc || ({ callbackQueue: [] } as unknown as NonNullable<Window["googlefc"]>);
        window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
        window.googlefc.callbackQueue.push(() => window.googlefc?.showRevocationMessage());
      }}
    >
      {t("gestionarCookies")}
    </button>
  );
}
