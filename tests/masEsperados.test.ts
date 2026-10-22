import { describe, expect, it } from "vitest";
import { juntarSinRepetir } from "@/lib/igdb/client";

const j = (...ids: number[]) => ids.map((id) => ({ id }));

describe("juntarSinRepetir (próximos lanzamientos)", () => {
  it("los más esperados primero y en su orden; el hype solo rellena", () => {
    expect(juntarSinRepetir(j(3, 1), j(1, 7, 3, 9), 4)).toEqual(j(3, 1, 7, 9));
  });

  it("corta en el límite", () => {
    expect(juntarSinRepetir(j(1, 2, 3), j(4), 2)).toEqual(j(1, 2));
  });

  it("si la consulta de los más esperados falla (lista vacía), queda el orden por hype", () => {
    expect(juntarSinRepetir([], j(5, 6), 8)).toEqual(j(5, 6));
  });
});
