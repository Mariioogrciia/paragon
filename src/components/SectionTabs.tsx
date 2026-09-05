"use client";

import { useEffect, useState, type ReactNode } from "react";

export interface SectionTab {
  key: string;
  label: string;
  content: ReactNode;
  /** Contador opcional junto a la etiqueta (p. ej. nº de juegos). */
  badge?: string | number;
}

/**
 * Pestañas para trocear una página larga en bloques con sentido, sin volver
 * a pedir datos: todo el contenido de cada pestaña ya viene resuelto en
 * `content` (normalmente Server Components ya renderizados) y se queda
 * montado en el DOM con `hidden`, no se desmonta al cambiar — así no se
 * pierde scroll/estado de un carrusel ni hay que re-disparar sus consultas.
 *
 * Recuerda la última pestaña vista por `storageKey` (debe ser único por
 * página) para que volver a la portada no te devuelva siempre a la primera.
 */
export function SectionTabs({ storageKey, tabs }: { storageKey: string; tabs: SectionTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const lsKey = `platinos:tabs:${storageKey}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(lsKey);
      if (saved && tabs.some((t) => t.key === saved)) setActive(saved);
    } catch {
      // Privado/sin storage: se queda en la primera pestaña, sin romper nada.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(key: string) {
    setActive(key);
    try {
      localStorage.setItem(lsKey, key);
    } catch {
      // Igual que arriba: si falla, solo se pierde recordarlo la próxima vez.
    }
  }

  if (tabs.length <= 1) return <>{tabs[0]?.content}</>;

  return (
    <div>
      <div role="tablist" className="mb-7 flex flex-wrap gap-2 border-b border-border pb-4">
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => select(t.key)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-bold uppercase tracking-wide transition-all duration-200 hover:-translate-y-0.5"
              style={
                isActive
                  ? { background: "rgb(var(--accent-rgb) / 0.12)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent-text)" }
                  : { background: "none", border: "1px solid transparent", color: "var(--muted)" }
              }
            >
              {t.label}
              {t.badge != null && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ background: "var(--surface-2)", color: "var(--muted)" }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <div key={t.key} hidden={t.key !== active} className="space-y-9">
          {t.content}
        </div>
      ))}
    </div>
  );
}
