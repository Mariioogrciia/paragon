import { describe, expect, it } from "vitest";
import { escaparTelegram, leerComando, textosTelegram } from "@/lib/telegramTextos";

describe("bot de Telegram", () => {
  it("lee comandos, con o sin @ del bot", () => {
    expect(leerComando("/start abc123")).toEqual({ comando: "start", argumento: "abc123" });
    expect(leerComando("/Perfil@ParagonBot")).toEqual({ comando: "perfil", argumento: "" });
    expect(leerComando("hola")).toBeNull();
  });

  it("idioma de Telegram, y español si no lo conoce", () => {
    expect(textosTelegram("de-DE").desconocido).toContain("Befehl");
    expect(textosTelegram("ja").desconocido).toContain("comando");
    expect(textosTelegram(undefined).racha(1, 3)).toContain("1</b> día ");
  });

  it("escapa lo que no es una etiqueta de Telegram", () => {
    expect(escaparTelegram("<Tom & Jerry>")).toBe("&lt;Tom &amp; Jerry&gt;");
  });
});
