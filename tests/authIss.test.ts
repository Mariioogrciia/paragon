import { describe, expect, it } from "vitest";
import { urlSinIssDeDiscord } from "@/lib/authIss";

const base = "https://www.paragontrophies.com/api/auth/callback";

describe("urlSinIssDeDiscord", () => {
  it("quita el iss de discord.com y deja lo demás", () => {
    const limpia = urlSinIssDeDiscord(new URL(`${base}/discord?code=abc&state=xyz&iss=${encodeURIComponent("https://discord.com")}`));
    expect(limpia?.searchParams.get("iss")).toBeNull();
    expect(limpia?.searchParams.get("code")).toBe("abc");
    expect(limpia?.searchParams.get("state")).toBe("xyz");
  });

  it("no toca otros emisores, otras rutas ni vueltas sin iss", () => {
    expect(urlSinIssDeDiscord(new URL(`${base}/discord?code=a&iss=${encodeURIComponent("https://malo.example")}`))).toBeNull();
    expect(urlSinIssDeDiscord(new URL(`${base}/discord?code=a&iss=${encodeURIComponent("https://discord.com.malo.example")}`))).toBeNull();
    expect(urlSinIssDeDiscord(new URL(`${base}/google?code=a&iss=${encodeURIComponent("https://discord.com")}`))).toBeNull();
    expect(urlSinIssDeDiscord(new URL(`${base}/discord?code=a`))).toBeNull();
    expect(urlSinIssDeDiscord(new URL(`${base}/discord?code=a&iss=no-es-url`))).toBeNull();
  });
});
