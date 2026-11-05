import { describe, expect, it } from "vitest";
import { insigniaSvg, textoChat, type ResumenStreamer } from "@/lib/streamerTexto";

const base: ResumenStreamer = {
  handle: "mario",
  nombre: "Mario",
  nivel: 42,
  platinos: 1234,
  trofeos: 5678,
  juegos: 200,
  completado: 61,
  actual: { titulo: "Elden Ring", ganados: 30, total: 42, porcentaje: 71, iconUrl: null },
  ultimo: { nombre: "Señor del Círculo", juego: "Elden Ring", grado: "gold", earnedAt: "2026-11-05T10:00:00Z", iconUrl: null },
};

describe("textoChat", () => {
  it("junta todo en una línea con separador de miles del idioma", () => {
    expect(textoChat(base, "es")).toBe("@mario · Nivel 42 · 1234 platinos · cazando Elden Ring (71%) · Último trofeo: Señor del Círculo · Elden Ring");
    expect(textoChat(base, "en", "platinos")).toBe("@mario · 1,234 platinums · 5,678 trophies");
  });

  it("da un dato suelto", () => {
    expect(textoChat(base, "de", "nivel")).toBe("@mario · Stufe 42");
    expect(textoChat({ ...base, actual: null }, "fr", "juego")).toBe("@mario · aucun jeu en cours");
    expect(textoChat({ ...base, ultimo: null }, "it", "ultimo")).toBe("@mario · ancora nessun trofeo");
  });

  it("no pasa del límite de Twitch aunque el título sea enorme", () => {
    const largo = { ...base, actual: { ...base.actual!, titulo: "x".repeat(600) }, ultimo: { ...base.ultimo!, nombre: "y".repeat(600), juego: "z".repeat(600) } };
    expect(textoChat(largo, "es").length).toBeLessThanOrEqual(480);
  });
});

describe("insigniaSvg", () => {
  it("escapa el texto y pone la etiqueta accesible", () => {
    const svg = insigniaSvg(base, "pt");
    expect(svg).toContain('aria-label="Paragon: Nível 42 · 1.234 platinas"');
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).not.toContain("<script");
  });

  it("el estilo cuadrado no redondea", () => {
    expect(insigniaSvg(base, "es", "cuadrado")).toContain('rx="0"');
  });
});
