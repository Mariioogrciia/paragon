import { describe, expect, it } from "vitest";
import { contieneLenguajeOfensivo } from "@/lib/contentFilter";

describe("contieneLenguajeOfensivo", () => {
  it.each(["maricon439", "puta_gg", "xx_fuck_xx", "subnormal2000"])("bloquea %s aunque vaya pegado a números o guiones bajos", (texto) =>
    expect(contieneLenguajeOfensivo(texto)).toBe(true),
  );

  it.each(["eres un gilipollas", "What the FUCK", "Du Arschloch", "quelle merde", "Scheiße!", "enculé", "coño"])(
    "bloquea %s",
    (texto) => expect(contieneLenguajeOfensivo(texto)).toBe(true),
  );

  // Falsos positivos que ya se evitaron a propósito: "con" (francés) y
  // "bite" (francés/inglés) son palabras normales en español o inglés.
  it.each(["Juego con amigos", "Cazador de platinos", "bite-sized", "Das nächste Platin", "Le prochain platine", "Scunthorpe", "", "computadora", "dickens", "Cockpit", "Hollow_Knight"])(
    "deja pasar %s",
    (texto) => expect(contieneLenguajeOfensivo(texto)).toBe(false),
  );
});
