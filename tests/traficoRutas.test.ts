import { describe, expect, it } from "vitest";
import { esBot, esMovil, normalizarRuta, origenDe } from "@/lib/traficoRutas";

describe("normalizarRuta", () => {
  it("agrupa las páginas con parte variable", () => {
    expect(normalizarRuta("/u/fende21")).toBe("/u/[handle]");
    expect(normalizarRuta("/u/fende21/")).toBe("/u/[handle]");
    expect(normalizarRuta("/u/fende21/biblioteca?orden=az")).toBe("/u/[handle]/biblioteca");
    expect(normalizarRuta("/u/fende21/psn-NPWR123")).toBe("/u/[handle]/[juego]");
    expect(normalizarRuta("/u/fende21/wrap/horas")).toBe("/u/[handle]/wrap");
    expect(normalizarRuta("/juego/1942")).toBe("/juego/[id]");
    expect(normalizarRuta("/esports/partido/123")).toBe("/esports/partido/[id]");
  });

  it("deja las fijas y descarta lo que no se cuenta", () => {
    expect(normalizarRuta("/")).toBe("/");
    expect(normalizarRuta("/descubrir/steam")).toBe("/descubrir/steam");
    expect(normalizarRuta("/admin?tab=system")).toBeNull();
    expect(normalizarRuta("/api/v")).toBeNull();
    expect(normalizarRuta("/movil/entrar/google")).toBeNull();
    expect(normalizarRuta("/logo.png")).toBeNull();
    expect(normalizarRuta("https://otro.com/x")).toBeNull();
  });
});

describe("origenDe", () => {
  it("separa entradas de fuera, directas y navegación interna", () => {
    expect(origenDe("https://www.google.com/")).toBe("google.com");
    expect(origenDe("https://t.co/abc")).toBe("t.co");
    expect(origenDe("")).toBe("directo");
    expect(origenDe("no es url")).toBe("directo");
    expect(origenDe("https://www.paragontrophies.com/descubrir")).toBeNull();
    expect(origenDe("https://platinos-nine.vercel.app/")).toBeNull();
  });
});

describe("bots y móviles", () => {
  it("reconoce rastreadores y móviles", () => {
    expect(esBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(esBot(undefined)).toBe(true);
    expect(esBot("Mozilla/5.0 (Windows NT 10.0) Chrome/130")).toBe(false);
    expect(esMovil("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)")).toBe(true);
    expect(esMovil("Mozilla/5.0 (Windows NT 10.0)")).toBe(false);
  });
});
