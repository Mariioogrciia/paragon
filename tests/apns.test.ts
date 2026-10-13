import { describe, expect, it } from "vitest";
import { cuerpoApns, esTokenApns, tokenCaducado } from "@/lib/apns";

describe("apns", () => {
  it("distingue los tokens de iPhone por el prefijo", () => {
    expect(esTokenApns("apns:abcdef0123456789abcdef0123456789")).toBe(true);
    expect(esTokenApns("dGhpcyBpcyBhbiBmY20gdG9rZW4:APA91b")).toBe(false);
  });

  it("arma el cuerpo con aps y la url aparte", () => {
    const cuerpo = JSON.parse(cuerpoApns({ title: "🏆 Platino", body: "Elden Ring", url: "/juego/x" }));
    expect(cuerpo).toEqual({ aps: { alert: { title: "🏆 Platino", body: "Elden Ring" }, sound: "default" }, url: "/juego/x" });
    expect(JSON.parse(cuerpoApns({ title: "a", body: "b" }))).not.toHaveProperty("url");
  });

  it("solo borra los tokens que APNs da por muertos", () => {
    expect(tokenCaducado(410, "Unregistered")).toBe(true);
    expect(tokenCaducado(400, "BadDeviceToken")).toBe(true);
    expect(tokenCaducado(400, "PayloadTooLarge")).toBe(false);
    expect(tokenCaducado(429, "TooManyRequests")).toBe(false);
    expect(tokenCaducado(200, undefined)).toBe(false);
  });
});
