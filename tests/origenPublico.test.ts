import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guardia (17 nov 2026): en Cloud Run, `request.url` y `nextUrl` llevan la
 * dirección interna del contenedor (http://0.0.0.0:8080). Una redirección o
 * una URL de vuelta construida con ellas manda al navegador a una dirección
 * imposible (ERR_ADDRESS_INVALID). Next no tiene un ajuste para cambiarlo:
 * hay que usar `origenPublico` / `urlPublica` (lib/site.ts).
 */
function ficheros(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n);
    return statSync(ruta).isDirectory() ? ficheros(ruta) : /\.(ts|tsx)$/.test(n) ? [ruta] : [];
  });
}

const PROHIBIDOS: [RegExp, string][] = [
  [/redirect\(\s*new URL\([^)]*,\s*(req|request)\.url\s*\)/, "NextResponse.redirect(new URL(x, req.url))"],
  [/new URL\(\s*(req|request)\.url\s*\)\.origin/, "new URL(req.url).origin"],
  [/redirect\(\s*(req|request)\.nextUrl\.clone\(\)/, "redirect(req.nextUrl.clone())"],
];

describe("URLs públicas", () => {
  it("nadie construye redirecciones con la dirección interna de la petición", () => {
    const malos: string[] = [];
    // lib/site.ts es el único sitio donde se permite: ahí se decide el origen público (en local, el de la petición).
    for (const f of ficheros(join(process.cwd(), "src")).filter((f) => !f.endsWith(join("lib", "site.ts")))) {
      const texto = readFileSync(f, "utf8");
      for (const [re, que] of PROHIBIDOS) if (re.test(texto)) malos.push(`${f}: ${que}`);
      // nextUrl.clone() seguido de una redirección con ese mismo objeto.
      if (/nextUrl\.clone\(\)[\s\S]{0,200}NextResponse\.redirect\(url/.test(texto)) malos.push(`${f}: nextUrl.clone() + redirect`);
    }
    expect(malos).toEqual([]);
  });
});
