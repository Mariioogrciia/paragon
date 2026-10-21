import { describe, expect, it } from "vitest";
import { campanaDe, dispositivoDe, esBot, esMovil, idiomaDe, navegadorDe, nombreBot, normalizarRuta, origenDe, paisDe, pantallaDe, sistemaDe } from "@/lib/traficoRutas";

describe("normalizarRuta", () => {
  it("agrupa las páginas con parte variable", () => {
    expect(normalizarRuta("/u/fende21")).toBe("/u/[handle]");
    expect(normalizarRuta("/u/fende21/")).toBe("/u/[handle]");
    expect(normalizarRuta("/u/fende21/biblioteca?orden=az")).toBe("/u/[handle]/biblioteca");
    expect(normalizarRuta("/u/fende21/psn-NPWR123")).toBe("/u/[handle]/[juego]");
    expect(normalizarRuta("/u/fende21/wrap/horas")).toBe("/u/[handle]/wrap");
    expect(normalizarRuta("/juego/1942")).toBe("/juego/[id]");
    expect(normalizarRuta("/esports/partido/123")).toBe("/esports/partido/[id]");
  });

  it("deja las fijas y descarta lo que no se cuenta", () => {
    expect(normalizarRuta("/")).toBe("/");
    expect(normalizarRuta("/descubrir/steam")).toBe("/descubrir/steam");
    expect(normalizarRuta("/admin?tab=system")).toBeNull();
    expect(normalizarRuta("/api/v")).toBeNull();
    expect(normalizarRuta("/movil/entrar/google")).toBeNull();
    expect(normalizarRuta("/logo.png")).toBeNull();
    expect(normalizarRuta("https://otro.com/x")).toBeNull();
  });
});

describe("origenDe", () => {
  it("separa entradas de fuera, directas y navegación interna", () => {
    expect(origenDe("https://www.google.com/")).toBe("google.com");
    expect(origenDe("https://t.co/abc")).toBe("t.co");
    expect(origenDe("")).toBe("directo");
    expect(origenDe("no es url")).toBe("directo");
    expect(origenDe("https://www.paragontrophies.com/descubrir")).toBeNull();
    expect(origenDe("https://platinos-nine.vercel.app/")).toBeNull();
  });
});

describe("bots y móviles", () => {
  it("reconoce rastreadores y móviles", () => {
    expect(esBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(esBot(undefined)).toBe(true);
    expect(esBot("Mozilla/5.0 (Windows NT 10.0) Chrome/130")).toBe(false);
    expect(esMovil("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)")).toBe(true);
    expect(esMovil("Mozilla/5.0 (Windows NT 10.0)")).toBe(false);
  });
});

describe("dimensiones de la visita", () => {
  const CHROME_WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
  const EDGE = `${CHROME_WIN} Edg/130.0`;
  const SAFARI_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const ANDROID_TABLET = "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
  const ANDROID_MOVIL = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";

  it("saca navegador, sistema y dispositivo", () => {
    expect([navegadorDe(CHROME_WIN), sistemaDe(CHROME_WIN), dispositivoDe(CHROME_WIN)]).toEqual(["Chrome", "Windows", "escritorio"]);
    expect(navegadorDe(EDGE)).toBe("Edge");
    expect([navegadorDe(SAFARI_IPHONE), sistemaDe(SAFARI_IPHONE), dispositivoDe(SAFARI_IPHONE)]).toEqual(["Safari", "iOS", "movil"]);
    expect([sistemaDe(ANDROID_TABLET), dispositivoDe(ANDROID_TABLET)]).toEqual(["Android", "tablet"]);
    expect(dispositivoDe(ANDROID_MOVIL)).toBe("movil");
    expect(navegadorDe(null)).toBe("Otro");
  });

  it("clasifica bots por familia", () => {
    expect(nombreBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe("Google");
    expect(nombreBot("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2)")).toBe("IA");
    expect(nombreBot("Mozilla/5.0 HeadlessChrome/130.0")).toBe("Monitores y pruebas");
    expect(nombreBot("raro/1.0 bot")).toBe("Otros bots");
    expect(nombreBot(null)).toBe("Sin identificar");
  });

  it("normaliza idioma, pantalla, campaña y país", () => {
    expect(idiomaDe("es-ES")).toBe("es");
    expect(idiomaDe(42)).toBe("otro");
    expect(pantallaDe(390)).toBe("< 640");
    expect(pantallaDe(1280)).toBe("1024–1439");
    expect(pantallaDe(2560)).toBe("≥ 1920");
    expect(pantallaDe(-1)).toBeNull();
    expect(campanaDe(" Twitter<script> ")).toBe("twitterscript");
    expect(campanaDe("")).toBeNull();
    expect(paisDe("ES")).toBe("ES");
    expect(paisDe("XX")).toBeNull();
    expect(paisDe("es")).toBeNull();
  });
});
