import { describe, expect, it } from "vitest";
import { nivelRango, normalizarRango, puedeCambiarRango, puedeEditarClan, puedeExpulsar, puedeInvitar, sucesorDelLider } from "../src/lib/clanRangos";

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

  it("el liderazgo pasa al colíder más antiguo; si no hay, al de más rango y más antiguo", () => {
    const m = (userId: string, role: string, joinedAt: string) => ({ userId, role, joinedAt });
    const lider = m("L", "owner", "2026-01-01");
    expect(sucesorDelLider([lider], "L")).toBeNull();
    expect(sucesorDelLider([lider, m("a", "member", "2026-01-02"), m("b", "colider", "2026-05-01"), m("c", "colider", "2026-03-01")], "L")?.userId).toBe("c");
    expect(sucesorDelLider([lider, m("a", "member", "2026-01-02"), m("v", "veterano", "2026-06-01")], "L")?.userId).toBe("v");
    expect(sucesorDelLider([lider, m("a", "member", "2026-04-02"), m("b", "member", "2026-02-02")], "L")?.userId).toBe("b");
  });
});
