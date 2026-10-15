import { describe, expect, it } from "vitest";
import { juntarLogros } from "@/lib/juntarLogros";
import type { Trophy } from "@/lib/types";

const logro = (id: string, earned: boolean, earnedAt?: string): Trophy =>
  ({ id, name: id, detail: "", earned, earnedAt, iconUrl: "" }) as Trophy;

describe("juntar logros de varias cuentas de Steam", () => {
  it("conseguido si lo tiene cualquiera, con la fecha más antigua", () => {
    const principal = [logro("a", true, "2026-01-05T00:00:00Z"), logro("b", false), logro("c", true, "2026-03-01T00:00:00Z")];
    const fifa = [logro("a", true, "2025-12-01T00:00:00Z"), logro("b", true, "2026-10-01T00:00:00Z"), logro("c", false)];
    const r = juntarLogros(principal, [fifa]);
    expect(r.map((t) => t.earned)).toEqual([true, true, true]);
    expect(r[0].earnedAt).toBe("2025-12-01T00:00:00Z");
    expect(r[1].earnedAt).toBe("2026-10-01T00:00:00Z");
    expect(r[2].earnedAt).toBe("2026-03-01T00:00:00Z");
  });

  it("si la cuenta base no tiene el juego, vale la lista de otra", () => {
    const otra = [logro("x", true, "2026-10-10T00:00:00Z")];
    expect(juntarLogros([], [[], otra])).toEqual(otra);
  });

  it("sin otras cuentas no cambia nada", () => {
    const base = [logro("a", false)];
    expect(juntarLogros(base, [])).toBe(base);
  });
});
