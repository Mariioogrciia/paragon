import { describe, expect, it } from "vitest";
import { esElMismoJuego, mismoTitulo, salioEn } from "@/lib/mismoTitulo";

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
    expect(mismoTitulo("DIRT5", "Dirt 5")).toBe(true);
    expect(mismoTitulo("Tearaway™ PS Vita", "Tearaway")).toBe(true);
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
    // Auditoría (17 nov 2026): «complete» suelto igualaba sagas distintas.
    expect(mismoTitulo("LEGO Star Wars: The Complete Saga", "LEGO Star Wars: The Skywalker Saga")).toBe(false);
    // Los que sí eran de otro juego, según el log del despliegue.
    expect(mismoTitulo("The Forest", "Märchen Forest: Mylne and the Forest Gift")).toBe(false);
    expect(mismoTitulo("Among Us", "The Wolf Among Us: Episode 1 - Faith")).toBe(false);
    expect(mismoTitulo("Batman: Arkham Asylum GOTY Edition", "Batman: Arkham Knight - 2008 Movie Batman Skin")).toBe(false);
    expect(mismoTitulo("Path of Exile", "Path of Exile 2")).toBe(false);
    expect(mismoTitulo("Fall Guys", "Fall Guys: Free Range Fall Guys Pack")).toBe(false);
    expect(mismoTitulo("Warframe", "Warframe: Nyx Warframe")).toBe(false);
  });
});

describe("esElMismoJuego", () => {
  it("vale el título sin un subtítulo de una palabra, no de más", () => {
    expect(esElMismoJuego(["Hollow Knight"], "Hollow Knight: Voidheart Edition")).toBe(true);
    expect(esElMismoJuego(["Call of Duty"], "Call of Duty®: Modern Warfare® II - Open Beta")).toBe(false);
    expect(esElMismoJuego(["Batman"], "Batman: Arkham Knight")).toBe(false);
    expect(esElMismoJuego(["Operation"], "Operation: Tango - Demo")).toBe(false);
    expect(esElMismoJuego(["Kingdom Come"], "Kingdom Come: Deliverance II")).toBe(false);
  });

  it("mira también los nombres alternativos", () => {
    expect(esElMismoJuego(["Middle-earth: Shadow of War", "La Tierra Media: Sombras de Guerra"], "La Tierra Media™: Sombras de Guerra™")).toBe(true);
  });
});

describe("salioEn", () => {
  it("distingue por familia de plataforma, y sin datos lo da por bueno", () => {
    expect(salioEn(["PS2"], "psn")).toBe(false);
    expect(salioEn(["PS4", "PC"], "psn")).toBe(true);
    expect(salioEn(["PC"], "steam")).toBe(true);
    expect(salioEn([], "psn")).toBe(true);
    expect(salioEn(undefined, "retro")).toBe(true);
  });
});
