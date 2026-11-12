import { describe, expect, it } from "vitest";
import { progresoPsn } from "@/lib/psn/progreso";

describe("progresoPsn", () => {
  const definidos = { platinum: 1, gold: 3, silver: 15, bronze: 30 };
  const ganados = { platinum: 0, gold: 2, silver: 9, bronze: 20 };

  it("usa el de Sony cuando tiene sentido", () => {
    expect(progresoPsn(57, definidos, ganados)).toBe(57);
    expect(progresoPsn(100, definidos, ganados)).toBe(100);
    expect(progresoPsn(0, definidos, ganados)).toBe(0);
  });

  it("si Sony manda uno imposible, lo calcula por puntos de cada metal", () => {
    // ganados: 2·90 + 9·30 + 20·15 = 750 · definidos: 180 + 270 + 450 + 450 = 1350 → 56 %
    expect(progresoPsn(390, definidos, ganados)).toBe(56);
    expect(progresoPsn(-3, definidos, ganados)).toBe(56);
    expect(progresoPsn(undefined, definidos, ganados)).toBe(56);
    expect(progresoPsn(390, { platinum: 0, gold: 0, silver: 0, bronze: 0 }, ganados)).toBe(0);
  });
});
