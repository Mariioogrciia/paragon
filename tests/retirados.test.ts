import { describe, expect, it } from "vitest";
import { dispositivosDe, dispositivosDeBiblioteca, juegoRetirado, sinRetirados } from "@/lib/retiradosReglas";

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
});
