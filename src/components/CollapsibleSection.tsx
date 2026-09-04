"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Colapsa contenido de baja prioridad en la portada (empieza cerrado) y
 * recuerda la preferencia de quien mira, para no volver a pagar el mismo
 * scroll cada visita si ya lo cerró una vez. No es el sistema de orden de
 * secciones del perfil (`lib/profileSections.ts`, con arrastrar y soltar):
 * esto es solo mostrar/ocultar, para secciones puntuales que no siempre
 * hace falta ver, no para reordenar la portada entera.
 */
export function CollapsibleSection({
  storageKey,
  defaultOpen = false,
  toggleLabel,
  children,
}: {
  /** Debe ser único en la página; se guarda como `platinos:seccion:<storageKey>`. */
  storageKey: string;
  defaultOpen?: boolean;
  toggleLabel: string;
  children: React.ReactNode;
}) {
  // Empieza tal cual `defaultOpen` (mismo resultado en servidor y cliente,
  // sin parpadeo) y solo se ABRE después, si el navegador recuerda que esta
  // persona ya lo había desplegado — un salto de cerrado a abierto se lee
  // como "esto sigue cargando", uno de abierto a cerrado se lee como un bug.
  const [open, setOpen] = useState(defaultOpen);
  const key = `platinos:seccion:${storageKey}`;

  useEffect(() => {
    try {
      if (localStorage.getItem(key) === "1") setOpen(true);
    } catch {
      // Privado/sin storage: se queda con defaultOpen, sin romper nada.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alternar = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(key, next ? "1" : "0");
    } catch {
      // Igual que arriba: si falla, solo se pierde el recordar la próxima vez.
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={alternar}
        aria-expanded={open}
        className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted transition-colors hover:text-foreground"
      >
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        {open ? `Ocultar ${toggleLabel}` : `Mostrar ${toggleLabel}`}
      </button>
      {open && children}
    </div>
  );
}
