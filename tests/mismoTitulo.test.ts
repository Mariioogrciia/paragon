import { describe, expect, it } from "vitest";
import { mismoTitulo } from "@/lib/mismoTitulo";

describe("mismoTitulo", () => {
  it("acepta el mismo juego con otras mayúsculas, símbolos o coletillas", () => {
    expect(mismoTitulo("Marvel's Spider-Man 2", "Marvel's Spider-Man 2")).toBe(true);
    expect(mismoTitulo("God of War Ragnarök", "God of War Ragnarok")).toBe(true);
    expect(mismoTitulo("Grand Theft Auto V (PS4)", "Grand Theft Auto V")).toBe(true);
    expect(mismoTitulo("Ghost of Tsushima Director's Cut", "Ghost of Tsushima")).toBe(true);
    expect(mismoTitulo("ELDEN RING™", "Elden Ring")).toBe(true);
    expect(mismoTitulo("The Last of Us™ Remastered", "The Last of Us")).toBe(true);
  });

  it("rechaza otro juego", () => {
    expect(mismoTitulo("Celeste", "Hollow Knight")).toBe(false);
    expect(mismoTitulo("Stray", "Stray Souls")).toBe(false);
    expect(mismoTitulo("Astro Bot", "Astro Bot Rescue Mission")).toBe(false);
    expect(mismoTitulo("Gran Turismo 7", "Grand Theft Auto V")).toBe(false);
    expect(mismoTitulo("Spider-Man", "Spider-Man: Miles Morales")).toBe(false);
    expect(mismoTitulo("FIFA 23", "FIFA 22")).toBe(false);
  });
});
