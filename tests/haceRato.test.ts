import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { haceRato } from "@/lib/design";

describe("haceRato", () => {
  const ahora = new Date("2026-10-21T18:00:00Z");
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(ahora);
  });
  afterEach(() => vi.useRealTimers());

  const hace = (ms: number) => new Date(ahora.getTime() - ms);

  it("minutos, horas y días en lo del día", () => {
    expect(haceRato(hace(5 * 60_000), "es")).toBe("hace 5 min");
    expect(haceRato(hace(3 * 3_600_000), "es")).toBe("hace 3 h");
    expect(haceRato(hace(2 * 86_400_000), "en")).toBe("2d ago");
  });

  it("nunca dice 'hace 0 min'", () => {
    expect(haceRato(hace(5_000), "es")).toBe("hace 1 min");
  });
});
