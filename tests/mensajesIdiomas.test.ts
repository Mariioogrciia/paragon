import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NAMESPACES } from "../messages/manifest";
import { locales } from "@/i18n/request";

/**
 * Cada namespace de messages/ tiene que estar en todos los idiomas con las
 * mismas claves y los mismos huecos ({n}, {handle}...) que el español
 * (22 oct 2026, al añadir italiano y portugués): una clave que falta sale
 * como "Namespace.clave" en la web, y un hueco mal escrito revienta el texto.
 */

type Arbol = { [clave: string]: string | Arbol };

function hojas(arbol: Arbol, prefijo = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(arbol)) {
    const ruta = prefijo ? `${prefijo}.${k}` : k;
    if (typeof v === "string") out.set(ruta, v);
    else for (const [rk, rv] of hojas(v, ruta)) out.set(rk, rv);
  }
  return out;
}

/** Nombres de los argumentos ICU de primer nivel: "{n, plural, ...}" → n. */
function argumentos(texto: string): string[] {
  const nombres = new Set<string>();
  let nivel = 0;
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] === "{") {
      if (nivel === 0) {
        const m = /^\{\s*([A-Za-z_][\w]*)/.exec(texto.slice(i));
        if (m) nombres.add(m[1]);
      }
      nivel++;
    } else if (texto[i] === "}") nivel = Math.max(0, nivel - 1);
  }
  return [...nombres].sort();
}

const leer = (ns: string, idioma: string): Arbol => JSON.parse(readFileSync(join(__dirname, "..", "messages", ns, `${idioma}.json`), "utf8"));

describe("mensajes en todos los idiomas", () => {
  for (const ns of NAMESPACES) {
    const base = hojas(leer(ns, "es"));
    for (const idioma of locales.filter((l) => l !== "es")) {
      it(`${ns}/${idioma}.json tiene las mismas claves y huecos que es.json`, () => {
        const otro = hojas(leer(ns, idioma));
        expect([...base.keys()].filter((k) => !otro.has(k)), "claves que faltan").toEqual([]);
        expect([...otro.keys()].filter((k) => !base.has(k)), "claves que sobran").toEqual([]);
        const malos = [...base].filter(([k, v]) => otro.has(k) && argumentos(v).join() !== argumentos(otro.get(k)!).join()).map(([k]) => k);
        expect(malos, "huecos distintos").toEqual([]);
      });
    }
  }
});
