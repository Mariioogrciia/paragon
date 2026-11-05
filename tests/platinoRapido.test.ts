import { describe, expect, it } from "vitest";
import { duracionLegible, duracionPlatino } from "@/lib/platinoRapidoReglas";

const u = { d: "d", h: "h", min: "min" };

describe("duracionPlatino", () => {
  it("resta fin menos inicio", () => {
    expect(duracionPlatino("2026-11-01T10:00:00Z", "2026-11-02T12:30:00Z")).toBe(26.5 * 3_600_000);
  });

  it("descarta marcas imposibles (importadas de golpe) y datos que faltan", () => {
    expect(duracionPlatino("2026-11-01T10:00:00Z", "2026-11-01T10:05:00Z")).toBeNull();
    expect(duracionPlatino("2026-11-01T10:00:00Z", null)).toBeNull();
    expect(duracionPlatino("basura", "2026-11-01T10:00:00Z")).toBeNull();
  });
});

describe("duracionLegible", () => {
  it("días y horas, horas y minutos, o solo minutos", () => {
    expect(duracionLegible((3 * 24 + 4) * 3_600_000, u)).toBe("3 d 4 h");
    expect(duracionLegible(2 * 24 * 3_600_000, u)).toBe("2 d");
    expect(duracionLegible((5 * 60 + 12) * 60_000, u)).toBe("5 h 12 min");
    expect(duracionLegible(42 * 60_000, u)).toBe("42 min");
  });
});
