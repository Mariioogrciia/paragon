import { describe, expect, it } from "vitest";
import { cantidadDelTexto, leerLista, marcadosValidos } from "@/lib/coleccionablesReglas";

describe("cantidadDelTexto", () => {
  it("saca el número de los textos típicos de trofeos", () => {
    expect(cantidadDelTexto("Grillos", "Find all 16 singing crickets")).toBe(16);
    expect(cantidadDelTexto("Plumas", "Encuentra todas las 50 plumas")).toBe(50);
    expect(cantidadDelTexto("Cartas", "Collect 30 cards")).toBe(30);
    expect(cantidadDelTexto("Archivos", "Documentos (0/24)")).toBe(24);
    expect(cantidadDelTexto("Haikus", "Recoge 19 haikus")).toBe(19);
  });

  it("null si no hay número claro o no tiene sentido", () => {
    expect(cantidadDelTexto("Coleccionista", "Find all the collectibles")).toBeNull();
    expect(cantidadDelTexto("Capítulo 1", "Completa el capítulo 1")).toBeNull();
    expect(cantidadDelTexto("Mil", "Collect 5000 coins")).toBeNull();
  });
});

describe("leerLista", () => {
  it("quita viñetas, números y casillas, y los repetidos", () => {
    expect(leerLista("1. Grillo del bosque\n- Grillo del río\n* [x] Grillo del templo\n\n2) grillo del bosque\n• Cueva")).toEqual([
      "Grillo del bosque",
      "Grillo del río",
      "Grillo del templo",
      "Cueva",
    ]);
  });

  it("no pasa del máximo", () => {
    expect(leerLista(Array.from({ length: 500 }, (_, i) => `Cosa ${i}`).join("\n"))).toHaveLength(400);
  });
});

describe("marcadosValidos", () => {
  it("filtra, ordena y quita repetidos", () => {
    expect(marcadosValidos([3, 1, 1, 9, -1, 2.5, "x"], 5)).toEqual([1, 3]);
    expect(marcadosValidos(null, 5)).toEqual([]);
  });
});
