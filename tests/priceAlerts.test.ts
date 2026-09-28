import { describe, expect, it } from "vitest";
import { debeAvisar } from "@/lib/priceAlerts";

const ahora = new Date("2026-09-28T12:00:00Z");
const hace = (dias: number) => new Date(ahora.getTime() - dias * 86_400_000);
const alerta = (extra: Partial<Parameters<typeof debeAvisar>[0]> = {}) => ({
  precioObjetivo: 20,
  avisadoAt: null,
  precioAvisado: null,
  ...extra,
});

describe("debeAvisar", () => {
  it("avisa la primera vez que baja del objetivo (o lo iguala)", () => {
    expect(debeAvisar(alerta(), 19.99, ahora)).toBe(true);
    expect(debeAvisar(alerta(), 20, ahora)).toBe(true);
  });

  it("no avisa por encima del objetivo ni sin precio", () => {
    expect(debeAvisar(alerta(), 20.01, ahora)).toBe(false);
    expect(debeAvisar(alerta(), null, ahora)).toBe(false);
  });

  it("no repite el mismo aviso durante la misma rebaja", () => {
    expect(debeAvisar(alerta({ avisadoAt: hace(1), precioAvisado: 15 }), 15, ahora)).toBe(false);
  });

  it("vuelve a avisar si baja todavía más", () => {
    expect(debeAvisar(alerta({ avisadoAt: hace(1), precioAvisado: 15 }), 12, ahora)).toBe(true);
  });

  it("vuelve a avisar pasada una semana", () => {
    expect(debeAvisar(alerta({ avisadoAt: hace(8), precioAvisado: 15 }), 15, ahora)).toBe(true);
  });
});
