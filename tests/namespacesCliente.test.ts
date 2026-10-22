import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// El mismo chequeo que scripts/comprobar-namespaces-cliente.mts (una sola
// fuente): cada `useTranslations("X")` y, cuando "X" solo se manda en parte,
// cada `t("parte.clave")` tiene que llegar al navegador.
describe("NAMESPACES_CLIENTE", () => {
  it("cubre todos los useTranslations del código", () => {
    const r = spawnSync("npx", ["tsx", "scripts/comprobar-namespaces-cliente.mts"], { encoding: "utf8" });
    expect(r.stderr.trim()).toBe("");
    expect(r.status).toBe(0);
  }, 60_000);
});
