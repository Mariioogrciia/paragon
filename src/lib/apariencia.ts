"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { guardarAparienciaAction } from "@/app/actions";
import { ESTILO_REQUISITOS } from "@/lib/level";
import { paletaDesdeColor, variablesPaleta } from "@/lib/paletaJuego";

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
  { value: "", label: "Platino", color: "#7cc4e4" },
  { value: "accent-blue", label: "Azul", color: "#4a9eff" },
  { value: "accent-violet", label: "Morado", color: "#8b5cf6" },
  { value: "accent-red", label: "Rojo", color: "#ef4444" },
  { value: "accent-green", label: "Verde", color: "#10b981" },
  { value: "accent-orange", label: "Naranja", color: "#f59e0b" },
  // Paletas completas: el círculo enseña el fondo (mitad) y el acento (mitad).
  { value: "accent-laton", label: "Hoja de servicio", color: "linear-gradient(135deg, #0b1120 50%, #c9a24a 50%)" },
  { value: "accent-carreras", label: "Liga de carreras", color: "linear-gradient(135deg, #1a1d21 50%, #ff6a00 50%)" },
  { value: "accent-salidas", label: "Panel de salidas", color: "linear-gradient(135deg, #13161c 50%, #ffcf3a 50%)" },
  { value: "accent-datos", label: "Datos", color: "linear-gradient(135deg, #000000 50%, #f0f4fa 50%)" },
  { value: "accent-fosforo", label: "Fósforo", color: "linear-gradient(135deg, #020a04 50%, #33ff66 50%)" },
  { value: "accent-inmersion", label: "Inmersión", color: "linear-gradient(135deg, #04121f 50%, #3fd0e0 50%)" },
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
const CLAVE_TEXTO = "platinos:texto";
/** JSON `{ id, color, vars }`: el juego elegido, su color de carátula y las
 *  variables ya calculadas (el script anti-parpadeo de layout.tsx solo las
 *  copia, no puede recalcular la paleta). */
const CLAVE_ACENTO_JUEGO = "platinos:acento-juego";

export interface AcentoJuego {
  id: string;
  color: string;
}

/**
 * Tamaño de letra de toda la interfaz.
 *
 * Se aplica como `font-size` del <html>, y funciona porque las clases de
 * texto de la app estan en `rem` (se convirtieron 387 clases que estaban en
 * px a proposito para esto: en px NO responden al tamaño de la raiz). 100%
 * = 16px, el valor por defecto del navegador.
 *
 * Quien tenga el navegador o el movil configurado con letra mas grande no
 * pierde ese ajuste: 100% respeta lo que ya tuviera puesto.
 */
export const TAMANOS_TEXTO = [
  { value: "", label: "Normal", escala: "100%" },
  { value: "grande", label: "Grande", escala: "112.5%" },
  { value: "enorme", label: "Enorme", escala: "125%" },
  { value: "pequeno", label: "Pequeño", escala: "87.5%" },
] as const;

function aplicarTamanoTexto(valor: string) {
  const t = TAMANOS_TEXTO.find((x) => x.value === valor) ?? TAMANOS_TEXTO[0];
  if (t.value) document.documentElement.style.fontSize = t.escala;
  else document.documentElement.style.removeProperty("font-size");
}

function hexARgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}` : null;
}

const VARIABLES_JUEGO = ["--juego-rgb", "--juego-rgb-claro", "--juego-2", "--juego-bg", "--juego-surface", "--juego-surface-2", "--juego-border"];

function quitarAcentoJuego(html: HTMLElement) {
  html.classList.remove("accent-juego");
  for (const v of VARIABLES_JUEGO) html.style.removeProperty(v);
}

/** Aplica la clase de acento al <html>, quitando la anterior. */
function aplicarAcento(clase: string) {
  const html = document.documentElement;
  for (const a of ACENTOS) if (a.value) html.classList.remove(a.value);
  quitarAcentoJuego(html);
  if (clase) html.classList.add(clase);
  // Un acento preset manda sobre cualquier color libre que hubiera puesto antes.
  html.style.removeProperty("--accent-rgb");
  html.style.removeProperty("--accent-2");
}

/** Acento de color libre: se escribe directo como variable CSS, no como clase. */
function aplicarAcentoLibre(hex: string) {
  const html = document.documentElement;
  for (const a of ACENTOS) if (a.value) html.classList.remove(a.value);
  quitarAcentoJuego(html);
  const rgb = hexARgb(hex);
  if (rgb) {
    html.style.setProperty("--accent-rgb", rgb);
    html.style.setProperty("--accent-2", hex);
  }
}

/**
 * Paleta sacada de la carátula de un juego: acento y, en oscuro, el suelo
 * entero (ver `.accent-juego` en globals.css). Devuelve las variables para
 * guardarlas, o null si el color no vale.
 */
function aplicarAcentoJuego(color: string): Record<string, string> | null {
  const paleta = paletaDesdeColor(color);
  if (!paleta) return null;
  const html = document.documentElement;
  for (const a of ACENTOS) if (a.value) html.classList.remove(a.value);
  html.style.removeProperty("--accent-rgb");
  html.style.removeProperty("--accent-2");
  const vars = variablesPaleta(paleta);
  for (const [k, v] of Object.entries(vars)) html.style.setProperty(k, v);
  html.classList.add("accent-juego");
  return vars;
}

function leerAcentoJuego(): AcentoJuego | undefined {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE_ACENTO_JUEGO) ?? "null");
    return crudo && typeof crudo.id === "string" && typeof crudo.color === "string" ? { id: crudo.id, color: crudo.color } : undefined;
  } catch {
    return undefined;
  }
}

function escribirAcentoJuego(juego: AcentoJuego | undefined) {
  const vars = juego ? aplicarAcentoJuego(juego.color) : null;
  if (juego && vars) localStorage.setItem(CLAVE_ACENTO_JUEGO, JSON.stringify({ ...juego, vars }));
  else localStorage.removeItem(CLAVE_ACENTO_JUEGO);
}

/** Aplica la clase de estilo al <html>, quitando la anterior. */
function aplicarEstilo(clase: string) {
  const html = document.documentElement;
  for (const e of ESTILOS) if (e.value) html.classList.remove(e.value);
  if (clase) html.classList.add(clase);
}

export interface AparienciaGuardada {
  acento?: string;
  acentoLibre?: string;
  acentoJuego?: AcentoJuego;
  estilo?: string;
  tamanoTexto?: string;
}

/** Nivel mínimo del estilo, o `null` si es libre (ver ESTILO_REQUISITOS en lib/level.ts). */
export function nivelDeEstilo(valor: string): number | null {
  return ESTILO_REQUISITOS[valor] ?? null;
}

function leerLocal(): AparienciaGuardada {
  return {
    acento: localStorage.getItem(CLAVE_ACENTO) ?? "",
    acentoLibre: localStorage.getItem(CLAVE_ACENTO_LIBRE) ?? "",
    ...(leerAcentoJuego() ? { acentoJuego: leerAcentoJuego() } : {}),
    estilo: localStorage.getItem(CLAVE_ESTILO) ?? "",
    tamanoTexto: localStorage.getItem(CLAVE_TEXTO) ?? "",
  };
}

function escribirLocal(clave: string, valor: string | undefined) {
  if (valor) localStorage.setItem(clave, valor);
  else localStorage.removeItem(clave);
}

/**
 * Al cargar cualquier página con sesión (SincronizarApariencia, layout):
 * lo guardado en la cuenta manda sobre este navegador, así un móvil nuevo
 * sale ya con el acento y estilo de siempre. Un estilo por encima del nivel
 * se quita (p. ej. si se eligió antes de que existiera el requisito).
 */
export function aplicarAparienciaGuardada(guardada: AparienciaGuardada | null, nivel: number) {
  try {
    const actual = leerLocal();
    const deseada = guardada ?? actual;
    const requisito = nivelDeEstilo(deseada.estilo ?? "");
    const estilo = requisito !== null && nivel < requisito ? "" : (deseada.estilo ?? "");
    const final = { ...deseada, estilo };
    if (JSON.stringify(final) === JSON.stringify(actual)) return;
    escribirLocal(CLAVE_ACENTO, final.acento);
    escribirLocal(CLAVE_ACENTO_LIBRE, final.acentoLibre);
    escribirLocal(CLAVE_ESTILO, final.estilo);
    escribirLocal(CLAVE_TEXTO, final.tamanoTexto);
    if (final.acentoJuego) escribirAcentoJuego(final.acentoJuego);
    else {
      localStorage.removeItem(CLAVE_ACENTO_JUEGO);
      if (final.acentoLibre) aplicarAcentoLibre(final.acentoLibre);
      else aplicarAcento(final.acento ?? "");
    }
    aplicarEstilo(final.estilo);
    aplicarTamanoTexto(final.tamanoTexto ?? "");
  } catch {
    // Sin localStorage (modo privado estricto): se queda como esté.
  }
}

/**
 * `sincronizar`: guardar cada cambio en la cuenta (solo con sesión; la
 * portada pública usa el selector sin guardar nada).
 */
export function useApariencia({ sincronizar = false }: { sincronizar?: boolean } = {}) {
  const { theme, setTheme } = useTheme();
  const [acento, setAcento] = useState("");
  const [acentoLibre, setAcentoLibre] = useState("");
  const [acentoJuego, setAcentoJuego] = useState("");
  const [estilo, setEstilo] = useState("");
  const [tamanoTexto, setTamanoTexto] = useState("");
  const [montado, setMontado] = useState(false);

  // El tema real solo se conoce en el cliente: pintarlo antes daría un desajuste
  // entre lo que renderiza el servidor y lo que ve el navegador.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el tema guardado solo existe en el cliente: se lee al montar para no romper la hidratación.
    setMontado(true);
    const libreGuardado = localStorage.getItem(CLAVE_ACENTO_LIBRE) ?? "";
    const juegoGuardado = leerAcentoJuego();
    if (juegoGuardado) {
      setAcentoJuego(juegoGuardado.id);
      aplicarAcentoJuego(juegoGuardado.color);
    } else if (libreGuardado) {
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
    setTamanoTexto(localStorage.getItem(CLAVE_TEXTO) ?? "");
  }, []);

  function persistir() {
    if (sincronizar) guardarAparienciaAction(leerLocal()).catch(() => undefined);
  }

  function elegirAcento(valor: string) {
    setAcento(valor);
    setAcentoLibre("");
    setAcentoJuego("");
    localStorage.removeItem(CLAVE_ACENTO_JUEGO);
    aplicarAcento(valor);
    localStorage.setItem(CLAVE_ACENTO, valor);
    localStorage.removeItem(CLAVE_ACENTO_LIBRE);
    persistir();
  }

  function elegirAcentoLibre(hex: string) {
    setAcentoLibre(hex);
    setAcento("");
    setAcentoJuego("");
    localStorage.removeItem(CLAVE_ACENTO_JUEGO);
    aplicarAcentoLibre(hex);
    localStorage.setItem(CLAVE_ACENTO_LIBRE, hex);
    localStorage.removeItem(CLAVE_ACENTO);
    persistir();
  }

  function elegirAcentoJuego(juego: AcentoJuego) {
    setAcentoJuego(juego.id);
    setAcento("");
    setAcentoLibre("");
    localStorage.removeItem(CLAVE_ACENTO);
    localStorage.removeItem(CLAVE_ACENTO_LIBRE);
    escribirAcentoJuego(juego);
    persistir();
  }

  function elegirEstilo(valor: string) {
    setEstilo(valor);
    aplicarEstilo(valor);
    if (valor) localStorage.setItem(CLAVE_ESTILO, valor);
    else localStorage.removeItem(CLAVE_ESTILO);
    persistir();
  }

  function elegirTamanoTexto(valor: string) {
    setTamanoTexto(valor);
    aplicarTamanoTexto(valor);
    if (valor) localStorage.setItem(CLAVE_TEXTO, valor);
    else localStorage.removeItem(CLAVE_TEXTO);
    persistir();
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
    acentoJuego,
    estilo,
    tamanoTexto,
    elegirAcento,
    elegirAcentoLibre,
    elegirAcentoJuego,
    elegirEstilo,
    elegirTamanoTexto,
    elegirTema,
  };
}
