"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Las vistas de una lista de trofeos y su botonera, compartidas por la ficha
 * de un juego (TrophyList) y el desglose del mes por días (RitmoTrophyList):
 * antes cada una tenía la suya (4 vistas en una, 2 en la otra, con filas y
 * tarjetas distintas). La elegida se recuerda en este navegador y vale para
 * las dos: quien prefiere la cuadrícula la quiere en todas partes.
 */
export type VistaTrofeos = "lista" | "cuadricula" | "arbol" | "cronologia";

const VISTAS: VistaTrofeos[] = ["lista", "cuadricula", "arbol", "cronologia"];
const CLAVE = "paragon:vista-trofeos";

export function useVistaTrofeos(): [VistaTrofeos, (v: VistaTrofeos) => void] {
  const [vista, setVista] = useState<VistaTrofeos>("lista");
  useEffect(() => {
    try {
      const guardada = localStorage.getItem(CLAVE) as VistaTrofeos | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage solo existe en el cliente: leerlo al montar evita el desajuste de hidratación.
      if (guardada && VISTAS.includes(guardada)) setVista(guardada);
    } catch {
      // Sin storage: lista, como siempre.
    }
  }, []);
  function cambiar(v: VistaTrofeos) {
    setVista(v);
    try {
      localStorage.setItem(CLAVE, v);
    } catch {}
  }
  return [vista, cambiar];
}

const ICONOS: Record<VistaTrofeos, React.ReactNode> = {
  lista: (
    <>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </>
  ),
  cuadricula: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </>
  ),
  arbol: (
    <>
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <line x1="12" y1="7" x2="12" y2="12" />
      <line x1="12" y1="12" x2="5" y2="17" />
      <line x1="12" y1="12" x2="19" y2="17" />
    </>
  ),
  cronologia: (
    <>
      <line x1="12" y1="3" x2="12" y2="21" />
      <circle cx="12" cy="6" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="18" r="1.5" />
    </>
  ),
};

const ETIQUETA: Record<VistaTrofeos, string> = { lista: "list", cuadricula: "grid", arbol: "tree", cronologia: "timeline" };

export function SelectorVistaTrofeos({ vista, onChange, className = "" }: { vista: VistaTrofeos; onChange: (v: VistaTrofeos) => void; className?: string }) {
  const t = useTranslations("Biblioteca");
  return (
    <div
      role="group"
      className={`inline-flex gap-1 rounded-[10px] p-1 ${className}`}
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {VISTAS.map((v) => {
        const activa = v === vista;
        const etiqueta = t(`TrophyList.view.${ETIQUETA[v]}`);
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            title={etiqueta}
            aria-label={etiqueta}
            aria-pressed={activa}
            className="rounded-md p-1.5 transition-colors"
            style={activa ? { background: "rgb(var(--accent-rgb) / 0.16)", color: "var(--accent-text)" } : { background: "transparent", color: "var(--muted)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {ICONOS[v]}
            </svg>
          </button>
        );
      })}
    </div>
  );
}
