import { describe, expect, it } from "vitest";
import { datosJuego, datosPerfil, datosSitio, serializarJsonLd } from "@/lib/datosEstructurados";

const D = "https://paragontrophies.com";

describe("datos estructurados", () => {
  it("el sitio usa el dominio que le pasan", () => {
    const s = datosSitio(D, ["https://github.com/x"]);
    expect(JSON.stringify(s)).toContain(`${D}/#sitio`);
    expect(JSON.stringify(s)).toContain("https://github.com/x");
  });

  it("perfil con su @handle y la url codificada", () => {
    const p = datosPerfil(D, { handle: "ana_99", nombre: null, imagen: null, descripcion: "x" });
    expect(p["@type"]).toBe("ProfilePage");
    expect((p.mainEntity as Record<string, unknown>).name).toBe("ana_99");
    expect((p.mainEntity as Record<string, unknown>).alternateName).toBe("@ana_99");
    expect((p.mainEntity as Record<string, unknown>).image).toBeUndefined();
  });

  const juego = {
    id: "1234",
    titulo: "Elden Ring",
    imagen: null,
    descripcion: null,
    desarrolladora: "FromSoftware",
    editora: null,
    generos: ["RPG"],
    plataformas: [],
    fechaSalida: null,
  };

  it("juego sin campos vacíos y sin nota con pocos votos", () => {
    const j = datosJuego(D, { ...juego, nota: { media: 4.5, votos: 2 } });
    expect(j).not.toHaveProperty("image");
    expect(j).not.toHaveProperty("gamePlatform");
    expect(j).not.toHaveProperty("aggregateRating");
    expect(j.author).toEqual({ "@type": "Organization", name: "FromSoftware" });
  });

  it("la nota sale con 3 votos o más, redondeada", () => {
    const j = datosJuego(D, { ...juego, nota: { media: 4.333, votos: 3 } });
    expect(j.aggregateRating).toMatchObject({ ratingValue: 4.3, ratingCount: 3, bestRating: 5 });
  });

  it("un </script> en un nombre no puede cerrar la etiqueta", () => {
    const texto = serializarJsonLd(datosPerfil(D, { handle: "x", nombre: "</script><script>alert(1)</script>", imagen: null, descripcion: "" }));
    expect(texto).not.toContain("</script>");
    expect(JSON.parse(texto).mainEntity.name).toBe("</script><script>alert(1)</script>");
  });
});
