"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Estado y lógica de personalización (modo, acento, estilo), compartidos
 * entre el icono de la navbar (ThemeCustomizer.tsx, ahora solo un enlace) y
 * la página de ajustes (AppearanceSettings.tsx, el panel de verdad). Antes
 * todo esto vivía metido en el propio desplegable de la navbar; ahora ese
 * hueco era demasiado pequeño para 8 estilos + temas + acento libre, así
 * que el control se trasladó a /ajustes/apariencia y el icono de arriba solo
 * enlaza ahí.
 *
 * El modo lo lleva next-themes (clase en <html>). El acento y el estilo los
 * llevamos nosotros, porque next-themes solo gestiona un eje y aquí hay tres,
 * independientes entre sí.
 */

export const MODOS = [
  { value: "dark", label: "Oscuro" },
  { value: "light", label: "Claro" },
  { value: "oled", label: "OLED" },
  { value: "high-contrast", label: "Contraste" },
] as const;

export const ACENTOS = [
  { value: "", label: "Azul", color: "var(--accent)" },
  { value: "accent-violet", label: "Morado", color: "#8b5cf6" },
  { value: "accent-red", label: "Rojo", color: "#ef4444" },
  { value: "accent-green", label: "Verde", color: "#10b981" },
  { value: "accent-orange", label: "Naranja", color: "#f59e0b" },
] as const;

export const ESTILOS = [
  { value: "", label: "Clásico", desc: "El de siempre" },
  { value: "estilo-terminal", label: "Terminal", desc: "Monoespaciada, esquinas rectas, líneas CRT" },
  { value: "estilo-vidrio", label: "Vidrio", desc: "Cristal esmerilado, muy redondeado" },
  { value: "estilo-brutalista", label: "Brutalista", desc: "Sin esquinas, sombra dura, plano" },
  { value: "estilo-ps5", label: "PS5", desc: "Curvas azules sobre negro, fondo incluido" },
  { value: "estilo-xbox", label: "Xbox", desc: "Facetas verdes sobre negro, fondo incluido" },
  { value: "estilo-steam", label: "Steam", desc: "Retícula azulada, fondo incluido" },
  { value: "estilo-switch", label: "Switch", desc: "Manchas rojo/azul, fondo incluido" },
] as const;

// Los 4 "Temas" son combos completos (modo + acento + estilo), no solo
// color: cada uno cambia de verdad la sensación de la página con un clic. El
// estilo de cada uno se eligió a juego con su carácter — Contraste alto se
// queda en Clásico a propósito, porque el desenfoque de Vidrio o el borrado
// de sombras de Terminal van en contra de para qué existe ese modo.
export const TEMAS = [
  { label: "Neón", modo: "oled", acento: "accent-violet", estilo: "estilo-terminal" },
  { label: "Día claro", modo: "light", acento: "accent-green", estilo: "estilo-vidrio" },
  { label: "Combate", modo: "dark", acento: "accent-red", estilo: "estilo-brutalista" },
  { label: "Contraste alto", modo: "high-contrast", acento: "", estilo: "" },
] as const;

const CLAVE_ACENTO = "platinos:acento";
const CLAVE_ACENTO_LIBRE = "platinos:acento-libre";
const CLAVE_ESTILO = "platinos:estilo";

function hexARgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}` : null;
}

/** Aplica la clase de acento al <html>, quitando la anterior. */
function aplicarAcento(clase: string) {
  const html = document.documentElement;
  for (const a of ACENTOS) if (a.value) html.classList.remove(a.value);
  if (clase) html.classList.add(clase);
  // Un acento preset manda sobre cualquier color libre que hubiera puesto antes.
  html.style.removeProperty("--accent-rgb");
  html.style.removeProperty("--accent-2");
}

/** Acento de color libre: se escribe directo como variable CSS, no como clase. */
function aplicarAcentoLibre(hex: string) {
  const html = document.documentElement;
  for (const a of ACENTOS) if (a.value) html.classList.remove(a.value);
  const rgb = hexARgb(hex);
  if (rgb) {
    html.style.setProperty("--accent-rgb", rgb);
    html.style.setProperty("--accent-2", hex);
  }
}

/** Aplica la clase de estilo al <html>, quitando la anterior. */
function aplicarEstilo(clase: string) {
  const html = document.documentElement;
  for (const e of ESTILOS) if (e.value) html.classList.remove(e.value);
  if (clase) html.classList.add(clase);
}

export function useApariencia() {
  const { theme, setTheme } = useTheme();
  const [acento, setAcento] = useState("");
  const [acentoLibre, setAcentoLibre] = useState("");
  const [estilo, setEstilo] = useState("");
  const [montado, setMontado] = useState(false);

  // El tema real solo se conoce en el cliente: pintarlo antes daría un desajuste
  // entre lo que renderiza el servidor y lo que ve el navegador.
  useEffect(() => {
    setMontado(true);
    const libreGuardado = localStorage.getItem(CLAVE_ACENTO_LIBRE) ?? "";
    if (libreGuardado) {
      setAcentoLibre(libreGuardado);
      aplicarAcentoLibre(libreGuardado);
    } else {
      const guardado = localStorage.getItem(CLAVE_ACENTO) ?? "";
      setAcento(guardado);
      aplicarAcento(guardado);
    }
    // El estilo ya lo aplicó el script anti-parpadeo en <head> (ver
    // layout.tsx) antes de que React pintara nada; aquí solo se sincroniza
    // el estado de React con lo que ya está puesto en el <html>.
    setEstilo(localStorage.getItem(CLAVE_ESTILO) ?? "");
  }, []);

  function elegirAcento(valor: string) {
    setAcento(valor);
    setAcentoLibre("");
    aplicarAcento(valor);
    localStorage.setItem(CLAVE_ACENTO, valor);
    localStorage.removeItem(CLAVE_ACENTO_LIBRE);
  }

  function elegirAcentoLibre(hex: string) {
    setAcentoLibre(hex);
    setAcento("");
    aplicarAcentoLibre(hex);
    localStorage.setItem(CLAVE_ACENTO_LIBRE, hex);
    localStorage.removeItem(CLAVE_ACENTO);
  }

  function elegirEstilo(valor: string) {
    setEstilo(valor);
    aplicarEstilo(valor);
    if (valor) localStorage.setItem(CLAVE_ESTILO, valor);
    else localStorage.removeItem(CLAVE_ESTILO);
  }

  function elegirTema(t: (typeof TEMAS)[number]) {
    setTheme(t.modo);
    elegirAcento(t.acento);
    elegirEstilo(t.estilo);
  }

  return {
    montado,
    theme,
    setTheme,
    acento,
    acentoLibre,
    estilo,
    elegirAcento,
    elegirAcentoLibre,
    elegirEstilo,
    elegirTema,
  };
}
