import { describe, expect, it } from "vitest";
import { cazasDeBiblioteca, dispositivosDe, dispositivosDeBiblioteca, juegoRetirado, sinRetirados } from "@/lib/retiradosReglas";
import type { Game } from "@/lib/types";

const r = (dispositivos: string[], juegos: string[] = []) => ({ dispositivos: new Set(dispositivos), juegos: new Set(juegos) });

describe("retirados", () => {
  it("separa las consolas de un juego de varias", () => {
    expect(dispositivosDe("PS3,PSVITA")).toEqual(["PS3", "PSVITA"]);
    expect(dispositivosDe(" ps4 ")).toEqual(["PS4"]);
    expect(dispositivosDe(undefined)).toEqual([]);
  });

  it("un juego de varias consolas solo se retira si lo están todas, y los sueltos siempre", () => {
    expect(juegoRetirado({ id: "a", deviceLabel: "PS3" }, r(["PS3"]))).toBe(true);
    expect(juegoRetirado({ id: "b", deviceLabel: "PS3,PSVITA" }, r(["PS3"]))).toBe(false);
    expect(juegoRetirado({ id: "b", deviceLabel: "PS3,PSVITA" }, r(["PS3", "PSVITA"]))).toBe(true);
    expect(juegoRetirado({ id: "c", deviceLabel: "PS5" }, r([], ["c"]))).toBe(true);
    expect(sinRetirados([{ id: "a", deviceLabel: "PS3" }, { id: "d", deviceLabel: "PS5" }], r(["PS3"])).map((g) => g.id)).toEqual(["d"]);
  });

  it("cuenta las consolas de la biblioteca sin los deseados", () => {
    expect(
      dispositivosDeBiblioteca([
        { deviceLabel: "PS4" },
        { deviceLabel: "PS4,PSVITA" },
        { deviceLabel: "PS3" },
        { deviceLabel: "PS5", isWishlist: true },
      ]),
    ).toEqual([
      { dispositivo: "PS4", juegos: 2 },
      { dispositivo: "PS3", juegos: 1 },
      { dispositivo: "PSVITA", juegos: 1 },
    ]);
  });

  it("«Mis cazas»: en el orden elegido, sin platinados, retirados ni juegos que ya no están", () => {
    const juego = (id: string, o: Partial<Game> = {}) =>
      ({ id, platform: "psn", title: id, deviceLabel: "PS5", definedTotal: 40, earnedTotal: 10, progressPercent: 25, defined: { platinum: 1, gold: 0, silver: 0, bronze: 39 }, earned: { platinum: 0, gold: 0, silver: 0, bronze: 10 }, ...o }) as Game;
    const games = [
      juego("a"),
      juego("b"),
      juego("plat", { earnedTotal: 40, progressPercent: 100, earned: { platinum: 1, gold: 0, silver: 0, bronze: 39 } }),
      juego("viejo", { deviceLabel: "PS3" }),
    ];
    const marcas = { cazas: ["b", "plat", "no-existe", "viejo", "a"], dispositivos: new Set(["PS3"]), juegos: new Set<string>() };
    expect(cazasDeBiblioteca(games, marcas).map((g) => g.id)).toEqual(["b", "a"]);
  });
});
