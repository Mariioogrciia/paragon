import { describe, expect, it } from "vitest";
import { appleAppSiteAssociation, assetLinks, HUELLA_DEBUG, huellasAndroid } from "@/lib/enlacesApp";

describe("App Links", () => {
  it("siempre lleva la huella de debug y añade las válidas de la variable", () => {
    const otra = "AA:".repeat(31) + "BB";
    expect(huellasAndroid(undefined)).toEqual([HUELLA_DEBUG]);
    expect(huellasAndroid(` ${otra.toLowerCase()} , basura,`)).toEqual([HUELLA_DEBUG, otra]);
  });

  it("assetlinks con el paquete de la app", () => {
    const [enlace] = assetLinks([HUELLA_DEBUG]);
    expect(enlace.target.package_name).toBe("com.paragon.app");
    expect(enlace.relation).toEqual(["delegate_permission/common.handle_all_urls"]);
  });
});

describe("Universal Links", () => {
  it("sin Team ID válido no hay archivo", () => {
    expect(appleAppSiteAssociation(undefined)).toBeNull();
    expect(appleAppSiteAssociation("corto")).toBeNull();
  });

  it("con Team ID, el appID y las rutas de la app", () => {
    const a = appleAppSiteAssociation("ABCDE12345")!;
    expect(a.applinks.details[0].appIDs).toEqual(["ABCDE12345.com.paragon.app.kmp"]);
    expect(a.applinks.details[0].components).toContainEqual({ "/": "/u/*" });
    expect(a.applinks.details[0].components).toContainEqual({ "/": "/ligas*" });
  });
});
