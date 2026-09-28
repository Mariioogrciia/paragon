import { describe, expect, it } from "vitest";
import { claveSemana, esMomentoDelResumen } from "@/lib/semana";

describe("esMomentoDelResumen", () => {
  it("domingo por la tarde en Madrid, con horario de verano (UTC+2)", () => {
    expect(esMomentoDelResumen(new Date("2026-09-27T15:59:00Z"))).toBe(false); // 17:59 Madrid
    expect(esMomentoDelResumen(new Date("2026-09-27T16:00:00Z"))).toBe(true); // 18:00 Madrid
    expect(esMomentoDelResumen(new Date("2026-09-27T21:59:00Z"))).toBe(true); // 23:59 Madrid
    expect(esMomentoDelResumen(new Date("2026-09-27T22:00:00Z"))).toBe(false); // ya es lunes en Madrid
  });

  it("y con horario de invierno (UTC+1)", () => {
    expect(esMomentoDelResumen(new Date("2026-11-29T16:30:00Z"))).toBe(false); // 17:30 Madrid
    expect(esMomentoDelResumen(new Date("2026-11-29T16:59:00Z"))).toBe(false); // 17:59 Madrid
    expect(esMomentoDelResumen(new Date("2026-11-29T17:00:00Z"))).toBe(true); // 18:00 Madrid
  });

  it("otro día de la semana, nunca", () => {
    expect(esMomentoDelResumen(new Date("2026-09-28T19:00:00Z"))).toBe(false); // lunes
  });
});

describe("claveSemana", () => {
  it("semana ISO", () => {
    expect(claveSemana(new Date("2026-09-27T18:00:00Z"))).toBe("2026-W39"); // domingo
    expect(claveSemana(new Date("2026-09-28T08:00:00Z"))).toBe("2026-W40"); // lunes
  });

  it("el cambio de año sigue la norma ISO", () => {
    expect(claveSemana(new Date("2027-01-01T12:00:00Z"))).toBe("2026-W53");
    expect(claveSemana(new Date("2025-12-29T12:00:00Z"))).toBe("2026-W01");
  });
});
