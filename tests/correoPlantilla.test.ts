import { describe, expect, it } from "vitest";
import { correoResumen } from "@/lib/correoPlantilla";

describe("correoResumen", () => {
  const c = correoResumen("es", "Ana <script>", ["🏆 **12** trofeos en **3** juegos", "🔥 Racha de **4** días"], { ritmo: "https://x.test/ritmo", baja: "https://x.test/baja?t=a&b" });

  it("pasa las negritas a <strong> y escapa lo de fuera", () => {
    expect(c.html).toContain("<strong>12</strong> trofeos en <strong>3</strong> juegos");
    expect(c.html).toContain("Ana &lt;script&gt;");
    expect(c.html).not.toContain("<script>");
    expect(c.html).toContain('href="https://x.test/baja?t=a&amp;b"');
  });

  it("el texto plano va sin marcas y con el enlace de baja", () => {
    expect(c.texto).toContain("🏆 12 trofeos en 3 juegos");
    expect(c.texto).toContain("https://x.test/baja?t=a&b");
    expect(c.asunto).toBe("📅 Tu semana en Paragon");
  });

  it("en el idioma pedido", () => {
    expect(correoResumen("de", "Ana", [], { ritmo: "r", baja: "b" }).asunto).toBe("📅 Deine Woche auf Paragon");
  });
});
