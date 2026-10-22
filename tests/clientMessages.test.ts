import { describe, expect, it } from "vitest";
import { NAMESPACES_CLIENTE, mensajesCliente } from "@/i18n/clientMessages";

describe("mensajesCliente", () => {
  const todos = {
    Shell: { Header: { entrar: "Entrar" }, ComoFunciona: { largo: "texto de servidor" } },
    Admin: { titulo: "Admin" },
    // "Onboarding" va por partes: solo lo que usan los componentes de cliente.
    Onboarding: { forms: { a: "b" }, soloServidor: { largo: "texto" } },
  };

  it("se queda solo con los namespaces de la lista, respetando el anidado", () => {
    const elegidos = mensajesCliente(todos);
    expect(elegidos).toEqual({ Shell: { Header: { entrar: "Entrar" } }, Onboarding: { forms: { a: "b" } } });
  });

  it("no incluye namespaces que no existen", () => {
    expect(mensajesCliente({})).toEqual({});
  });

  it("la lista no tiene duplicados", () => {
    expect(new Set(NAMESPACES_CLIENTE).size).toBe(NAMESPACES_CLIENTE.length);
  });
});
