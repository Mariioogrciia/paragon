import { continueRender, delayRender, staticFile } from "remotion";

/** Los colores y letras de la web de Paragon (src/app/globals.css). */
export const ACENTO = "#7CC4E4";
export const ACENTO_2 = "#D7EEF8";
export const FONDO = "#06080C";
export const SUPERFICIE = "#10151F";
export const TEXTO = "#E9EEF7";
export const APAGADO = "#A7B0C0";
export const ORO = "#E2B53E";
export const PLATINO = "#9FD8EF";

export const TITULAR = "'Chakra Petch', sans-serif";
export const CUERPO = "'Barlow', sans-serif";

const FUENTES: [string, string, string][] = [
  ["Chakra Petch", "700", "fuentes/chakra-700.woff2"],
  ["Chakra Petch", "600", "fuentes/chakra-600.woff2"],
  ["Barlow", "400", "fuentes/barlow-400.woff2"],
  ["Barlow", "600", "fuentes/barlow-600.woff2"],
  ["Barlow", "700", "fuentes/barlow-700.woff2"],
];

let cargadas = false;

/** Las mismas fuentes que la web (copiadas de su build), antes del primer fotograma. */
export function cargarFuentes() {
  if (cargadas || typeof document === "undefined") return;
  cargadas = true;
  const espera = delayRender("fuentes");
  Promise.all(
    FUENTES.map(async ([familia, peso, ruta]) => {
      const f = new FontFace(familia, `url(${staticFile(ruta)})`, { weight: peso });
      await f.load();
      document.fonts.add(f);
    }),
  ).then(() => continueRender(espera), () => continueRender(espera));
}
