import { describe, expect, it } from "vitest";
import { ganadoresReto } from "@/lib/retosAmigosReglas";

describe("ganadoresReto", () => {
  it("gana quien más trofeos tiene", () => {
    expect(ganadoresReto([{ userId: "a", trofeos: 3 }, { userId: "b", trofeos: 9 }, { userId: "c", trofeos: 1 }])).toEqual(["b"]);
  });

  it("un empate en cabeza lo ganan todos los empatados", () => {
    expect(ganadoresReto([{ userId: "a", trofeos: 5 }, { userId: "b", trofeos: 5 }, { userId: "c", trofeos: 2 }])).toEqual(["a", "b"]);
  });

  it("si nadie consigue nada, no gana nadie", () => {
    expect(ganadoresReto([{ userId: "a", trofeos: 0 }, { userId: "b", trofeos: 0 }])).toEqual([]);
  });

  it("sin participantes, sin ganadores", () => {
    expect(ganadoresReto([])).toEqual([]);
  });
});
