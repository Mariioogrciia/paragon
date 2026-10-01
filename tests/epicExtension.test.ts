import { describe, expect, it } from "vitest";
import { EpicPayloadError, imagenDeEpic, parsearDatosEpic } from "@/lib/epic/extensionData";
import { bibliotecaDesdeResumenes, logrosDesdeDatos } from "@/lib/epic/client";
import { esDeclarada, puntuables } from "@/lib/declarado";
import { esPlatinoEquivalente } from "@/lib/stats";
import { paragonProgress } from "@/lib/level";
import type { Game } from "@/lib/types";

// Forma real de lo que lee extension/epic.js en una cuenta de verdad
// (Rocket League 53/88, 1 oct 2026), recortada a lo necesario.
const SANDBOX = "9773aa1aa54f4f7b80e44bef04986cea";
const ID = "928fe04da2d74728bf4a85e819bf3f28";

function payload() {
  return {
    epicAccountId: ID,
    displayName: "LaGreña69",
    avatarUrl: "https://shared-static-prod.epicgames.com/epic-profile-icon/7B009C/L/icon.png?size=128",
    resumenes: [
      {
        sandboxId: SANDBOX,
        totalUnlocked: 53,
        totalXP: 600,
        product: { name: "Rocket League®", slug: "rocket-league" },
        productAchievements: { totalAchievements: 88 },
        baseOfferForSandbox: {
          keyImages: [
            { url: `https://cdn1.epicgames.com/offer/${SANDBOX}/tall`, type: "OfferImageTall" },
            { url: "https://evil.example.com/tracker.png", type: "Thumbnail" },
          ],
        },
      },
    ],
    detalles: [
      {
        sandboxId: SANDBOX,
        catalogo: [
          { name: "0", hidden: false, unlockedDisplayName: "Virtuoso", lockedDisplayName: "Virtuoso", unlockedDescription: "Desbloquear todos los trofeos", lockedDescription: "Desbloquear todos los trofeos", unlockedIconLink: "https://shared-static-prod.epicgames.com/x/icons/a", lockedIconLink: "https://shared-static-prod.epicgames.com/x/icons/b", XP: 100, tier: { name: "gold" }, rarity: { percent: 0.1 } },
          { name: "1", hidden: false, unlockedDisplayName: "Abastecido", lockedDisplayName: "Abastecido", unlockedDescription: "Reúne 150 artículos", lockedDescription: "Reúne 150 artículos", XP: 50, tier: { name: "silver" }, rarity: { percent: 35 } },
        ],
        jugador: [{ achievementName: "1", unlocked: true, unlockDate: "2025-08-23T22:22:23.538Z", XP: 50 }],
      },
    ],
  };
}

describe("parsearDatosEpic", () => {
  it("acepta la forma real y la deja en el formato que espera el servidor", () => {
    const d = parsearDatosEpic(payload());
    expect(d.epicAccountId).toBe(ID);
    expect(d.displayName).toBe("LaGreña69");
    expect(d.resumenes).toHaveLength(1);
    expect(d.detalles.get(SANDBOX)?.catalogo.size).toBe(2);
  });

  it("descarta las imágenes que no son de Epic (rastreadores) sin fallar", () => {
    const d = parsearDatosEpic(payload());
    const urls = d.resumenes[0].baseOfferForSandbox?.keyImages?.map((i) => i.url) ?? [];
    expect(urls).toEqual([`https://cdn1.epicgames.com/offer/${SANDBOX}/tall`]);
  });

  it("solo acepta imágenes https de dominios de Epic", () => {
    expect(imagenDeEpic("https://cdn1.epicgames.com/a.png")).toBeDefined();
    expect(imagenDeEpic("https://epicgames.com.evil.io/a.png")).toBeUndefined();
    expect(imagenDeEpic("http://cdn1.epicgames.com/a.png")).toBeUndefined();
    expect(imagenDeEpic("javascript:alert(1)")).toBeUndefined();
    expect(imagenDeEpic(42)).toBeUndefined();
  });

  it("rechaza un ID de cuenta que no es el de Epic (32 hex)", () => {
    expect(() => parsearDatosEpic({ ...payload(), epicAccountId: "no-soy-un-id" })).toThrow(EpicPayloadError);
    expect(() => parsearDatosEpic(null)).toThrow(EpicPayloadError);
    expect(() => parsearDatosEpic({ ...payload(), resumenes: "nada" })).toThrow(EpicPayloadError);
  });

  it("ignora el detalle de juegos que no están en la biblioteca enviada", () => {
    const p = payload();
    p.detalles.push({ ...p.detalles[0], sandboxId: "otro-juego-suelto" });
    expect(parsearDatosEpic(p).detalles.size).toBe(1);
  });

  it("recorta números absurdos y normaliza tipos", () => {
    const p = payload();
    p.resumenes[0].totalUnlocked = 9e12;
    p.detalles[0].catalogo[0].rarity = { percent: 5000 };
    const d = parsearDatosEpic(p);
    expect(d.resumenes[0].totalUnlocked).toBeLessThanOrEqual(100_000);
    expect(d.detalles.get(SANDBOX)!.catalogo.get("0")!.rarity!.percent).toBe(100);
  });

  it("no acepta más de 500 juegos en una sola sincronización", () => {
    const p = payload();
    p.resumenes = Array.from({ length: 501 }, (_, i) => ({ ...payload().resumenes[0], sandboxId: `s${i}` }));
    expect(() => parsearDatosEpic(p)).toThrow(EpicPayloadError);
  });
});

describe("de lo enviado a biblioteca y logros", () => {
  it("la biblioteca sale con el progreso real (53/88 = 60 %)", () => {
    const [juego] = bibliotecaDesdeResumenes(parsearDatosEpic(payload()).resumenes);
    expect(juego.id).toBe(`epic-${SANDBOX}`);
    expect(juego.platform).toBe("epic");
    expect(juego.earnedTotal).toBe(53);
    expect(juego.definedTotal).toBe(88);
    expect(juego.progressPercent).toBe(60);
  });

  it("cruza catálogo y estado del jugador", () => {
    const { catalogo, jugador } = parsearDatosEpic(payload()).detalles.get(SANDBOX)!;
    const logros = logrosDesdeDatos(catalogo, jugador);
    expect(logros).toHaveLength(2);
    expect(logros.find((l) => l.id === "1")?.earned).toBe(true);
    expect(logros.find((l) => l.id === "0")?.earned).toBe(false);
    expect(logros.find((l) => l.id === "0")?.grade).toBe("gold");
  });
});

describe("progreso declarado: Epic no puntúa", () => {
  const epic100: Game = {
    id: "epic-x", platform: "epic", title: "Epic al 100", deviceLabel: "PC",
    progressPercent: 100, definedTotal: 10, earnedTotal: 10, epicTrophyXp: 5000,
  } as Game;
  const steam100: Game = { ...epic100, id: "steam-1", platform: "steam", epicTrophyXp: undefined } as Game;

  it("epic es declarada; las demás no", () => {
    expect(esDeclarada("epic")).toBe(true);
    for (const p of ["psn", "steam", "xbox", "manual", null, undefined]) expect(esDeclarada(p)).toBe(false);
  });

  it("un 100 % de Epic NO vale como platino, el de Steam sí", () => {
    expect(esPlatinoEquivalente(epic100)).toBe(false);
    expect(esPlatinoEquivalente(steam100)).toBe(true);
  });

  it("no suma nada al nivel Paragon, ni XP de logros ni 'completado'", () => {
    expect(paragonProgress([epic100]).breakdown.total).toBe(0);
    expect(paragonProgress([epic100, steam100]).breakdown.total).toBe(paragonProgress([steam100]).breakdown.total);
  });

  it("puntuables() quita Epic y respeta el resto", () => {
    expect(puntuables([epic100, steam100]).map((g) => g.platform)).toEqual(["steam"]);
  });
});
