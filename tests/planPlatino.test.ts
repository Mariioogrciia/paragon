import { describe, expect, it } from "vitest";
import { planPlatino } from "@/lib/planPlatino";
import type { Trophy } from "@/lib/types";

const t = (id: string, extra: Partial<Trophy> = {}): Trophy => ({ id, name: id, detail: "", earned: false, ...extra });

describe("planPlatino", () => {
  it("pone los perdibles primero y la limpieza al final, sin el platino", () => {
    const plan = planPlatino([
      t("plat", { grade: "platinum" }),
      t("a", { name: "Find all feathers", detail: "Collect all 50 feathers" }),
      t("b", { isMissable: true }),
      t("c", { name: "Chapter 1", detail: "Complete chapter 1 of the story", earned: true }),
      t("d", { name: "Raro", rarityPercent: 2 }),
      t("e", { name: "Común", rarityPercent: 40 }),
    ])!;
    expect(plan.fases.map((f) => f.fase)).toEqual(["perdibles", "historia", "coleccionables", "limpieza"]);
    expect(plan.actual).toBe("perdibles");
    expect(plan.faltan).toBe(4);
    const historia = plan.fases.find((f) => f.fase === "historia")!;
    expect(historia).toMatchObject({ total: 1, conseguidos: 1, pendientes: [] });
    // Limpieza: lo más común primero.
    expect(plan.fases.at(-1)!.pendientes.map((x) => x.id)).toEqual(["e", "d"]);
  });

  it("deja fuera los DLC si el juego los separa", () => {
    const plan = planPlatino([t("base"), t("dlc", { groupId: "001" })])!;
    expect(plan.faltan).toBe(1);
  });

  it("sin nada que hacer, sin fase actual", () => {
    const plan = planPlatino([t("a", { earned: true })])!;
    expect(plan.actual).toBeNull();
    expect(planPlatino([t("p", { grade: "platinum" })])).toBeNull();
  });
});
