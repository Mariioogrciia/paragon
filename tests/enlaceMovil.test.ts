import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { cifrarParaApp, claveDeEnlaceValida, descifrarEnApp } from "@/lib/enlaceMovil";

const clave = () => randomBytes(32).toString("base64url");

describe("enlace seguro con la app Android", () => {
  it("la app recupera el token con su clave", () => {
    const k = clave();
    const token = "4f1c2d3e-aaaa-bbbb-cccc-1234567890ab";
    expect(descifrarEnApp(cifrarParaApp(token, k), k)).toBe(token);
  });

  it("con otra clave no se puede descifrar (enlace interceptado o fabricado)", () => {
    const c = cifrarParaApp("token-secreto", clave());
    expect(() => descifrarEnApp(c, clave())).toThrow();
  });

  it("cada cifrado es distinto aunque el token sea el mismo", () => {
    const k = clave();
    expect(cifrarParaApp("t", k)).not.toBe(cifrarParaApp("t", k));
  });

  it("solo acepta claves de 32 bytes en base64url", () => {
    expect(claveDeEnlaceValida(clave())).toBe(true);
    expect(claveDeEnlaceValida("corta")).toBe(false);
    expect(claveDeEnlaceValida(`${clave().slice(0, 42)}=`)).toBe(false);
    expect(claveDeEnlaceValida(undefined)).toBe(false);
  });
});
