"use client";

import { useState } from "react";
import { WrapStories, type WrapStoriesData } from "@/components/WrapStories";

/** Botón que abre el Wrap en formato Stories (WrapStories.tsx). Envoltorio
 * fino de cliente porque `ParagonWrap` (quien lo usa) es un Server Component
 * y abrir/cerrar el overlay necesita estado. */
export function WrapStoriesButton({ data }: { data: WrapStoriesData }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent hover:underline"
      >
        ▶ Ver Wrap completo
      </button>
      {open && <WrapStories data={data} onClose={() => setOpen(false)} />}
    </>
  );
}
