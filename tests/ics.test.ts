import { describe, expect, it } from "vitest";
import { calendarioIcs, plegarLinea, textoIcs, ultimoDiaDelMes } from "@/lib/ics";

describe("textoIcs", () => {
  it("escapa comas, punto y coma, barras y saltos de línea", () => {
    expect(textoIcs("a, b; c\\d\ne")).toBe("a\\, b\\; c\\\\d\\ne");
  });
});

describe("plegarLinea", () => {
  it("parte a 75 octetos sin cortar caracteres UTF-8", () => {
    const linea = "SUMMARY:" + "ñ".repeat(80);
    const plegada = plegarLinea(linea);
    for (const parte of plegada.split("\r\n")) expect(new TextEncoder().encode(parte).length).toBeLessThanOrEqual(75);
    expect(plegada.split("\r\n").map((p, i) => (i === 0 ? p : p.slice(1))).join("")).toBe(linea);
  });

  it("deja igual una línea corta", () => {
    expect(plegarLinea("VERSION:2.0")).toBe("VERSION:2.0");
  });
});

describe("calendarioIcs", () => {
  const ahora = new Date("2026-11-05T12:00:00Z");
  const ics = calendarioIcs(
    "Paragon",
    [
      { uid: "lanzamiento-1", titulo: "Sale GTA VI", diaEntero: true, inicio: new Date("2026-11-19T00:00:00Z") },
      { uid: "sesion-2", titulo: "Sesión", inicio: new Date("2026-11-07T20:00:00Z"), url: "https://x.test/s/2" },
    ],
    ahora,
  );

  it("usa CRLF y cierra el calendario", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("los de día entero van con VALUE=DATE y terminan al día siguiente", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20261119\r\nDTEND;VALUE=DATE:20261120");
  });

  it("los de hora duran una hora por defecto", () => {
    expect(ics).toContain("DTSTART:20261107T200000Z\r\nDTEND:20261107T210000Z");
    expect(ics).toContain("UID:sesion-2@paragontrophies.com");
  });
});

describe("ultimoDiaDelMes", () => {
  it("sabe de febreros bisiestos", () => {
    expect(ultimoDiaDelMes(new Date("2028-02-10T00:00:00Z")).toISOString().slice(0, 10)).toBe("2028-02-29");
    expect(ultimoDiaDelMes(new Date("2026-11-05T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-11-30");
  });
});
