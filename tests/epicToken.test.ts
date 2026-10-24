import { describe, expect, it, vi } from "vitest";
import { cabeceraBasicEpic, fetchEpic, URL_TOKEN_EPIC } from "@/lib/epicToken";

const ID = "xyza7891cliente";
const SECRETO = "abc/def+ghi=";

describe("fetchEpic", () => {
  it("manda el secreto sin codificar en la petición del token", async () => {
    const base = vi.fn(async (_entrada: RequestInfo | URL, _init?: RequestInit) => new Response("{}"));
    const codificada = `Basic ${Buffer.from(`${ID}:${encodeURIComponent(SECRETO)}`).toString("base64")}`;
    await fetchEpic(ID, SECRETO, base)(URL_TOKEN_EPIC, { method: "POST", headers: { authorization: codificada, "content-type": "application/x-www-form-urlencoded" } });

    const cabeceras = new Headers(base.mock.calls[0][1]?.headers);
    expect(cabeceras.get("authorization")).toBe(cabeceraBasicEpic(ID, SECRETO));
    expect(Buffer.from(cabeceras.get("authorization")!.slice(6), "base64").toString()).toBe(`${ID}:${SECRETO}`);
    expect(cabeceras.get("content-type")).toBe("application/x-www-form-urlencoded");
  });

  it("no toca otras peticiones ni hace nada sin credenciales", async () => {
    const base = vi.fn(async (_entrada: RequestInfo | URL, _init?: RequestInit) => new Response("{}"));
    const init = { headers: { authorization: "Bearer x" } };
    await fetchEpic(ID, SECRETO, base)("https://api.epicgames.dev/epic/id/v2/accounts?accountId=1", init);
    await fetchEpic(undefined, SECRETO, base)(URL_TOKEN_EPIC, init);
    expect(base.mock.calls[0][1]).toBe(init);
    expect(base.mock.calls[1][1]).toBe(init);
  });
});
