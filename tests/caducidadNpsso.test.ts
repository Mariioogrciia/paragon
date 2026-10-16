import { describe, expect, it } from "vitest";
import { avisoNpsso, diasRestantesNpsso } from "@/lib/caducidadNpsso";

const ahora = new Date("2026-10-16T10:00:00Z");
const haceDias = (n: number) => new Date(ahora.getTime() - n * 24 * 60 * 60 * 1000);

describe("avisoNpsso", () => {
  it("avisa una vez al día si falta la variable", () => {
    expect(avisoNpsso({ configurado: false, falla: false, huella: null, vistoDesde: null, ahora })).toEqual({
      tipo: "falta",
      clave: "falta-2026-10-16",
    });
  });

  it("avisa una vez al día y por NPSSO si Sony lo rechaza", () => {
    expect(avisoNpsso({ configurado: true, falla: true, huella: "abc", vistoDesde: haceDias(10), ahora })).toEqual({
      tipo: "caducado",
      clave: "caducado-abc-2026-10-16",
    });
  });

  it("no dice nada mientras quede más de una semana", () => {
    expect(avisoNpsso({ configurado: true, falla: false, huella: "abc", vistoDesde: haceDias(52), ahora })).toBeNull();
    expect(avisoNpsso({ configurado: true, falla: false, huella: "abc", vistoDesde: null, ahora })).toBeNull();
  });

  it("avisa una sola vez por NPSSO cuando queda una semana", () => {
    expect(avisoNpsso({ configurado: true, falla: false, huella: "abc", vistoDesde: haceDias(53), ahora })).toEqual({
      tipo: "pronto",
      clave: "pronto-abc",
      diasRestantes: 7,
    });
  });
});

describe("diasRestantesNpsso", () => {
  it("cuenta 60 días desde que se vio funcionar y no baja de 0", () => {
    expect(diasRestantesNpsso(ahora, ahora)).toBe(60);
    expect(diasRestantesNpsso(haceDias(59), ahora)).toBe(1);
    expect(diasRestantesNpsso(haceDias(90), ahora)).toBe(0);
  });
});
