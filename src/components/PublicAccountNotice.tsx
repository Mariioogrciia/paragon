"use client";

import { useTranslations } from "next-intl";
import type { PlataformaVinculable } from "@/lib/types";

/**
 * Aviso visible ANTES de vincular — a diferencia de `PrivacyGuide`
 * (`<details>`, colapsado, con los pasos exactos), esto va siempre a la
 * vista, encima del campo. El caso real que lo motivó (ver también el
 * comentario de PrivacyGuide): un usuario nuevo vinculó su cuenta de Steam
 * privada, no leyó ni el texto de ayuda ni abrió el desplegable, y se
 * encontró la biblioteca vacía sin saber por qué. Un aviso colapsado o en
 * gris pequeño bajo el campo ya demostró no ser suficiente.
 */
export function PublicAccountNotice({ platform }: { platform: PlataformaVinculable }) {
  const t = useTranslations("Onboarding");

  return (
    <div
      className="mb-2.5 flex gap-2.5 rounded-xl p-3 text-[0.8125rem] leading-relaxed"
      style={{ background: "rgba(226, 181, 62, 0.08)", border: "1px solid rgba(226, 181, 62, 0.22)", color: "#d8c48a" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e2b53e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8h.01M11 12h1v4h1" />
      </svg>
      <p>{t(`avisoPublico.${platform}`)}</p>
    </div>
  );
}
