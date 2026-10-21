"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { WrapStories, type WrapStoriesData } from "@/components/WrapStories";

/** Botón que abre el Wrap en formato Stories (WrapStories.tsx). Envoltorio
 * fino de cliente porque `ParagonWrap` (quien lo usa) es un Server Component
 * y abrir/cerrar el overlay necesita estado. */
export function WrapStoriesButton({ data }: { data: WrapStoriesData }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("Perfil");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide text-[var(--background)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
        style={{ background: "rgb(var(--accent-rgb))" }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M1.5 0.8 9 5 1.5 9.2z" fill="currentColor" />
        </svg>
        {t("WrapStoriesButton.verWrapCompleto")}
      </button>
      {open && <WrapStories data={data} onClose={() => setOpen(false)} />}
    </>
  );
}
