"use client";

import { useTranslations } from "next-intl";
import type { PlataformaVinculable } from "@/lib/types";

/**
 * Pasos reales para poner el perfil en público, por plataforma — sin esto,
 * "tu perfil tiene que ser público" es una frase que no dice DÓNDE tocar, y
 * cada vez que la app escale un poco más esto va a pasar muchísimo (ver el
 * caso real de Israel/Fendetesta11, cuya primera sincronización falló en
 * silencio). `<details>` en vez de un componente cliente: no hace falta
 * JavaScript para un desplegable, pero al usar next-intl con `useTranslations`
 * (necesario porque este componente lo importa Forms.tsx, que es "use client")
 * pasa a formar parte del árbol de cliente igualmente.
 */
export function PrivacyGuide({ platform }: { platform: PlataformaVinculable }) {
  const t = useTranslations("Onboarding");
  const steps = t.raw(`privacyGuide.steps.${platform}`) as string[];

  return (
    <details className="mt-2 rounded-xl px-4 py-3 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
      <summary className="cursor-pointer select-none font-semibold text-accent">{t(`privacyGuide.title.${platform}`)}</summary>
      <ol className="mt-3 space-y-2 pl-4 text-muted marker:text-accent" style={{ listStyleType: "decimal" }}>
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </details>
  );
}
