import { describe, expect, it } from "vitest";
import { clasificarRespuesta, fallanTodas, textoProblema } from "@/lib/vigilanciaReglas";

describe("clasificarRespuesta", () => {
  it("clave rechazada, cupo y nada que avisar", () => {
    expect(clasificarRespuesta("steam", 403)).toBe("clave");
    expect(clasificarRespuesta("xbox", 401)).toBe("clave");
    expect(clasificarRespuesta("xbox", 429)).toBe("cupo");
    expect(clasificarRespuesta("igdb", 400)).toBe("clave");
    expect(clasificarRespuesta("steam", 400)).toBeNull();
    expect(clasificarRespuesta("steam", 200)).toBeNull();
  });

  it("una caída suya o un fallo de red no se avisa", () => {
    expect(clasificarRespuesta("steam", 503)).toBeNull();
    expect(clasificarRespuesta("xbox", null)).toBeNull();
  });
});

describe("fallanTodas", () => {
  it("solo si fallan todas y son al menos dos", () => {
    expect(fallanTodas([{ error: "boom" }, { error: "otro" }])).toBe("boom");
    expect(fallanTodas([{ error: "boom" }, {}])).toBeNull();
    expect(fallanTodas([{ error: "boom" }])).toBeNull();
    expect(fallanTodas([])).toBeNull();
  });
});

describe("textoProblema", () => {
  it("dice qué variable tocar", () => {
    expect(textoProblema("steam", "falta").titulo).toContain("STEAM_API_KEY");
    expect(textoProblema("xbox", "cupo").titulo).toContain("Cupo");
  });
});
