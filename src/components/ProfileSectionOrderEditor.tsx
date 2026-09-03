"use client";

import { useState } from "react";
import { Reorder } from "framer-motion";
import { SECTION_LABELS, normalizeSectionOrder, type ProfileSectionKey } from "@/lib/profileSections";

/**
 * Editor de orden de secciones del perfil público, arrastrable. Vuelca el
 * resultado a un input oculto (`profileSectionOrder`, JSON) para que viaje
 * con el resto del formulario de /ajustes — mismo patrón que ya usa el
 * banner con su propio hidden input.
 */
export function ProfileSectionOrderEditor({ initialOrder }: { initialOrder?: string[] | null }) {
  const [orden, setOrden] = useState<ProfileSectionKey[]>(() => normalizeSectionOrder(initialOrder));

  return (
    <div>
      <input type="hidden" name="profileSectionOrder" value={JSON.stringify(orden)} />
      <Reorder.Group axis="y" values={orden} onReorder={setOrden} className="flex flex-col gap-1.5">
        {orden.map((key) => (
          <Reorder.Item
            key={key}
            value={key}
            className="flex cursor-grab items-center gap-3 rounded-lg border border-white/10 bg-[var(--surface)] px-3 py-2.5 text-sm active:cursor-grabbing"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted">
              <circle cx="9" cy="6" r="1.2" fill="currentColor" />
              <circle cx="9" cy="12" r="1.2" fill="currentColor" />
              <circle cx="9" cy="18" r="1.2" fill="currentColor" />
              <circle cx="15" cy="6" r="1.2" fill="currentColor" />
              <circle cx="15" cy="12" r="1.2" fill="currentColor" />
              <circle cx="15" cy="18" r="1.2" fill="currentColor" />
            </svg>
            {SECTION_LABELS[key]}
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <p className="mt-2 text-xs text-muted">Arrastra para cambiar el orden en que se ven en tu perfil público.</p>
    </div>
  );
}
