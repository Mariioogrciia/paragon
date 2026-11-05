import { beforeAll, describe, expect, it } from "vitest";
import { cifrar, descifrar } from "@/lib/cifrado";

beforeAll(() => {
  process.env.AUTH_SECRET = "secreto-de-prueba";
});

describe("cifrado en reposo", () => {
  it("descifra lo que cifra, y cada vez sale distinto", () => {
    const a = cifrar("discord-roles", "token-secreto");
    const b = cifrar("discord-roles", "token-secreto");
    expect(a).not.toBe(b);
    expect(descifrar("discord-roles", a)).toBe("token-secreto");
  });

  it("no descifra con otro propósito ni con datos rotos", () => {
    const a = cifrar("discord-roles", "token-secreto");
    expect(descifrar("otra-cosa", a)).toBeNull();
    expect(descifrar("discord-roles", a.slice(0, -2) + "AA")).toBeNull();
  });
});
