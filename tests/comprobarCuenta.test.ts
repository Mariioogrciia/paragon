import { describe, expect, it } from "vitest";
import { armarDiagnostico, esPlataformaAsistente } from "@/lib/comprobarCuenta";

const base = { accountId: "1", username: "Panchito", avatarUrl: null, deOtro: false };

describe("armarDiagnostico", () => {
  it("Steam: perfil y detalles del juego en público = listo", () => {
    const d = armarDiagnostico("steam", { ...base, perfilPublico: true, legible: true });
    expect(d.comprobaciones).toEqual([
      { clave: "encontrada", ok: true },
      { clave: "perfilPublico", ok: true },
      { clave: "detallesJuego", ok: true },
    ]);
    expect(d.listo).toBe(true);
  });

  it("Steam: perfil público pero detalles del juego privados", () => {
    const d = armarDiagnostico("steam", { ...base, perfilPublico: true, legible: false });
    expect(d.comprobaciones.find((c) => c.clave === "detallesJuego")?.ok).toBe(false);
    expect(d.comprobaciones.find((c) => c.clave === "perfilPublico")?.ok).toBe(true);
    expect(d.listo).toBe(false);
  });

  it("Steam: con el perfil privado salen las dos en rojo", () => {
    const d = armarDiagnostico("steam", { ...base, perfilPublico: false, legible: false });
    expect(d.comprobaciones.filter((c) => !c.ok).map((c) => c.clave)).toEqual(["perfilPublico", "detallesJuego"]);
  });

  it("PSN y Xbox: una sola fila de visibilidad", () => {
    expect(armarDiagnostico("psn", { ...base, legible: false }).comprobaciones.map((c) => c.clave)).toEqual([
      "encontrada",
      "trofeosVisibles",
    ]);
    expect(armarDiagnostico("xbox", { ...base, legible: true }).listo).toBe(true);
  });

  it("una cuenta de otro usuario queda bloqueada aunque sea pública", () => {
    const d = armarDiagnostico("xbox", { ...base, legible: true, deOtro: true });
    expect(d.bloqueada).toBe(true);
    expect(d.listo).toBe(false);
    expect(d.comprobaciones[1]).toEqual({ clave: "libre", ok: false });
  });
});

describe("esPlataformaAsistente", () => {
  it("solo PSN, Steam y Xbox (Epic va con la extensión)", () => {
    expect(esPlataformaAsistente("steam")).toBe(true);
    expect(esPlataformaAsistente("epic")).toBe(false);
    expect(esPlataformaAsistente(3)).toBe(false);
  });
});
