import { describe, expect, it } from "vitest";
import { contrasteHex, sueloDesdeFondo } from "@/lib/paletaJuego";

describe("sueloDesdeFondo (color de fondo libre)", () => {
  it("respeta el fondo elegido y pone texto claro sobre un fondo oscuro", () => {
    const s = sueloDesdeFondo("#2a0f3d")!;
    expect(s.claro).toBe(false);
    expect(s.vars["--background"]).toBe("#2a0f3d");
    expect(contrasteHex(s.vars["--foreground"], s.vars["--background"])!).toBeGreaterThan(7);
  });

  it("pone texto oscuro sobre un fondo claro", () => {
    const s = sueloDesdeFondo("#ffe9c7")!;
    expect(s.claro).toBe(true);
    expect(contrasteHex(s.vars["--foreground"], s.vars["--background"])!).toBeGreaterThan(7);
  });

  it("el texto se lee también sobre las tarjetas, con cualquier color", () => {
    for (const c of ["#000000", "#ffffff", "#808080", "#ff0000", "#00ff00", "#0000ff", "#7cc4e4", "#3a3a10"]) {
      const s = sueloDesdeFondo(c)!;
      expect(contrasteHex(s.vars["--foreground"], s.vars["--surface"])!).toBeGreaterThan(4.5);
      expect(contrasteHex(s.vars["--muted"], s.vars["--background"])!).toBeGreaterThan(3);
    }
  });

  it("un color que no es hex no aplica nada", () => {
    expect(sueloDesdeFondo("rojo")).toBeNull();
  });
});
