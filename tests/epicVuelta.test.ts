import { describe, expect, it } from "vitest";
import { destinoFalloEpic, motivoFalloEpic } from "@/lib/epicVuelta";

const base = "https://www.paragontrophies.com/api/auth/callback";
const redireccion = (location: string, status = 302) => new Response(null, { status, headers: { location } });
const conState = "__Secure-authjs.state=abc; otra=1";

describe("motivoFalloEpic", () => {
  it("distingue cancelar, perder la cookie del intento y el resto", () => {
    expect(motivoFalloEpic("access_denied", true)).toBe("cancelado");
    expect(motivoFalloEpic("access_denied", false)).toBe("cancelado");
    expect(motivoFalloEpic(null, false)).toBe("estado");
    expect(motivoFalloEpic(null, true)).toBe("fallo");
  });
});

describe("destinoFalloEpic", () => {
  it("manda los errores de la vuelta de Epic a Ajustes con el motivo", () => {
    expect(destinoFalloEpic(new URL(`${base}/epic?error=access_denied&state=x`), redireccion("/entrar?error=OAuthCallbackError"), conState)).toBe(
      "https://www.paragontrophies.com/ajustes/plataformas?epic=error&motivo=cancelado",
    );
    // Auth.js dice "Configuration" también cuando falta la cookie del state.
    const configuracion = redireccion("https://www.paragontrophies.com/api/auth/error?error=Configuration");
    expect(destinoFalloEpic(new URL(`${base}/epic?code=a&state=x`), configuracion, "otra=1")).toBe(
      "https://www.paragontrophies.com/ajustes/plataformas?epic=error&motivo=estado",
    );
    expect(destinoFalloEpic(new URL(`${base}/epic?code=a&state=x`), configuracion, "authjs.state=abc")).toBe(
      "https://www.paragontrophies.com/ajustes/plataformas?epic=error&motivo=fallo",
    );
  });

  it("no toca las vueltas buenas, la de sin sesión ni a otros proveedores", () => {
    const epic = new URL(`${base}/epic?code=a`);
    expect(destinoFalloEpic(epic, redireccion("/ajustes/plataformas?epic=verificada"), conState)).toBeNull();
    expect(destinoFalloEpic(epic, redireccion("/entrar?epic=sin-sesion"), conState)).toBeNull();
    expect(destinoFalloEpic(epic, new Response("ok", { status: 200 }), conState)).toBeNull();
    expect(destinoFalloEpic(new URL(`${base}/discord?code=a`), redireccion("/entrar?error=OAuthCallbackError"), conState)).toBeNull();
  });
});
