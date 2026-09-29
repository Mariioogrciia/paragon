import { describe, expect, it } from "vitest";
import { normalizarPerdibles } from "@/lib/perdibles";

describe("normalizarPerdibles", () => {
  it("deja una lista tal cual", () => {
    expect(normalizarPerdibles(["a", "b"])).toEqual(["a", "b"]);
  });
  it("repara el JSON codificado dos veces (caso real de Black Myth: Wukong)", () => {
    expect(normalizarPerdibles('["urge unfulfilled","fickle forms"]')).toEqual(["urge unfulfilled", "fickle forms"]);
  });
  it("cualquier otra cosa, lista vacía", () => {
    expect(normalizarPerdibles(null)).toEqual([]);
    expect(normalizarPerdibles("no es json")).toEqual([]);
    expect(normalizarPerdibles(42)).toEqual([]);
  });
});
