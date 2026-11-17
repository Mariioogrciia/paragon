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
    expect(mismoTitulo("Minecraft: PlayStation®4 Edition", "Minecraft")).toBe(true);
    expect(mismoTitulo("The Forest", "The Forest")).toBe(true);
    expect(mismoTitulo("Ratchet & Clank: Rift Apart", "Ratchet and Clank: Rift Apart")).toBe(true);
    expect(mismoTitulo("NieR:Automata™", "NieR: Automata")).toBe(true);
    // Los que el primer despliegue deshizo siendo buenos (16 nov 2026).
    expect(mismoTitulo("The Elder Scrolls IV: Oblivion Game of the Year Edition (2009)", "The Elder Scrolls IV: Oblivion")).toBe(true);
    expect(mismoTitulo("PICO PARK:Classic Edition", "Pico Park")).toBe(true);
    expect(mismoTitulo("Vigor Trophy Set", "Vigor")).toBe(true);
    expect(mismoTitulo("Minecraft for PlayStation®", "Minecraft: PlayStation 4 Edition")).toBe(true);
  });

  it("rechaza otro juego", () => {
    expect(mismoTitulo("Celeste", "Hollow Knight")).toBe(false);
    expect(mismoTitulo("Stray", "Stray Souls")).toBe(false);
    expect(mismoTitulo("Astro Bot", "Astro Bot Rescue Mission")).toBe(false);
    expect(mismoTitulo("Gran Turismo 7", "Grand Theft Auto V")).toBe(false);
    expect(mismoTitulo("Spider-Man", "Spider-Man: Miles Morales")).toBe(false);
    expect(mismoTitulo("FIFA 23", "FIFA 22")).toBe(false);
    expect(mismoTitulo("The Forest", "Sons of the Forest")).toBe(false);
    expect(mismoTitulo("The Forest", "The Forest Quartet")).toBe(false);
    // Los que sí eran de otro juego, según el log del despliegue.
    expect(mismoTitulo("The Forest", "Märchen Forest: Mylne and the Forest Gift")).toBe(false);
    expect(mismoTitulo("Among Us", "The Wolf Among Us: Episode 1 - Faith")).toBe(false);
    expect(mismoTitulo("Batman: Arkham Asylum GOTY Edition", "Batman: Arkham Knight - 2008 Movie Batman Skin")).toBe(false);
    expect(mismoTitulo("Path of Exile", "Path of Exile 2")).toBe(false);
    expect(mismoTitulo("Fall Guys", "Fall Guys: Free Range Fall Guys Pack")).toBe(false);
    expect(mismoTitulo("Warframe", "Warframe: Nyx Warframe")).toBe(false);
  });
});
