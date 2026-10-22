import type { MetadataRoute } from "next";

/**
 * El manifiesto de la web instalable en cada idioma (21 oct 2026). Lo sirve
 * `app/manifiesto/[idioma]` ya generado (sin gastar CPU por visita) y cada
 * página enlaza el suyo desde `app/documento.tsx`. La dirección de siempre
 * (`/manifest.webmanifest`) da el español, para lo ya instalado (next.config.ts).
 */
const TEXTOS: Record<string, { descripcion: string; continuar: [string, string, string]; hoy: [string, string, string] }> = {
  es: {
    descripcion: "Tu progreso de trofeos y logros multiplataforma, en un solo sitio.",
    continuar: ["Continuar juego anclado", "Continuar", "Tu Modo Enfoque del juego que tienes anclado ahora mismo."],
    hoy: ["Sugerencia para hoy", "Hoy", "Qué puedes cerrar hoy según el tiempo que tengas."],
  },
  en: {
    descripcion: "Your trophy and achievement progress across platforms, in one place.",
    continuar: ["Continue pinned game", "Continue", "Focus mode for the game you have pinned right now."],
    hoy: ["Suggestion for today", "Today", "What you can finish today with the time you have."],
  },
  de: {
    descripcion: "Dein Trophäen- und Erfolgsfortschritt über alle Plattformen, an einem Ort.",
    continuar: ["Angeheftetes Spiel fortsetzen", "Fortsetzen", "Dein Fokusmodus für das gerade angeheftete Spiel."],
    hoy: ["Vorschlag für heute", "Heute", "Was du heute mit deiner Zeit abschließen kannst."],
  },
  fr: {
    descripcion: "Ta progression de trophées et de succès multiplateforme, au même endroit.",
    continuar: ["Continuer le jeu épinglé", "Continuer", "Ton mode Focus du jeu épinglé en ce moment."],
    hoy: ["Suggestion du jour", "Aujourd'hui", "Ce que tu peux boucler aujourd'hui selon ton temps."],
  },
  it: {
    descripcion: "I tuoi progressi di trofei e obiettivi multipiattaforma, in un solo posto.",
    continuar: ["Continua il gioco fissato", "Continua", "La tua Modalità Focus del gioco fissato in questo momento."],
    hoy: ["Suggerimento per oggi", "Oggi", "Cosa puoi chiudere oggi con il tempo che hai."],
  },
  pt: {
    descripcion: "O teu progresso de troféus e conquistas multiplataforma, num só sítio.",
    continuar: ["Continuar jogo fixado", "Continuar", "O teu Modo Foco do jogo que tens fixado agora."],
    hoy: ["Sugestão para hoje", "Hoje", "O que podes fechar hoje com o tempo que tens."],
  },
};

export function manifiestoWeb(idioma: string): MetadataRoute.Manifest {
  const t = TEXTOS[idioma] ?? TEXTOS.es;
  const icono = { src: "/logo.png", sizes: "192x192", type: "image/png" };
  return {
    // Mismo `id` en todos los idiomas: para el navegador es la misma app.
    id: "/",
    name: "Paragon",
    short_name: "Paragon",
    description: t.descripcion,
    lang: idioma,
    start_url: "/",
    display: "standalone",
    // Mismo valor que `--background` del tema oscuro (globals.css): si no, la
    // pantalla de arranque se ve de un tono distinto al de la app.
    background_color: "#0a0d13",
    theme_color: "#0a0d13",
    icons: [icono, { src: "/logo.png", sizes: "512x512", type: "image/png" }],
    // Accesos directos al mantener pulsado el icono. Una URL fija: "Continuar"
    // pasa por /enfoque, que resuelve el juego anclado de quien entre.
    shortcuts: [
      { name: t.continuar[0], short_name: t.continuar[1], description: t.continuar[2], url: "/enfoque", icons: [icono] },
      { name: t.hoy[0], short_name: t.hoy[1], description: t.hoy[2], url: "/?tab=actividad", icons: [icono] },
    ],
  };
}
