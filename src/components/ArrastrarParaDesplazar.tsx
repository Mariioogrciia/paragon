"use client";

import { useEffect } from "react";

/** Píxeles que hay que mover el ratón antes de que cuente como arrastre y no como clic. */
const UMBRAL = 6;
/** Cuánto conserva la inercia en cada fotograma al soltar (más cerca de 1, más se desliza). */
const FRENO = 0.92;
/** Velocidad máxima de la inercia, en píxeles por milisegundo. */
const VELOCIDAD_MAX = 2.5;
/** Si el ratón se quedó quieto este tiempo antes de soltar, no hay inercia. */
const PAUSA_SIN_INERCIA = 80;

/** El contenedor con scroll horizontal más cercano, si de verdad tiene algo que desplazar. */
function contenedorHorizontal(desde: Element | null): HTMLElement | null {
  for (let el = desde; el && el !== document.body; el = el.parentElement) {
    if (!(el instanceof HTMLElement) || el.scrollWidth <= el.clientWidth + 1) continue;
    const { overflowX } = getComputedStyle(el);
    if (overflowX === "auto" || overflowX === "scroll") return el;
  }
  return null;
}

/**
 * Arrastrar con el ratón para desplazar las filas con scroll horizontal (22
 * oct 2026): carruseles de juegos, pestañas, chips… En el móvil ya se hacía
 * con el dedo; con ratón solo había la rueda con Mayús o la barra. Va por
 * delegación en todo el documento, así que vale para cualquier fila presente
 * o futura sin tocarla.
 *
 * - Solo ratón (el dedo y el lápiz ya desplazan solos) y botón principal.
 * - Hasta pasar el umbral es un clic normal; después, el clic al soltar se
 *   anula para no abrir la tarjeta sobre la que se empezó a arrastrar.
 * - El snap se apaga mientras se arrastra (si no, pelea con el ratón) y
 *   vuelve al terminar la inercia.
 * - Los campos de formulario y lo marcado con `data-sin-arrastre` no cuentan.
 */
export function ArrastrarParaDesplazar() {
  useEffect(() => {
    let fila: HTMLElement | null = null;
    let inicioX = 0;
    let inicioScroll = 0;
    let movido = false;
    let ultimoX = 0;
    let ultimoT = 0;
    let velocidad = 0;
    let inercia = 0;
    let filaInercia: HTMLElement | null = null;
    let snapGuardado = "";

    const restaurar = (el: HTMLElement) => {
      el.style.scrollSnapType = snapGuardado;
      el.style.scrollBehavior = "";
    };

    // Cortar la inercia (otro clic encima) también devuelve el snap: si no,
    // el siguiente arrastre guardaría "none" como si fuera el original.
    const pararInercia = () => {
      if (inercia) cancelAnimationFrame(inercia);
      inercia = 0;
      if (filaInercia) restaurar(filaInercia);
      filaInercia = null;
    };

    const alPulsar = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      const objetivo = e.target as Element | null;
      if (objetivo?.closest("input, textarea, select, [contenteditable], [data-sin-arrastre]")) return;
      const el = contenedorHorizontal(objetivo);
      if (!el) return;
      pararInercia();
      fila = el;
      inicioX = ultimoX = e.clientX;
      inicioScroll = el.scrollLeft;
      ultimoT = e.timeStamp;
      velocidad = 0;
      movido = false;
    };

    const alMover = (e: PointerEvent) => {
      if (!fila) return;
      const dx = e.clientX - inicioX;
      if (!movido) {
        if (Math.abs(dx) < UMBRAL) return;
        movido = true;
        snapGuardado = fila.style.scrollSnapType;
        fila.style.scrollSnapType = "none";
        fila.style.scrollBehavior = "auto";
        document.documentElement.classList.add("arrastrando-scroll");
        window.getSelection()?.removeAllRanges();
      }
      e.preventDefault();
      fila.scrollLeft = inicioScroll - dx;
      const dt = e.timeStamp - ultimoT;
      if (dt > 0) velocidad = (e.clientX - ultimoX) / dt;
      ultimoX = e.clientX;
      ultimoT = e.timeStamp;
    };

    const alSoltar = (e: PointerEvent) => {
      const el = fila;
      fila = null;
      if (!el || !movido) return;
      document.documentElement.classList.remove("arrastrando-scroll");

      // El clic que llega justo después de soltar no debe abrir nada.
      const anular = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      window.addEventListener("click", anular, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", anular, { capture: true }), 0);

      // Inercia: sigue un poco en la dirección del gesto y frena. Nada si
      // se paró antes de soltar; se corta al llegar a un extremo.
      const reciente = e.timeStamp - ultimoT < PAUSA_SIN_INERCIA;
      let v = reciente ? Math.max(-VELOCIDAD_MAX, Math.min(VELOCIDAD_MAX, velocidad)) * 16 : 0;
      filaInercia = el;
      const paso = () => {
        const antes = el.scrollLeft;
        if (Math.abs(v) >= 0.5) el.scrollLeft -= v;
        if (Math.abs(v) < 0.5 || el.scrollLeft === antes) {
          inercia = 0;
          filaInercia = null;
          restaurar(el);
          return;
        }
        v *= FRENO;
        inercia = requestAnimationFrame(paso);
      };
      inercia = requestAnimationFrame(paso);
    };

    // Sin esto, arrastrar desde una carátula o un enlace empieza el "arrastrar
    // y soltar" nativo del navegador y el scroll no se mueve.
    const alArrastrarNativo = (e: DragEvent) => {
      if (fila) e.preventDefault();
    };

    document.addEventListener("pointerdown", alPulsar);
    document.addEventListener("pointermove", alMover, { passive: false });
    document.addEventListener("pointerup", alSoltar);
    document.addEventListener("pointercancel", alSoltar);
    document.addEventListener("dragstart", alArrastrarNativo);
    return () => {
      pararInercia();
      document.removeEventListener("pointerdown", alPulsar);
      document.removeEventListener("pointermove", alMover);
      document.removeEventListener("pointerup", alSoltar);
      document.removeEventListener("pointercancel", alSoltar);
      document.removeEventListener("dragstart", alArrastrarNativo);
    };
  }, []);

  return null;
}
