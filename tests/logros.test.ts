import { describe, expect, it } from "vitest";
import { LOGROS, LOGRO_POR_ID, logroConseguido, type MedidasLogros } from "@/lib/logros";
import { TITULOS, TITULO_POR_CLAVE, tituloDesbloqueado } from "@/lib/titulos";
import { paragonProgress } from "@/lib/level";
import es from "../messages/Perfil/es.json";
import en from "../messages/Perfil/en.json";
import de from "../messages/Perfil/de.json";
import fr from "../messages/Perfil/fr.json";

const cero: MedidasLogros = {
  pionero: 0, platinos: 0, juegos: 0, resenas: 0, amigos: 0, plataformas: 0, rpgs: 0, platinoRaro: 0,
  ultraRaros: 0, palmares: 0, guerras: 0, coop: 0, semanasPerfectas: 0, misiones: 0, temporadaMax: 0,
  guias: 0, sesiones: 0, nivel: 0, noctambulo: 0, maraton: 0,
};

describe("catálogo de insignias", () => {
  it("ids únicos", () => {
    expect(new Set(LOGROS.map((l) => l.id)).size).toBe(LOGROS.length);
  });
  it("cada insignia tiene nombre y descripción en los 4 idiomas", () => {
    for (const idioma of [es, en, de, fr]) {
      const items = idioma.Badges.items as Record<string, { name: string; description: string }>;
      for (const l of LOGROS) {
        expect(items[l.id]?.name, `${l.id}`).toBeTruthy();
        expect(items[l.id]?.description, `${l.id}`).toBeTruthy();
      }
    }
  });
  it("se consigue al llegar al objetivo, no antes", () => {
    const cazador = LOGRO_POR_ID.get("cazador")!;
    expect(logroConseguido(cazador, { ...cero, platinos: 9 })).toBe(false);
    expect(logroConseguido(cazador, { ...cero, platinos: 10 })).toBe(true);
  });
});

describe("títulos especiales", () => {
  it("cada título tiene texto en los 4 idiomas y su insignia existe", () => {
    for (const idioma of [es, en, de, fr]) {
      for (const t of TITULOS) expect((idioma.Titulos as Record<string, string>)[t.clave]).toBeTruthy();
    }
    for (const t of TITULOS) if ("insignia" in t.requisito) expect(LOGRO_POR_ID.has(t.requisito.insignia)).toBe(true);
  });
  it("por nivel y por insignia", () => {
    expect(tituloDesbloqueado(TITULO_POR_CLAVE.get("veterano")!, 24, [])).toBe(false);
    expect(tituloDesbloqueado(TITULO_POR_CLAVE.get("veterano")!, 25, [])).toBe(true);
    expect(tituloDesbloqueado(TITULO_POR_CLAVE.get("campeon")!, 100, [])).toBe(false);
    expect(tituloDesbloqueado(TITULO_POR_CLAVE.get("campeon")!, 1, ["campeon"])).toBe(true);
  });
});

describe("XP de misiones en el nivel", () => {
  it("suma al total y sale en el desglose", () => {
    const sin = paragonProgress([]);
    const con = paragonProgress([], 600);
    expect(con.xp - sin.xp).toBe(600);
    expect(con.breakdown.misiones).toBe(600);
    expect(con.level).toBeGreaterThan(sin.level);
  });
});
