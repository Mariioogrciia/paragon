import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NAMESPACES_CLIENTE } from "@/i18n/clientMessages";

// Mismo chequeo que scripts/comprobar-namespaces-cliente.mts: si un
// `useTranslations("X")` no está cubierto, ese componente se queda sin
// textos en el navegador.
function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.(ts|tsx)$/.test(nombre) && !nombre.endsWith("clientMessages.ts") ? [ruta] : [];
  });
}

describe("NAMESPACES_CLIENTE", () => {
  it("cubre todos los useTranslations del código", () => {
    const sinCubrir: string[] = [];
    for (const archivo of archivos("src")) {
      for (const m of readFileSync(archivo, "utf8").matchAll(/useTranslations\("([^"]+)"\)/g)) {
        const ns = m[1];
        if (!NAMESPACES_CLIENTE.some((n) => ns === n || ns.startsWith(`${n}.`))) sinCubrir.push(`${archivo}: ${ns}`);
      }
    }
    expect(sinCubrir).toEqual([]);
  });
});
