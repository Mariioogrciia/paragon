import { describe, expect, it } from "vitest";
import { COLOR_RE, HANDLE_RE, IDIOMA_RE, esUrlHttp, esZonaHoraria } from "@/lib/validacionPerfil";

describe("HANDLE_RE", () => {
  it.each(["mario", "fende_21", "abc", "a".repeat(20)])("acepta %s", (h) => expect(HANDLE_RE.test(h)).toBe(true));
  it.each(["", "ab", "Mario", "con espacio", "../x", "a".repeat(21), "ñandú"])("rechaza %j", (h) =>
    expect(HANDLE_RE.test(h)).toBe(false),
  );
});

describe("esUrlHttp", () => {
  it("acepta http y https", () => {
    expect(esUrlHttp("https://cdn.discordapp.com/avatars/1.png")).toBe(true);
    expect(esUrlHttp("http://static-resource.np.community.playstation.net/a.png")).toBe(true);
  });
  it("rechaza otros esquemas, rutas relativas y URLs enormes", () => {
    expect(esUrlHttp("javascript:alert(1)")).toBe(false);
    expect(esUrlHttp("data:image/png;base64,AAAA")).toBe(false);
    expect(esUrlHttp("/uploads/a.png")).toBe(false);
    expect(esUrlHttp(`https://x.com/${"a".repeat(2100)}`)).toBe(false);
  });
});

describe("resto de campos", () => {
  it("color hexadecimal de 6 cifras", () => {
    expect(COLOR_RE.test("#3b82f6")).toBe(true);
    expect(COLOR_RE.test("red; background:url(x)")).toBe(false);
  });
  it("idioma", () => {
    expect(IDIOMA_RE.test("es-ES")).toBe(true);
    expect(IDIOMA_RE.test("es")).toBe(true);
    expect(IDIOMA_RE.test("<script>")).toBe(false);
  });
  it("zona horaria", () => {
    expect(esZonaHoraria("Europe/Madrid")).toBe(true);
    expect(esZonaHoraria("Marte/Base")).toBe(false);
  });
});
