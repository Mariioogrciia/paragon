import { describe, expect, it } from "vitest";
import { calcularPeriodos, horaFavorita } from "@/lib/periodos";

describe("periodos de caza", () => {
  const dias = [
    { dia: "2026-10-15", total: 3 }, // hoy
    { dia: "2026-10-09", total: 2 }, // hace 6 días: entra en la semana
    { dia: "2026-10-08", total: 4 }, // hace 7: semana anterior
    { dia: "2026-01-02", total: 5 },
    { dia: "2025-10-15", total: 7 }, // mismo día del año pasado: cuenta
    { dia: "2025-10-16", total: 9 }, // después: no cuenta para la comparación
    { dia: "2023-05-01", total: 1 },
  ];
  const p = calcularPeriodos(dias, "2026-10-15");

  it("semana: los 7 últimos días con hoy al final, y la anterior aparte", () => {
    expect(p.semana.barras).toEqual([2, 0, 0, 0, 0, 0, 3]);
    expect(p.semana.total).toBe(5);
    expect(p.semana.anterior).toBe(4);
  });

  it("año: por meses, comparado con el mismo tramo del año pasado", () => {
    expect(p.anio.total).toBe(14);
    expect(p.anio.barras[0]).toBe(5);
    expect(p.anio.barras[9]).toBe(9);
    expect(p.anio.anterior).toBe(7);
  });

  it("siempre: un año por barra, con los años vacíos a cero", () => {
    expect(p.siempre.total).toBe(31);
    expect(p.siempre.barras.map((b) => b.anio)).toEqual([2023, 2024, 2025, 2026]);
    expect(p.siempre.barras[1].total).toBe(0);
  });

  it("hora favorita", () => {
    expect(horaFavorita([{ hora: 9, total: 2 }, { hora: 23, total: 8 }, { hora: 14, total: 8 }])).toBe(23);
    expect(horaFavorita([])).toBeNull();
  });
});
