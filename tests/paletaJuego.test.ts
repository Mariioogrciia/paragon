import { describe, expect, it } from "vitest";
import { CONTRASTE_MINIMO, contraste, paletaDesdeColor } from "@/lib/paletaJuego";

const aRgb = (canal: string) => canal.split(" ").map(Number) as [number, number, number];
const deHex = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

describe("paletaDesdeColor", () => {
  // Carátulas reales dan de todo: casi negro, casi blanco, gris, saturado.
  const casos = ["#0a0a0a", "#fafafa", "#808080", "#c2410c", "#1e3a8a", "#fcd34d", "#14532d", "#ff00ff"];

  it.each(casos)("el acento se lee sobre su superficie en oscuro (%s)", (color) => {
    const p = paletaDesdeColor(color)!;
    expect(contraste(aRgb(p.rgb), deHex(p.surface))).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);
  });

  it.each(casos)("el acento de modo claro se lee sobre blanco (%s)", (color) => {
    const p = paletaDesdeColor(color)!;
    expect(contraste(aRgb(p.rgbClaro), [255, 255, 255])).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);
  });

  it("el suelo es oscuro y mantiene el tono de la carátula", () => {
    const p = paletaDesdeColor("#c2410c")!;
    const [r, g, b] = deHex(p.bg);
    expect(Math.max(r, g, b)).toBeLessThan(30);
    expect(r).toBeGreaterThan(b);
  });

  it("rechaza lo que no es un color", () => {
    expect(paletaDesdeColor("rojo")).toBeNull();
  });
});
