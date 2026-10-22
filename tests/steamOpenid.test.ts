import { describe, expect, it, vi } from "vitest";
import { steamIdConfirmado, urlLoginSteam } from "@/lib/steam/openid";

const VOLVER = "https://www.paragontrophies.com/api/steam/verificar/vuelta?n=abc";
const ID = "76561198000000001";

function vuelta(cambios: Record<string, string> = {}) {
  return new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "id_res",
    "openid.op_endpoint": "https://steamcommunity.com/openid/login",
    "openid.claimed_id": `https://steamcommunity.com/openid/id/${ID}`,
    "openid.identity": `https://steamcommunity.com/openid/id/${ID}`,
    "openid.return_to": VOLVER,
    "openid.response_nonce": "2026-10-22T10:00:00Zx",
    "openid.assoc_handle": "1234567890",
    "openid.signed": "signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle",
    "openid.sig": "firma",
    ...cambios,
  });
}

const responde = (texto: string) => vi.fn(async () => new Response(texto)) as unknown as typeof fetch;

describe("urlLoginSteam", () => {
  it("pide a Steam que elija la cuenta y vuelva a nuestra dirección", () => {
    const url = new URL(urlLoginSteam(VOLVER, "https://www.paragontrophies.com"));
    expect(url.origin + url.pathname).toBe("https://steamcommunity.com/openid/login");
    expect(url.searchParams.get("openid.mode")).toBe("checkid_setup");
    expect(url.searchParams.get("openid.return_to")).toBe(VOLVER);
    expect(url.searchParams.get("openid.realm")).toBe("https://www.paragontrophies.com");
    expect(url.searchParams.get("openid.claimed_id")).toBe("http://specs.openid.net/auth/2.0/identifier_select");
  });
});

describe("steamIdConfirmado", () => {
  it("devuelve el SteamID si Steam confirma la firma", async () => {
    const preguntar = responde("ns:http://specs.openid.net/auth/2.0\nis_valid:true\n");
    expect(await steamIdConfirmado(vuelta(), VOLVER, preguntar)).toBe(ID);
    const [, init] = (preguntar as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const cuerpo = new URLSearchParams(init.body);
    expect(cuerpo.get("openid.mode")).toBe("check_authentication");
    expect(cuerpo.get("openid.sig")).toBe("firma");
  });

  it("rechaza si Steam dice que la firma no vale", async () => {
    expect(await steamIdConfirmado(vuelta(), VOLVER, responde("ns:x\nis_valid:false\n"))).toBeNull();
  });

  it("rechaza una vuelta a otra dirección sin preguntar a Steam", async () => {
    const preguntar = responde("is_valid:true\n");
    expect(await steamIdConfirmado(vuelta({ "openid.return_to": "https://malo.example/x" }), VOLVER, preguntar)).toBeNull();
    expect(preguntar).not.toHaveBeenCalled();
  });

  it("rechaza un claimed_id que no es de Steam o no coincide con identity", async () => {
    const preguntar = responde("is_valid:true\n");
    expect(await steamIdConfirmado(vuelta({ "openid.claimed_id": "https://malo.example/openid/id/76561198000000001" }), VOLVER, preguntar)).toBeNull();
    expect(await steamIdConfirmado(vuelta({ "openid.identity": "https://steamcommunity.com/openid/id/76561198000000002" }), VOLVER, preguntar)).toBeNull();
    expect(await steamIdConfirmado(vuelta({ "openid.op_endpoint": "https://malo.example/openid/login" }), VOLVER, preguntar)).toBeNull();
    expect(preguntar).not.toHaveBeenCalled();
  });

  it("rechaza si el usuario canceló en Steam", async () => {
    expect(await steamIdConfirmado(vuelta({ "openid.mode": "cancel" }), VOLVER, responde("is_valid:true\n"))).toBeNull();
  });

  it("devuelve null si Steam no responde", async () => {
    const falla = vi.fn(async () => {
      throw new Error("red");
    }) as unknown as typeof fetch;
    expect(await steamIdConfirmado(vuelta(), VOLVER, falla)).toBeNull();
  });
});
