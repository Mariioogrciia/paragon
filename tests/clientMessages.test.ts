import { describe, expect, it } from "vitest";
import { elegirMensajes, fusionarMensajes } from "@/i18n/clientMessages";
import { NAMESPACES_GLOBALES, NAMESPACES_POR_RUTA } from "@/i18n/textosPorRuta";

describe("elegirMensajes", () => {
  const todos = {
    Shell: { Header: { entrar: "Entrar" }, ComoFunciona: { largo: "texto de servidor" } },
    Admin: { titulo: "Admin" },
    Onboarding: { forms: { a: "b", c: "d" }, soloServidor: { largo: "texto" } },
  };

  it("se queda solo con lo de la lista, respetando el anidado", () => {
    expect(elegirMensajes(todos, ["Shell.Header", "Onboarding.forms.a"])).toEqual({
      Shell: { Header: { entrar: "Entrar" } },
      Onboarding: { forms: { a: "b" } },
    });
  });

  it("no incluye lo que no existe", () => {
    expect(elegirMensajes({}, ["Shell.Header"])).toEqual({});
  });
});

describe("fusionarMensajes (textos de la raíz + los de la sección)", () => {
  it("junta en profundidad sin tocar los originales", () => {
    const base = { Shell: { Header: { entrar: "Entrar" } } };
    const seccion = { Shell: { Footer: { pie: "Pie" } }, Perfil: { x: "y" } };
    expect(fusionarMensajes(base, seccion)).toEqual({ Shell: { Header: { entrar: "Entrar" }, Footer: { pie: "Pie" } }, Perfil: { x: "y" } });
    expect(base).toEqual({ Shell: { Header: { entrar: "Entrar" } } });
  });
});

describe("textosPorRuta (generado)", () => {
  it("sin duplicados en cada lista", () => {
    for (const lista of [NAMESPACES_GLOBALES, ...Object.values(NAMESPACES_POR_RUTA)]) {
      expect(new Set(lista).size).toBe(lista.length);
    }
  });
});
