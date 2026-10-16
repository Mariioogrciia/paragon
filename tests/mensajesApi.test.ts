import { describe, expect, it } from "vitest";
import { traducirMensaje } from "@/lib/mensajesApi";

describe("traducirMensaje (API móvil)", () => {
  it("en español no toca nada", () => {
    expect(traducirMensaje("No autenticado", "es")).toBe("No autenticado");
  });
  it("traduce los textos fijos", () => {
    expect(traducirMensaje("No autenticado", "en")).toBe("Not signed in");
    expect(traducirMensaje("Liga no encontrada", "de")).toBe("Liga nicht gefunden");
  });
  it("traduce los que llevan un nombre dentro", () => {
    expect(traducirMensaje('PSN no encuentra ningún perfil con el ID "pepe_99".', "fr")).toBe("PSN ne trouve aucun profil avec l'ID « pepe_99 ».");
    expect(traducirMensaje("Como mucho 2000 caracteres.", "en")).toBe("2000 characters at most.");
  });
  it("lo desconocido sale tal cual", () => {
    expect(traducirMensaje("Algo nuevo que nadie tradujo", "en")).toBe("Algo nuevo que nadie tradujo");
  });
});
