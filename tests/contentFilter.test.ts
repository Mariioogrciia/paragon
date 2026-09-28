import { describe, expect, it } from "vitest";
import { contieneLenguajeOfensivo } from "@/lib/contentFilter";

describe("contieneLenguajeOfensivo", () => {
  it.each(["eres un gilipollas", "What the FUCK", "Du Arschloch", "quelle merde", "Scheiße!", "enculé", "coño"])(
    "bloquea %s",
    (texto) => expect(contieneLenguajeOfensivo(texto)).toBe(true),
  );

  // Falsos positivos que ya se evitaron a propósito: "con" (francés) y
  // "bite" (francés/inglés) son palabras normales en español o inglés.
  it.each(["Juego con amigos", "Cazador de platinos", "bite-sized", "Das nächste Platin", "Le prochain platine", "Scunthorpe", ""])(
    "deja pasar %s",
    (texto) => expect(contieneLenguajeOfensivo(texto)).toBe(false),
  );
});
