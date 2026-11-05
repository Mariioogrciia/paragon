import { describe, expect, it } from "vitest";
import { traeSecretoCron } from "@/lib/secretoCron";

describe("traeSecretoCron", () => {
  it("acepta solo el Bearer exacto", () => {
    expect(traeSecretoCron("Bearer abc123", "abc123")).toBe(true);
    expect(traeSecretoCron("Bearer abc12", "abc123")).toBe(false);
    expect(traeSecretoCron("abc123", "abc123")).toBe(false);
    expect(traeSecretoCron(null, "abc123")).toBe(false);
  });
});
