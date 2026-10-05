import { describe, expect, it } from "vitest";
import { generarDiarioPlatino } from "@/lib/diarioPlatino";
import type { Trophy } from "@/lib/types";

function trofeo(id: string, fecha: string, extra: Partial<Trophy> = {}): Trophy {
  return { id, name: `T${id}`, detail: "", earned: true, earnedAt: `${fecha}T12:00:00Z`, ...extra };
}

describe("generarDiarioPlatino", () => {
  it("se corona el día del platino aunque haya trofeos de DLC después", () => {
    const d = generarDiarioPlatino([
      trofeo("1", "2026-06-23", { grade: "bronze", rarityPercent: 90 }),
      trofeo("2", "2026-07-01", { grade: "gold", rarityPercent: 10 }),
      trofeo("0", "2026-08-24", { grade: "platinum", rarityPercent: 6 }),
      // DLC cinco meses después: no es el final ni el muro.
      trofeo("d1", "2027-01-20", { grade: "gold", groupId: "001", rarityPercent: 2 }),
    ])!;
    expect(d.fechaPlatino.slice(0, 10)).toBe("2026-08-24");
    expect(d.diasTotales).toBe(62);
    expect(d.muroTrofeo).toBe("T0");
    expect(d.muroDias).toBe(54);
    // La hazaña no es el platino (ya tiene su frase) ni un trofeo de después.
    expect(d.masRaro).toEqual({ nombre: "T2", rarityPercent: 10 });
  });

  it("sin metales, termina en el último trofeo del juego base", () => {
    const d = generarDiarioPlatino([
      trofeo("a", "2026-01-01", { rarityPercent: 50 }),
      trofeo("b", "2026-01-11", { rarityPercent: 5 }),
      trofeo("c", "2026-06-01", { groupId: "dlc", rarityPercent: 1 }),
    ])!;
    expect(d.fechaPlatino.slice(0, 10)).toBe("2026-01-11");
    expect(d.diasTotales).toBe(10);
    expect(d.masRaro?.nombre).toBe("Tb");
  });

  it("sin dos fechas no hay diario", () => {
    expect(generarDiarioPlatino([trofeo("0", "2026-08-24", { grade: "platinum" })])).toBeNull();
  });
});
