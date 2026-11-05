import { describe, expect, it } from "vitest";
import { apoyoVigente, handleDelMensaje, leerPagoKofi } from "@/lib/apoyoReglas";

describe("Paragon+", () => {
  it("un pago vale 31 días", () => {
    const ahora = new Date("2026-11-05T12:00:00Z");
    expect(apoyoVigente(new Date("2026-10-10T12:00:00Z"), ahora)).toBe(true);
    expect(apoyoVigente(new Date("2026-10-01T12:00:00Z"), ahora)).toBe(false);
    expect(apoyoVigente(null, ahora)).toBe(false);
  });

  it("saca el @ del mensaje", () => {
    expect(handleDelMensaje("Para @Mario_99, ¡ánimo!")).toBe("mario_99");
    expect(handleDelMensaje("sin arroba")).toBeNull();
  });

  it("lee el JSON de Ko-fi y rechaza lo que no es un pago", () => {
    const pago = leerPagoKofi(JSON.stringify({ verification_token: "t", kofi_transaction_id: "tx1", type: "Subscription", email: "A@B.com", amount: "3.00", currency: "EUR", is_subscription_payment: true }));
    expect(pago).toMatchObject({ id: "tx1", email: "a@b.com", suscripcion: true, importe: "3.00", tokenVerificacion: "t" });
    expect(leerPagoKofi("{roto")).toBeNull();
    expect(leerPagoKofi(JSON.stringify({ type: "Donation" }))).toBeNull();
  });
});
