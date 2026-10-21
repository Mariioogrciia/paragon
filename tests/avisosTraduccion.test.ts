import { describe, expect, it } from "vitest";
import { traducirAviso } from "@/lib/avisosTraduccion";
import { normalizarIdioma } from "@/lib/idiomaUsuario";

const eur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

describe("traducirAviso", () => {
  it("en español no toca nada", () => {
    expect(traducirAviso("Nueva solicitud de amistad", "es")).toBe("Nueva solicitud de amistad");
  });

  it("amigos, ligas y clanes", () => {
    expect(traducirAviso("Ana quiere ser tu amigo en Paragon.", "en")).toBe("Ana wants to be your friend on Paragon.");
    expect(traducirAviso("🤝 Solicitud aceptada", "fr")).toBe("🤝 Demande acceptée");
    expect(traducirAviso('Ana te ha invitado a la liga "Los de siempre" en Paragon.', "de")).toBe(
      "Ana hat dich in die Liga „Los de siempre“ auf Paragon eingeladen.",
    );
    expect(traducirAviso("Ana te invita a unirte a [PRG] Paragoneros.", "en")).toBe("Ana invites you to join [PRG] Paragoneros.");
    expect(traducirAviso("🏆 Ana ha sacado un platino", "de")).toBe("🏆 Ana hat ein Platin geholt");
  });

  it("trofeos, perdibles, lanzamientos y precios", () => {
    expect(traducirAviso("🏆 ¡Platino conseguido!", "en")).toBe("🏆 Platinum earned!");
    expect(traducirAviso("5 trofeos nuevos", "de")).toBe("5 neue Trophäen");
    expect(traducirAviso("⚠️ Elden Ring tiene 1 trofeo perdible", "en")).toBe("⚠️ Elden Ring has 1 missable trophy");
    expect(traducirAviso("⚠️ Elden Ring tiene 3 trofeos perdibles", "fr")).toBe("⚠️ Elden Ring a 3 trophées manquables");
    expect(traducirAviso("Míralos antes de avanzar: «A», «B»", "en")).toBe("Check them before moving on: «A», «B»");
    expect(traducirAviso("🎮 ¡Hades II sale hoy!", "fr")).toBe("🎮 Hades II sort aujourd'hui !");
    expect(traducirAviso(`💸 Hades II a ${eur(19.99)}`, "en")).toBe(`💸 Hades II for ${eur(19.99)}`);
    expect(traducirAviso(`Ha bajado de tu objetivo de ${eur(25)} en Steam (-20%).`, "de")).toBe(
      `Unter dein Ziel von ${eur(25)} bei Steam gefallen (-20%).`,
    );
  });

  it("ligas, temporada y guerras de clanes", () => {
    expect(traducirAviso("📉 Ana te ha adelantado en la liga", "fr")).toBe("📉 Ana t'a dépassé dans la ligue");
    expect(traducirAviso("Ahora vas 3º de 12 en la liga del mes (40 puntos por detrás).", "en")).toBe(
      "You're now 3 of 12 in this month's league (40 points behind).",
    );
    expect(traducirAviso("Ganó Ana con 300 puntos. Tú quedaste 2.º de 5.", "en")).toBe("Ana won with 300 points. You finished 2 of 5.");
    expect(traducirAviso("🥇 Temporada T3 2026 cerrada: nivel 12", "de")).toBe("🥇 Saison T3 2026 beendet: Stufe 12");
    expect(traducirAviso("⚔️ ¡Victoria! en la guerra de clanes", "en")).toBe("⚔️ Victory! in the clan war");
    expect(traducirAviso("[PRG] contra [ABC] durante 7 días. Cada trofeo de cualquier miembro suma.", "fr")).toBe(
      "[PRG] contre [ABC] pendant 7 jours. Chaque trophée de chaque membre compte.",
    );
  });

  it("retos y platinar juntos", () => {
    expect(traducirAviso("Elden Ring antes del 15 de noviembre. Acéptalo desde Amigos.", "en")).toBe(
      "Elden Ring before November 15. Accept it from Friends.",
    );
    expect(traducirAviso("Elden Ring antes del 15 de noviembre. Acéptalo desde Amigos.", "de")).toBe(
      "Elden Ring bis zum 15. November. Nimm es unter Freunde an.",
    );
    expect(traducirAviso("«Semana loca»: quien más trofeos consiga en 7 días gana. Acéptalo desde Amigos.", "en")).toBe(
      "«Semana loca»: whoever earns the most trophies in 7 days wins. Accept it from Friends.",
    );
    expect(traducirAviso("Gana Ana en «Semana loca». Tú: 4 trofeos.", "fr")).toBe("Ana gagne «Semana loca». Toi : 4 trophées.");
  });

  it("sesiones, línea a línea", () => {
    const texto = "Elden Ring · «Malenia»\n3/4 plazas ocupadas · queda 1 libre\nDentro: Ana (organiza), Bob, Carla";
    expect(traducirAviso(texto, "en")).toBe("Elden Ring · «Malenia»\n3/4 spots taken · 1 free\nIn: Ana (host), Bob, Carla");
    expect(traducirAviso("4/4 plazas ocupadas · ¡completa!", "de")).toBe("4/4 Plätze belegt · voll!");
    expect(traducirAviso("2/4 plazas ocupadas · 2 libres", "fr")).toBe("2/4 places prises · 2 libres");
    expect(traducirAviso("⏰ Sesión en 30 min: Elden Ring", "en")).toBe("⏰ Session in 30 min: Elden Ring");
  });

  it("resumen semanal de Discord, línea a línea", () => {
    const texto = [
      "🏆 **12** trofeos en **3** juegos · 💎 **1** platino",
      "🔥 Racha de **4** días (¡consigue uno hoy para no perderla!)",
      "📊 Vas **2º** de 9 en la liga del mes",
    ].join("\n");
    expect(traducirAviso(texto, "en")).toBe(
      ["🏆 **12** trophies in **3** games · 💎 **1** platinum", "🔥 **4**-day streak (earn one today to keep it!)", "📊 You're **2** of 9 in this month's league"].join("\n"),
    );
    expect(traducirAviso("📅 Tu semana en Paragon", "fr")).toBe("📅 Ta semaine sur Paragon");
    expect(traducirAviso("🔥 Racha de **1** día", "de")).toBe("🔥 Serie von **1** Tag");
  });

  it("lo que no conoce sale como estaba", () => {
    expect(traducirAviso("Elden Ring", "en")).toBe("Elden Ring");
  });
});

describe("normalizarIdioma", () => {
  it("se queda con el idioma de Paragon y si no, español", () => {
    expect(normalizarIdioma("en-US")).toBe("en");
    expect(normalizarIdioma("de")).toBe("de");
    expect(normalizarIdioma("pt-BR")).toBe("pt");
    expect(normalizarIdioma("it-IT")).toBe("it");
    expect(normalizarIdioma("ja-JP")).toBe("es");
    expect(normalizarIdioma(null)).toBe("es");
  });
});
