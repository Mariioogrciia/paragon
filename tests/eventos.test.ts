import { describe, expect, it } from "vitest";
import { eventoAnterior, eventoDelMes } from "@/lib/eventos";

describe("eventoDelMes", () => {
  it("da el mes entero en UTC y rota el género", () => {
    const nov = eventoDelMes(new Date("2026-11-05T12:00:00Z"));
    const dic = eventoDelMes(new Date("2026-12-31T23:00:00Z"));
    expect(nov.clave).toBe("2026-11");
    expect(nov.inicio.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(nov.fin.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(dic.categoria).not.toBe(nov.categoria);
    expect(nov.generos.length).toBeGreaterThan(0);
  });

  it("el anterior de enero es diciembre del año pasado", () => {
    expect(eventoAnterior(new Date("2027-01-10T00:00:00Z")).clave).toBe("2026-12");
  });
});
