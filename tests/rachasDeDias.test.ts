import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));
const { rachasDeDias } = await import("@/lib/history");

describe("rachasDeDias", () => {
  it("cuenta días distintos y la mejor racha de días seguidos", () => {
    const r = rachasDeDias(["2026-01-01", "2026-01-02", "2026-01-03", "2026-02-10", "2026-02-11"]);
    expect(r.diasActivos).toBe(5);
    expect(r.mejor).toBe(3);
  });

  it("sin días, todo a cero", () => {
    expect(rachasDeDias([])).toEqual({ actual: 0, mejor: 0, diasActivos: 0, hoyCuenta: false });
  });
});
