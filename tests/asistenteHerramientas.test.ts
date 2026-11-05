import { describe, expect, it } from "vitest";
import { ejecutarHerramienta, HERRAMIENTAS } from "@/lib/asistenteHerramientas";
import type { Game } from "@/lib/types";

const juego = (id: string, extra: Partial<Game>): Game =>
  ({ id, title: id, platform: "psn", progressPercent: 0, earnedTotal: 0, definedTotal: 10, isWishlist: false, ...extra }) as Game;

const ctx = {
  nivel: 12,
  racha: { actual: 3, mejor: 9 },
  games: [
    juego("Elden Ring", { progressPercent: 80, earnedTotal: 8, lastPlayedAt: "2026-11-01", playtimeMinutes: 6000 }),
    juego("Hades", { platform: "steam", progressPercent: 100, earnedTotal: 10 }),
    juego("Celeste", { earnedTotal: 0 }),
    juego("Deseado", { isWishlist: true }),
  ],
};

describe("herramientas del asistente", () => {
  it("todas son estrictas y sin propiedades extra", () => {
    for (const h of HERRAMIENTAS) {
      expect(h.strict).toBe(true);
      expect((h.input_schema as { additionalProperties?: boolean }).additionalProperties).toBe(false);
    }
  });

  it("buscar_juegos filtra por estado y plataforma, sin deseados", () => {
    const r = JSON.parse(ejecutarHerramienta("buscar_juegos", { texto: "", estado: "empezados", plataforma: "todas", orden: "progreso_desc", limite: 5 }, ctx).contenido);
    expect(r.juegos.map((j: { titulo: string }) => j.titulo)).toEqual(["Elden Ring"]);
    expect(r.juegos[0].horasJugadas).toBe(100);
    const steam = JSON.parse(ejecutarHerramienta("buscar_juegos", { texto: "", estado: "todos", plataforma: "steam", orden: "ultimo_jugado", limite: 50 }, ctx).contenido);
    expect(steam.total).toBe(1);
  });

  it("resumen con nivel y racha; desconocida da error sin lanzar", () => {
    const r = JSON.parse(ejecutarHerramienta("resumen_perfil", {}, ctx).contenido);
    expect(r).toMatchObject({ nivel: 12, racha: { actual: 3, mejor: 9 }, juegos: 3 });
    expect(ejecutarHerramienta("borrar_todo", {}, ctx).error).toBe(true);
  });
});
