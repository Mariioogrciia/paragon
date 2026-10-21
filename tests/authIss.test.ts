import { describe, expect, it } from "vitest";
import { urlSinIssDelProveedor } from "@/lib/authIss";

const base = "https://www.paragontrophies.com/api/auth/callback";

describe("urlSinIssDelProveedor", () => {
  it("quita el iss de discord.com y deja lo demás", () => {
    const limpia = urlSinIssDelProveedor(new URL(`${base}/discord?code=abc&state=xyz&iss=${encodeURIComponent("https://discord.com")}`));
    expect(limpia?.searchParams.get("iss")).toBeNull();
    expect(limpia?.searchParams.get("code")).toBe("abc");
    expect(limpia?.searchParams.get("state")).toBe("xyz");
  });

  it("no toca otros emisores, otras rutas ni vueltas sin iss", () => {
    expect(urlSinIssDelProveedor(new URL(`${base}/discord?code=a&iss=${encodeURIComponent("https://malo.example")}`))).toBeNull();
    expect(urlSinIssDelProveedor(new URL(`${base}/discord?code=a&iss=${encodeURIComponent("https://discord.com.malo.example")}`))).toBeNull();
    expect(urlSinIssDelProveedor(new URL(`${base}/google?code=a&iss=${encodeURIComponent("https://discord.com")}`))).toBeNull();
    expect(urlSinIssDelProveedor(new URL(`${base}/discord?code=a`))).toBeNull();
    expect(urlSinIssDelProveedor(new URL(`${base}/discord?code=a&iss=no-es-url`))).toBeNull();
  });

  it("también quita el iss de Epic, y solo si es de Epic", () => {
    const limpia = urlSinIssDelProveedor(new URL(`${base}/epic?code=a&iss=${encodeURIComponent("https://api.epicgames.dev/epic/oauth/v2")}`));
    expect(limpia?.searchParams.get("iss")).toBeNull();
    expect(limpia?.searchParams.get("code")).toBe("a");
    expect(urlSinIssDelProveedor(new URL(`${base}/epic?code=a&iss=${encodeURIComponent("https://discord.com")}`))).toBeNull();
    expect(urlSinIssDelProveedor(new URL(`${base}/epic?code=a&iss=${encodeURIComponent("https://epicgames.dev.malo.example")}`))).toBeNull();
  });
});
