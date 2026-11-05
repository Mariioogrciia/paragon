import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fechaRetro, fetchAchievements, fetchLibrary, resolveProfile, RetroNotFoundError } from "@/lib/retro/client";

const respuestas = new Map<string, unknown>();
beforeEach(() => {
  process.env.RA_API_KEY = "clave";
  process.env.RA_API_USER = "paragon";
  vi.stubGlobal("fetch", async (url: string) => {
    const endpoint = new URL(url).pathname.split("/").pop()!.replace(".php", "");
    const cuerpo = respuestas.get(endpoint);
    return cuerpo === undefined ? new Response("", { status: 404 }) : Response.json(cuerpo);
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  respuestas.clear();
});

describe("RetroAchievements", () => {
  it("convierte sus fechas UTC sin zona a ISO", () => {
    expect(fechaRetro("2024-03-01 18:22:10")).toBe("2024-03-01T18:22:10.000Z");
    expect(fechaRetro(null)).toBeUndefined();
  });

  it("resuelve el perfil por su ULID y falla claro si no existe", async () => {
    respuestas.set("API_GetUserProfile", { User: "Mario", ULID: "00003EMFWR7XB8SDPEHB3K56ZQ", UserPic: "/UserPic/Mario.png" });
    expect(await resolveProfile("https://retroachievements.org/user/Mario")).toEqual({ usuario: "Mario", id: "00003EMFWR7XB8SDPEHB3K56ZQ", avatarUrl: "https://media.retroachievements.org/UserPic/Mario.png" });
    respuestas.clear();
    await expect(resolveProfile("nadie")).rejects.toBeInstanceOf(RetroNotFoundError);
  });

  it("biblioteca con progreso (hardcore o softcore, el mayor)", async () => {
    respuestas.set("API_GetUserCompletionProgress", {
      Total: 2,
      Results: [
        { GameID: 1, Title: "Sonic", ImageIcon: "/Images/1.png", ConsoleName: "Mega Drive", MaxPossible: 20, NumAwarded: 5, NumAwardedHardcore: 10, MostRecentAwardedDate: "2026-01-02T10:00:00+00:00" },
        { GameID: 2, Title: "Sin logros", MaxPossible: 0 },
      ],
    });
    const juegos = await fetchLibrary("Mario");
    expect(juegos).toHaveLength(1);
    expect(juegos[0]).toMatchObject({ id: "retro-1", platform: "retro", deviceLabel: "Mega Drive", progressPercent: 50, earnedTotal: 10, definedTotal: 20 });
  });

  it("logros con rareza, perdibles y la fecha más antigua", async () => {
    respuestas.set("API_GetGameInfoAndUserProgress", {
      NumDistinctPlayers: 200,
      Achievements: {
        "9": { ID: 9, Title: "B", DisplayOrder: 2, NumAwarded: 20, BadgeName: "123", type: "missable" },
        "8": { ID: 8, Title: "A", DisplayOrder: 1, NumAwarded: 100, DateEarned: "2026-01-05 10:00:00", DateEarnedHardcore: "2026-01-03 10:00:00", Points: 5 },
      },
    });
    const logros = await fetchAchievements("Mario", "1");
    expect(logros.map((l) => l.id)).toEqual(["8", "9"]);
    expect(logros[0]).toMatchObject({ earned: true, earnedAt: "2026-01-03T10:00:00.000Z", rarityPercent: 50, xp: 5 });
    expect(logros[1]).toMatchObject({ earned: false, isMissable: true, rarityPercent: 10, iconUrl: "https://media.retroachievements.org/Badge/123.png" });
  });
});
