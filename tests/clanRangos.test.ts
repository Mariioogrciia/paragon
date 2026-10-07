import { describe, expect, it } from "vitest";
import { nivelRango, normalizarRango, puedeCambiarRango, puedeEditarClan, puedeExpulsar, puedeInvitar } from "../src/lib/clanRangos";

describe("rangos de clan", () => {
  it("normaliza valores antiguos y desconocidos", () => {
    expect(normalizarRango("admin")).toBe("colider");
    expect(normalizarRango("raro")).toBe("member");
    expect(normalizarRango(null)).toBe("member");
    expect(nivelRango("owner")).toBeGreaterThan(nivelRango("colider"));
  });

  it("solo líder y colíder editan el clan; veterano también invita", () => {
    expect(puedeEditarClan("owner")).toBe(true);
    expect(puedeEditarClan("colider")).toBe(true);
    expect(puedeEditarClan("veterano")).toBe(false);
    expect(puedeEditarClan("member")).toBe(false);
    expect(puedeEditarClan(null)).toBe(false);
    expect(puedeInvitar("veterano")).toBe(true);
    expect(puedeInvitar("member")).toBe(false);
  });

  it("expulsar: solo a alguien de rango inferior, y nunca un veterano", () => {
    expect(puedeExpulsar("owner", "colider")).toBe(true);
    expect(puedeExpulsar("colider", "veterano")).toBe(true);
    expect(puedeExpulsar("colider", "colider")).toBe(false);
    expect(puedeExpulsar("colider", "owner")).toBe(false);
    expect(puedeExpulsar("veterano", "member")).toBe(false);
  });

  it("cambiar rango: el líder todo, el colíder solo entre veterano y miembro", () => {
    expect(puedeCambiarRango("owner", "member", "colider")).toBe(true);
    expect(puedeCambiarRango("owner", "colider", "owner")).toBe(true);
    expect(puedeCambiarRango("colider", "member", "veterano")).toBe(true);
    expect(puedeCambiarRango("colider", "veterano", "member")).toBe(true);
    expect(puedeCambiarRango("colider", "member", "colider")).toBe(false);
    expect(puedeCambiarRango("colider", "colider", "member")).toBe(false);
    expect(puedeCambiarRango("owner", "member", "member")).toBe(false);
    expect(puedeCambiarRango("veterano", "member", "veterano")).toBe(false);
  });
});
