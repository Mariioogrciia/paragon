import { describe, expect, it } from "vitest";
import { faltanParaSiguiente, medallaDe, nivelDe, temporadaAnterior, temporadaDe } from "@/lib/temporada";

describe("temporadaDe", () => {
  it("trimestres naturales", () => {
    expect(temporadaDe(new Date("2026-09-29T12:00:00Z")).clave).toBe("2026-T3");
    expect(temporadaDe(new Date("2026-10-01T00:00:00Z")).clave).toBe("2026-T4");
    const t4 = temporadaDe(new Date("2026-11-15T00:00:00Z"));
    expect(t4.inicio.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(t4.fin.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
  it("la anterior cruza el cambio de año", () => {
    expect(temporadaAnterior(new Date("2027-02-01T00:00:00Z")).clave).toBe("2026-T4");
  });
});

describe("niveles y medallas", () => {
  it("un nivel cada 250 puntos, tope 50", () => {
    expect(nivelDe(0)).toBe(0);
    expect(nivelDe(249)).toBe(0);
    expect(nivelDe(250)).toBe(1);
    expect(nivelDe(1_000_000)).toBe(50);
    expect(faltanParaSiguiente(300)).toBe(200);
    expect(faltanParaSiguiente(1_000_000)).toBe(0);
  });
  it("la mejor medalla alcanzada", () => {
    expect(medallaDe(4)).toBeNull();
    expect(medallaDe(5)?.clave).toBe("bronce");
    expect(medallaDe(29)?.clave).toBe("plata");
    expect(medallaDe(50)?.clave).toBe("platino");
  });
});
