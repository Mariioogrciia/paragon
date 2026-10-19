import { describe, expect, it } from "vitest";
import { clienteAdSense, lineaAdsTxt, slotAdSense, urlMensajeConsentimiento } from "@/lib/publicidad";

describe("publicidad", () => {
  it("solo acepta un ID de editor válido", () => {
    expect(clienteAdSense("ca-pub-1234567890123456")).toBe("ca-pub-1234567890123456");
    expect(clienteAdSense(" ca-pub-1234567890123456 ")).toBe("ca-pub-1234567890123456");
    expect(clienteAdSense("pub-1234567890123456")).toBeNull();
    expect(clienteAdSense("")).toBeNull();
    expect(clienteAdSense(undefined)).toBeNull();
  });

  it("el bloque tiene que ser un número", () => {
    expect(slotAdSense("1234567890")).toBe("1234567890");
    expect(slotAdSense("abc")).toBeNull();
  });

  it("ads.txt y el mensaje de consentimiento usan pub- sin ca-", () => {
    expect(lineaAdsTxt("ca-pub-1234567890123456")).toBe("google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");
    expect(urlMensajeConsentimiento("ca-pub-1234567890123456")).toBe(
      "https://fundingchoicesmessages.google.com/i/pub-1234567890123456?ers=1",
    );
  });
});
