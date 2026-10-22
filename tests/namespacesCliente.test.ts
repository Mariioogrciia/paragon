import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// El mismo chequeo que la CI: src/i18n/textosPorRuta.ts está al día con el
// código (cada useTranslations alcanzable desde cada sección) y cada sección
// con textos lleva su <TextosRuta>.
describe("textos por ruta", () => {
  it("el archivo generado está al día", () => {
    const r = spawnSync("npx", ["tsx", "scripts/textos-por-ruta.mts", "--comprobar"], { encoding: "utf8" });
    expect(r.stderr.trim()).toBe("");
    expect(r.status).toBe(0);
  }, 120_000);
});
