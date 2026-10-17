import { describe, expect, it } from "vitest";
import { textosDm } from "@/lib/textosDiscord";
import { IDIOMAS } from "@/lib/idiomasTrofeo";

describe("textosDm", () => {
  it("cada idioma tiene todos los textos, con los datos dentro", () => {
    for (const idioma of IDIOMAS) {
      const t = textosDm(idioma);
      expect(t.nivelTitulo(12)).toContain("12");
      expect(t.platinoTitulo("Elden Ring")).toContain("Elden Ring");
      expect(t.trofeosTitulo("Elden Ring", 3)).toContain("3");
      expect(t.ligaTexto("Ana", "Los de siempre")).toContain("**Los de siempre**");
      expect(t.conectadoTitulo.length).toBeGreaterThan(0);
    }
  });

  it("singular y plural", () => {
    expect(textosDm("en").trofeosTitulo("Hades", 1)).toBe("🎮 Hades — 1 new trophy");
    expect(textosDm("de").trofeosTitulo("Hades", 4)).toBe("🎮 Hades — 4 neue Trophäen");
    expect(textosDm("es").masTrofeos(2)).toBe("… y 2 más");
  });
});
