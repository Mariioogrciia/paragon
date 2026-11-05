import { describe, expect, it } from "vitest";
import { enlaceAfiliado, relTienda } from "@/lib/afiliados";

describe("enlaceAfiliado", () => {
  const codigos = { NEXT_PUBLIC_AFILIADO_HUMBLE: "paragon", NEXT_PUBLIC_AFILIADO_FANATICAL: " fan1 " };

  it("añade el código de la tienda si hay variable", () => {
    expect(enlaceAfiliado("https://www.humblebundle.com/store/hades?x=1", codigos)).toEqual({ url: "https://www.humblebundle.com/store/hades?x=1&partner=paragon", afiliado: true });
    expect(enlaceAfiliado("https://fanatical.com/en/game/hades", codigos).url).toBe("https://fanatical.com/en/game/hades?ref=fan1");
  });

  it("deja igual las tiendas sin código, Steam y la redirección de CheapShark", () => {
    expect(enlaceAfiliado("https://www.greenmangaming.com/games/x", codigos).afiliado).toBe(false);
    expect(enlaceAfiliado("https://store.steampowered.com/app/1/", codigos).afiliado).toBe(false);
    expect(enlaceAfiliado("https://www.cheapshark.com/redirect?dealID=abc", codigos).afiliado).toBe(false);
    expect(enlaceAfiliado("no es una url", codigos)).toEqual({ url: "no es una url", afiliado: false });
  });

  it("marca rel sponsored solo si es de afiliado", () => {
    expect(relTienda(true)).toContain("sponsored");
    expect(relTienda(false)).not.toContain("sponsored");
  });
});
