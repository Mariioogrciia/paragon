"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";

export interface OpcionSelector {
  value: string;
  label: string;
  /** Se enseña entre paréntesis detrás (p. ej. cuántos juegos hay en ese filtro). */
  count?: number;
  /** Delante de la etiqueta: emoji, icono... */
  icono?: ReactNode;
  /** Texto pequeño a la derecha (consola, %...). */
  detalle?: string;
  disabled?: boolean;
  /** Las opciones seguidas con el mismo grupo salen bajo un mismo encabezado. */
  grupo?: string | null;
}

interface SelectorProps {
  value: string;
  onChange: (valor: string) => void;
  options: OpcionSelector[];
  placeholder?: string;
  /** Para formularios con `<form action>`: manda el valor en un input oculto. */
  name?: string;
  ariaLabel?: string;
  disabled?: boolean;
  /** Caja de búsqueda arriba. Por defecto, solo con listas largas. */
  buscable?: boolean;
  className?: string;
}

/** A partir de cuántas opciones sale la búsqueda sin pedirla. */
const UMBRAL_BUSQUEDA = 12;
/** Alto máximo del panel; si no cabe debajo, se abre hacia arriba. */
const ALTO_PANEL = 320;

/**
 * EL selector de Paragon (5 oct 2026): antes convivían `Dropdown`,
 * `CustomSelect` (casi iguales, cada uno con su radio y sus colores) y siete
 * `<select>` nativos que cada sistema pintaba a su manera. Ahora todos los
 * desplegables de la web son este, con el aspecto de DESIGN.md: el botón como
 * un campo (fondo `background`, borde de 1px, 8px de radio) y el panel como
 * los menús de la cabecera (`surface`, 12px).
 *
 * Teclado como un `<select>`: flechas, Inicio/Fin, Intro y Esc; con la lista
 * abierta, escribir filtra (o salta a la primera que empiece así).
 */
export function Selector({ value, onChange, options, placeholder, name, ariaLabel, disabled = false, buscable, className = "" }: SelectorProps) {
  const t = useTranslations("Shell.Selector");
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const [haciaArriba, setHaciaArriba] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [activo, setActivo] = useState(-1);
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const cajaBusqueda = useRef<HTMLInputElement>(null);

  const conBusqueda = buscable ?? options.length > UMBRAL_BUSQUEDA;
  const elegida = options.find((o) => o.value === value);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return options;
    return options.filter((o) => normalizar(`${o.label} ${o.detalle ?? ""} ${o.grupo ?? ""}`).includes(q));
  }, [options, busqueda]);

  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent) {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  // La opción activa siempre a la vista al moverse con el teclado.
  useEffect(() => {
    if (!abierto || activo < 0) return;
    lista.current?.querySelector<HTMLElement>(`[data-indice="${activo}"]`)?.scrollIntoView({ block: "nearest" });
  }, [abierto, activo]);

  function abrir() {
    if (disabled) return;
    const caja = boton.current?.getBoundingClientRect();
    setHaciaArriba(!!caja && window.innerHeight - caja.bottom < ALTO_PANEL && caja.top > window.innerHeight - caja.bottom);
    setBusqueda("");
    setActivo(Math.max(0, options.findIndex((o) => o.value === value)));
    setAbierto(true);
    if (conBusqueda) requestAnimationFrame(() => cajaBusqueda.current?.focus());
  }

  function cerrar() {
    setAbierto(false);
    boton.current?.focus();
  }

  function elegir(o: OpcionSelector) {
    if (o.disabled) return;
    onChange(o.value);
    cerrar();
  }

  function mover(desde: number, paso: number) {
    for (let i = desde + paso; i >= 0 && i < visibles.length; i += paso) {
      if (!visibles[i].disabled) return setActivo(i);
    }
  }

  function teclado(e: React.KeyboardEvent) {
    if (!abierto) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        mover(activo, 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        mover(activo, -1);
        break;
      case "Home":
        e.preventDefault();
        mover(-1, 1);
        break;
      case "End":
        e.preventDefault();
        mover(visibles.length, -1);
        break;
      case "Enter":
        e.preventDefault();
        if (visibles[activo]) elegir(visibles[activo]);
        break;
      case "Escape":
        e.preventDefault();
        cerrar();
        break;
      case "Tab":
        setAbierto(false);
        break;
      default:
        // Sin caja de búsqueda: saltar a la primera opción que empiece por esa letra.
        if (!conBusqueda && e.key.length === 1) {
          const letra = normalizar(e.key);
          const i = visibles.findIndex((o) => !o.disabled && normalizar(o.label).startsWith(letra));
          if (i >= 0) setActivo(i);
        }
    }
  }

  return (
    <div ref={contenedor} className={`relative ${className}`} onKeyDown={teclado}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={boton}
        type="button"
        disabled={disabled}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={`${id}-lista`}
        aria-label={ariaLabel}
        className="flex w-full min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-semibold text-foreground transition-colors hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: "var(--background)", borderColor: abierto ? "rgb(var(--accent-rgb) / 0.6)" : "var(--border)" }}
      >
        {elegida?.icono && <span className="shrink-0">{elegida.icono}</span>}
        <span className={`min-w-0 flex-1 truncate ${elegida ? "" : "font-medium text-muted"}`}>
          {elegida ? elegida.label : (placeholder ?? t("seleccionar"))}
          {elegida?.count !== undefined && <span className="ml-1 font-medium text-muted">({elegida.count})</span>}
        </span>
        {elegida?.detalle && <span className="shrink-0 text-xs font-medium text-muted">{elegida.detalle}</span>}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`shrink-0 text-muted transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: haciaArriba ? 6 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: haciaArriba ? 6 : -6 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            // Dentro de un <label> (casi siempre), un clic en una opción
            // "activaría" el label y este volvería a pulsar el botón: se
            // reabriría el panel nada más elegir. Cancelar el clic lo evita.
            onClick={(e) => e.preventDefault()}
            className={`absolute left-0 z-50 w-full min-w-[220px] overflow-hidden rounded-xl border border-border shadow-lg ${haciaArriba ? "bottom-full mb-1" : "top-full mt-1"}`}
            style={{ background: "var(--surface)" }}
          >
            {conBusqueda && (
              <div className="border-b border-border p-2">
                <input
                  ref={cajaBusqueda}
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setActivo(0);
                  }}
                  placeholder={t("buscar")}
                  aria-label={t("buscar")}
                  className="w-full rounded-lg border border-border px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
                  style={{ background: "var(--background)" }}
                />
              </div>
            )}
            <ul ref={lista} id={`${id}-lista`} role="listbox" aria-label={ariaLabel} className="overflow-y-auto py-1" style={{ maxHeight: conBusqueda ? ALTO_PANEL - 52 : ALTO_PANEL }}>
              {visibles.length === 0 && <li className="px-3 py-2 text-sm text-muted">{t("sinResultados")}</li>}
              {visibles.map((o, i) => {
                const seleccionada = o.value === value;
                const nuevoGrupo = !!o.grupo && o.grupo !== visibles[i - 1]?.grupo;
                return (
                  <Fragment key={o.value}>
                    {nuevoGrupo && (
                      <li role="presentation" className="px-3 pb-1 pt-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted">
                        {o.grupo}
                      </li>
                    )}
                    <li
                      role="option"
                      aria-selected={seleccionada}
                      aria-disabled={o.disabled}
                      data-indice={i}
                      onMouseEnter={() => !o.disabled && setActivo(i)}
                      onClick={() => elegir(o)}
                      className={`fila-lista mx-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${
                        o.disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                      } ${seleccionada ? "font-bold text-[var(--accent-text)]" : "font-medium text-foreground"}`}
                      style={i === activo && !o.disabled ? { background: "var(--surface-2)" } : undefined}
                    >
                      {o.icono && <span className="shrink-0">{o.icono}</span>}
                      <span className="min-w-0 flex-1 truncate">
                        {o.label}
                        {o.count !== undefined && <span className="ml-1 font-medium text-muted">({o.count})</span>}
                      </span>
                      {o.detalle && <span className="shrink-0 text-xs font-medium text-muted">{o.detalle}</span>}
                      <span className="w-3.5 shrink-0 text-center" aria-hidden>
                        {seleccionada ? "✓" : ""}
                      </span>
                    </li>
                  </Fragment>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
