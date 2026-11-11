import { describe, expect, it } from "vitest";
import { formatearEstadistica, formatoDe, nombreBonito, prepararEstadisticas } from "@/lib/estadisticasJuego";

describe("nombreBonito", () => {
  it("limpia prefijos, guiones bajos y camelCase", () => {
    expect(nombreBonito("total_kills_ak47")).toBe("Total kills ak47");
    expect(nombreBonito("STAT_KILLS")).toBe("Kills");
    expect(nombreBonito("TotalMatchesWon")).toBe("Total matches won");
    expect(nombreBonito("stats.games_played")).toBe("Games played");
  });
});

describe("formatoDe", () => {
  it("adivina tiempo, distancia y porcentaje por el nombre", () => {
    expect(formatoDe("total_time_played")).toEqual({ formato: "tiempo", unidad: "s" });
    expect(formatoDe("playtime_minutes")).toEqual({ formato: "tiempo", unidad: "min" });
    expect(formatoDe("distance_walked")).toEqual({ formato: "distancia", unidad: "m" });
    expect(formatoDe("km_driven")).toEqual({ formato: "distancia", unidad: "km" });
    expect(formatoDe("accuracy")).toEqual({ formato: "porcentaje" });
    expect(formatoDe("total_kills")).toEqual({ formato: "numero" });
  });
});

describe("prepararEstadisticas", () => {
  const esquema = [
    { name: "kills", displayName: "Bajas totales" },
    { name: "deaths", displayName: "Muertes" },
    { name: "ach_progress_3", displayName: "" },
  ];

  it("quita ceros, internas y repetidas, y pone primero las del esquema en su orden", () => {
    const r = prepararEstadisticas(
      [
        { name: "matches_played", value: 50 },
        { name: "deaths", value: 30 },
        { name: "kills", value: 120 },
        { name: "ach_progress_3", value: 7 },
        { name: "game_version", value: 3 },
        { name: "headshots", value: 0 },
        { name: "wins", value: 80 },
        { name: "kills", value: 999 },
      ],
      esquema,
    );
    expect(r.map((e) => e.nombre)).toEqual(["Bajas totales", "Muertes", "Wins", "Matches played"]);
    expect(r[0].valor).toBe(120);
  });

  it("no enseña estadísticas sin letras ni listas de solo marcas (1)", () => {
    const numeros = ["11", "20", "23", "32", "33", "34", "35"].map((name) => ({ name, value: 1 }));
    expect(prepararEstadisticas(numeros, [])).toEqual([]);
    expect(prepararEstadisticas([...numeros, { name: "visited_area", value: 1 }], [])).toEqual([]);
    const r = prepararEstadisticas([...numeros, { name: "kills", value: 340 }, { name: "12", value: 900 }], [{ name: "12", displayName: "12" }]);
    expect(r.map((e) => e.nombre)).toEqual(["Kills"]);
  });

  it("respeta el máximo", () => {
    const stats = Array.from({ length: 40 }, (_, i) => ({ name: `stat${i}`, value: i + 1 }));
    expect(prepararEstadisticas(stats, [], 10)).toHaveLength(10);
  });
});

describe("formatearEstadistica", () => {
  it("formatea cada tipo en el idioma", () => {
    expect(formatearEstadistica({ valor: 1234, formato: "numero" }, "es")).toBe("1234");
    expect(formatearEstadistica({ valor: 12345, formato: "numero" }, "es")).toBe("12.345");
    expect(formatearEstadistica({ valor: 45000, formato: "tiempo", unidad: "s" }, "es")).toBe("12,5 h");
    expect(formatearEstadistica({ valor: 45, formato: "tiempo", unidad: "min" }, "es")).toBe("45 min");
    expect(formatearEstadistica({ valor: 3200, formato: "distancia", unidad: "m" }, "es")).toBe("3,2 km");
    expect(formatearEstadistica({ valor: 0.87, formato: "porcentaje" }, "es")).toBe("87 %");
    expect(formatearEstadistica({ valor: 12345, formato: "numero" }, "en")).toBe("12,345");
  });
});
