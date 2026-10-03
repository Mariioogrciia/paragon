import { describe, expect, it } from "vitest";
import { BUSQUEDA_VIDEO, CODIGO_PLATAFORMA, IDIOMAS, IDIOMA_BASE, esIdioma } from "@/lib/idiomasTrofeo";
import { rarity } from "@/lib/design";

describe("idiomas de trofeos", () => {
  it("reconoce solo los cuatro idiomas de la interfaz", () => {
    for (const i of IDIOMAS) expect(esIdioma(i)).toBe(true);
    for (const raro of ["pt", "es-ES", "", null, undefined, 3]) expect(esIdioma(raro)).toBe(false);
  });

  it("cada plataforma que se pide por servidor tiene un código para cada idioma", () => {
    for (const plataforma of ["psn", "xbox", "steam"]) {
      for (const idioma of IDIOMAS) expect(CODIGO_PLATAFORMA[plataforma]?.[idioma]).toBeTruthy();
    }
  });

  it("Epic y manual no se piden por servidor (no tienen código)", () => {
    expect(CODIGO_PLATAFORMA.epic).toBeUndefined();
    expect(CODIGO_PLATAFORMA.manual).toBeUndefined();
  });

  it("el idioma base coincide con lo guardado (PSN/Xbox en inglés, Steam/Epic en español)", () => {
    expect(IDIOMA_BASE).toEqual({ psn: "en", xbox: "en", steam: "es", epic: "es" });
  });

  it("las búsquedas de vídeo llevan región, idioma y la palabra «guía» de cada idioma", () => {
    expect(BUSQUEDA_VIDEO.es).toEqual({ hl: "es", gl: "ES", guia: "guía" });
    expect(BUSQUEDA_VIDEO.de.guia).toBe("Anleitung");
    for (const idioma of IDIOMAS) expect(BUSQUEDA_VIDEO[idioma].hl).toBe(idioma);
  });
});

describe("etiqueta de rareza por idioma", () => {
  it("mismos cortes en todos los idiomas, texto del idioma", () => {
    expect(rarity(3, "es").label).toBe("Ultra raro");
    expect(rarity(3, "en").label).toBe("Ultra rare");
    expect(rarity(10, "de").label).toBe("Sehr selten");
    expect(rarity(30, "fr").label).toBe("Rare");
    expect(rarity(70, "en").label).toBe("Common");
  });

  it("sin idioma, o con uno desconocido, cae en español como siempre", () => {
    expect(rarity(3).label).toBe("Ultra raro");
    expect(rarity(3, "pt").label).toBe("Ultra raro");
  });
});
