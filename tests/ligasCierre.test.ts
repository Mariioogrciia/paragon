import { describe, expect, it } from "vitest";
import { ganadoresDeLiga, ligaTerminada, puestosDeLiga } from "@/lib/ligasCierre";

describe("ligaTerminada", () => {
  const ahora = new Date("2026-10-05T12:00:00Z");
  it("sin fecha de fin no termina nunca", () => {
    expect(ligaTerminada(null, ahora)).toBe(false);
    expect(ligaTerminada(undefined, ahora)).toBe(false);
  });
  it("termina justo al llegar la fecha", () => {
    expect(ligaTerminada(new Date("2026-10-05T11:59:59Z"), ahora)).toBe(true);
    expect(ligaTerminada("2026-10-05T12:00:00.000Z", ahora)).toBe(true);
    expect(ligaTerminada("2026-10-05T12:00:01.000Z", ahora)).toBe(false);
  });
  it("una fecha rota no cuenta como terminada", () => {
    expect(ligaTerminada("mañana", ahora)).toBe(false);
  });
});

describe("ganadoresDeLiga", () => {
  it("gana el de más puntos", () => {
    expect(ganadoresDeLiga([{ userId: "a", points: 50 }, { userId: "b", points: 120 }])).toEqual(["b"]);
  });
  it("empate en lo alto: ganan todos los empatados", () => {
    expect(ganadoresDeLiga([{ userId: "a", points: 90 }, { userId: "b", points: 90 }, { userId: "c", points: 10 }])).toEqual(["a", "b"]);
  });
  it("sin puntos no hay ganador", () => {
    expect(ganadoresDeLiga([{ userId: "a", points: 0 }, { userId: "b", points: 0 }])).toEqual([]);
    expect(ganadoresDeLiga([])).toEqual([]);
  });
});

describe("puestosDeLiga", () => {
  it("los empatados comparten puesto y el siguiente salta", () => {
    const p = puestosDeLiga([{ userId: "a", points: 90 }, { userId: "b", points: 90 }, { userId: "c", points: 10 }]);
    expect(p.get("a")).toBe(1);
    expect(p.get("b")).toBe(1);
    expect(p.get("c")).toBe(3);
  });
});
