import { describe, expect, it } from "vitest";
import { planObjetivo } from "@/lib/objetivos";

const hoy = new Date(2026, 8, 28);

describe("planObjetivo", () => {
  it("reparte lo que falta entre los días que quedan, contando hoy", () => {
    const plan = planObjetivo(10, "2026-10-02", hoy, 1);
    expect(plan.dias).toBe(5);
    expect(plan.porDia).toBe(2);
  });

  it("compara con el ritmo real", () => {
    expect(planObjetivo(10, "2026-10-02", hoy, 3).alcanzable).toBe(true);
    expect(planObjetivo(10, "2026-10-02", hoy, 1).alcanzable).toBe(false);
    expect(planObjetivo(10, "2026-10-02", hoy, 0).alcanzable).toBeNull();
  });

  it("detecta una fecha ya pasada", () => {
    const plan = planObjetivo(5, "2026-09-20", hoy, 2);
    expect(plan.vencido).toBe(true);
    expect(plan.alcanzable).toBe(false);
  });

  it("si no falta nada, está conseguido aunque la fecha sea hoy", () => {
    expect(planObjetivo(0, "2026-09-28", hoy, 0).alcanzable).toBe(true);
  });
});
