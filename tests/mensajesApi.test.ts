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

describe("avisos de la bandeja", () => {
  it("traduce los más comunes y deja intactos los nombres", () => {
    expect(traducirMensaje("Ana quiere ser tu amigo en Paragon.", "en")).toBe("Ana wants to be your friend on Paragon.");
    expect(traducirMensaje("📉 Ana te ha adelantado en la liga", "fr")).toBe("📉 Ana t'a dépassé dans la ligue");
    expect(traducirMensaje("Ahora vas 3º de 12 en la liga del mes (40 puntos por detrás).", "en")).toBe(
      "You're now 3 of 12 in this month's league (40 points behind).",
    );
    expect(traducirMensaje("🏆 Ana ha sacado un platino", "de")).toBe("🏆 Ana hat ein Platin geholt");
    expect(traducirMensaje("5 trofeos nuevos", "de")).toBe("5 neue Trophäen");
    expect(traducirMensaje("🏆 ¡Platino conseguido!", "en")).toBe("🏆 Platinum earned!");
  });
});

