import { afterEach, describe, expect, it, vi } from "vitest";
import { codigoDesdeNpsso, PsnAuthError } from "@/lib/psn/auth";

function responde(status: number, location?: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status, headers: location ? { location } : {} })),
  );
}

describe("codigoDesdeNpsso", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("con ?code= devuelve el código", async () => {
    responde(302, "com.scee.psxandroid.scecompcall://redirect/?code=v3.ABC&cid=x");
    await expect(codigoDesdeNpsso("n")).resolves.toBe("v3.ABC");
  });

  it("redirige sin código (sin sesión válida): NPSSO caducado", async () => {
    responde(302, "com.scee.psxandroid.scecompcall://redirect/?error=login_required&error_code=4165");
    const error = await codigoDesdeNpsso("n").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PsnAuthError);
    // Lo que dijo Sony, para Admin → Sistema.
    expect((error as PsnAuthError).detalle).toBe("HTTP 302 → error=login_required, error_code=4165");
  });

  it("un 403 o 429 de Sony NO es culpa del NPSSO", async () => {
    for (const status of [403, 429, 503]) {
      responde(status);
      const error = await codigoDesdeNpsso("n").catch((e: unknown) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(PsnAuthError);
    }
  });
});
