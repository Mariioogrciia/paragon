import { beforeAll, describe, expect, it } from "vitest";
import { firmarEnlace, verificarEnlace } from "@/lib/enlaceFirmado";

beforeAll(() => {
  process.env.AUTH_SECRET = "secreto-de-prueba";
});

describe("enlaces firmados", () => {
  it("vuelve el userId con la firma buena", () => {
    expect(verificarEnlace("calendario", firmarEnlace("calendario", "usuario-123"))).toBe("usuario-123");
  });

  it("no vale para otro propósito ni para otra persona", () => {
    const token = firmarEnlace("calendario", "usuario-123");
    expect(verificarEnlace("baja-correo", token)).toBeNull();
    const [, firma] = token.split(".");
    const ajeno = `${Buffer.from("usuario-456").toString("base64url")}.${firma}`;
    expect(verificarEnlace("calendario", ajeno)).toBeNull();
  });

  it("rechaza basura", () => {
    expect(verificarEnlace("calendario", "")).toBeNull();
    expect(verificarEnlace("calendario", "abc")).toBeNull();
    expect(verificarEnlace("calendario", "abc.def")).toBeNull();
  });
});
