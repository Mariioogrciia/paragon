import { describe, expect, it } from "vitest";
import { politicaCsp, resumenInformeCsp } from "@/lib/csp";

describe("politicaCsp", () => {
  it("lleva las directivas clave y a dónde informar", () => {
    const p = politicaCsp();
    expect(p).toContain("frame-ancestors 'self'");
    expect(p).toContain("object-src 'none'");
    expect(p).toContain("img-src 'self' data: blob: https:");
    expect(p.endsWith("report-uri /api/csp")).toBe(true);
  });
});

describe("resumenInformeCsp", () => {
  it("lee el formato viejo y se queda solo con el origen", () => {
    const r = resumenInformeCsp({
      "csp-report": { "effective-directive": "script-src-elem", "blocked-uri": "https://malo.test/x.js?token=1", "document-uri": "https://www.paragontrophies.com/u/ana?x=1" },
    });
    expect(r).toEqual({ directiva: "script-src-elem", bloqueado: "https://malo.test", pagina: "/u/ana" });
  });

  it("lee la Reporting API nueva", () => {
    const r = resumenInformeCsp([{ type: "csp-violation", body: { effectiveDirective: "img-src", blockedURL: "inline", documentURL: "https://x.test/" } }]);
    expect(r).toEqual({ directiva: "img-src", bloqueado: "inline", pagina: "/" });
  });

  it("ignora basura", () => {
    expect(resumenInformeCsp(null)).toBeNull();
    expect(resumenInformeCsp({ algo: 1 })).toBeNull();
  });
});
