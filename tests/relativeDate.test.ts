import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { relativeDate } from "@/lib/design";

describe("relativeDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 28, 12, 0));
  });
  afterEach(() => vi.useRealTimers());

  const hace = (dias: number) => new Date(2026, 8, 28 - dias, 10, 0);

  it("en español da lo mismo que el texto fijo de antes", () => {
    expect(relativeDate(hace(0))).toBe("hoy");
    expect(relativeDate(hace(1))).toBe("ayer");
    expect(relativeDate(hace(5))).toBe("hace 5 d");
    expect(relativeDate(hace(90))).toBe("hace 3 m");
    expect(relativeDate(hace(800))).toBe("hace 2 a");
  });

  it("traduce a otros idiomas", () => {
    expect(relativeDate(hace(1), "en")).toBe("yesterday");
    expect(relativeDate(hace(5), "de")).toBe("vor 5 Tagen");
    // Intl pone un espacio duro (U+00A0) entre el número y la unidad en francés.
    expect(relativeDate(hace(5), "fr")?.replace(/ /g, " ")).toBe("il y a 5 j");
  });

  it("devuelve null con fechas vacías o inválidas", () => {
    expect(relativeDate(null)).toBeNull();
    expect(relativeDate("no es una fecha")).toBeNull();
  });
});
