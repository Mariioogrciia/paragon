import { describe, expect, it } from "vitest";
import { platinables } from "@/lib/platinables";
import type { Game } from "@/lib/types";

const AHORA = new Date("2026-11-08T12:00:00Z").getTime();
const hace = (dias: number) => new Date(AHORA - dias * 86_400_000).toISOString();

function juego(id: string, o: Partial<Game> & { def: number; gan: number; pct: number; dias?: number; platino?: boolean }): Game {
  return {
    id,
    platform: o.platform ?? "psn",
    title: id,
    definedTotal: o.def,
    earnedTotal: o.gan,
    progressPercent: o.pct,
    defined: { bronze: o.def - 1, silver: 0, gold: 0, platinum: o.platino === false ? 0 : 1 },
    earned: { bronze: o.gan, silver: 0, gold: 0, platinum: 0 },
    lastPlayedAt: o.dias === undefined ? undefined : hace(o.dias),
    isWishlist: o.isWishlist ?? false,
    hltb: o.hltb,
    playtimeMinutes: o.playtimeMinutes,
  } as Game;
}

describe("platinables", () => {
  it("cerca: lo que menos falta primero, también Steam (100 %) y sin los ya platinados, deseados ni sin empezar", () => {
    const { cerca } = platinables(
      [
        juego("a", { def: 40, gan: 37, pct: 92 }),
        juego("b", { def: 50, gan: 49, pct: 98, platform: "steam", platino: false }),
        juego("c", { def: 30, gan: 10, pct: 33 }),
        juego("hecho", { def: 20, gan: 20, pct: 100, platform: "steam", platino: false }),
        juego("deseado", { def: 20, gan: 19, pct: 95, isWishlist: true }),
        juego("nuevo", { def: 20, gan: 0, pct: 0 }),
      ],
      AHORA,
    );
    expect(cerca.map((p) => p.game.id)).toEqual(["b", "a"]);
    expect(cerca[0].faltan).toBe(1);
  });

  it("jugando: solo lo de los últimos 60 días, más avanzado y reciente primero", () => {
    const { jugando } = platinables(
      [
        juego("viejo", { def: 40, gan: 36, pct: 90, dias: 200 }),
        juego("semana", { def: 40, gan: 24, pct: 60, dias: 3 }),
        juego("mes", { def: 40, gan: 26, pct: 65, dias: 40 }),
        juego("casi", { def: 40, gan: 38, pct: 95, dias: 10 }),
        juego("poco", { def: 40, gan: 4, pct: 10, dias: 1 }),
      ],
      AHORA,
    );
    expect(jugando.map((p) => p.game.id)).toEqual(["casi", "semana", "mes"]);
    expect(jugando[1].diasDesdeJugado).toBe(3);
  });

  it("horas que quedan según HowLongToBeat menos lo jugado", () => {
    const { cerca } = platinables([juego("h", { def: 10, gan: 9, pct: 90, hltb: { completionist: 50 }, playtimeMinutes: 44 * 60 })], AHORA);
    expect(cerca[0].horasRestantes).toBe(6);
  });
});
