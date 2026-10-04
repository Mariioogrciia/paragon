import { describe, expect, it } from "vitest";
import { jsonConEtag } from "@/lib/etag";

const peticion = (etag?: string) => new Request("https://x/api/mobile/library", { headers: etag ? { "If-None-Match": etag } : {} });

describe("jsonConEtag", () => {
  it("la primera vez manda el cuerpo con ETag y sin caché compartido", async () => {
    const r = jsonConEtag(peticion(), { games: [1, 2] }, "u1");
    expect(r.status).toBe(200);
    expect(r.headers.get("ETag")).toMatch(/^W\/".+"$/);
    expect(r.headers.get("Cache-Control")).toBe("private, no-cache");
    expect(await r.json()).toEqual({ games: [1, 2] });
  });

  it("con el mismo ETag contesta 304 sin cuerpo", async () => {
    const etag = jsonConEtag(peticion(), { games: [1] }, "u1").headers.get("ETag")!;
    const r = jsonConEtag(peticion(etag), { games: [1] }, "u1");
    expect(r.status).toBe(304);
    expect(await r.text()).toBe("");
  });

  it("si cambian los datos o la persona, el ETag cambia", () => {
    const a = jsonConEtag(peticion(), { games: [1] }, "u1").headers.get("ETag");
    expect(jsonConEtag(peticion(), { games: [1, 2] }, "u1").headers.get("ETag")).not.toBe(a);
    expect(jsonConEtag(peticion(), { games: [1] }, "u2").headers.get("ETag")).not.toBe(a);
  });
});
