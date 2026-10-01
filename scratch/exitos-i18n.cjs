const fs = require("fs");
const T = {
  es: {
    DescubrirPage: { nuevasEntradas: "Nuevas entradas", nuevasEntradasDesc: "Recién salidos o a punto de salir, por expectación.", top: "Top de la comunidad", topDesc: "Lo que más cazadores han empezado en los últimos 30 días.", cazadoresNuevos: "{n, plural, one {# cazador nuevo} other {# cazadores nuevos}}", votos: "{n, plural, one {# voto} other {# votos}}", joyasNota: "Nota media" },
    HeroCarousel: { puesto: "Nº {n}", destacados: "Destacados recientes" },
    UpcomingGames: { colFecha: "Fecha", colJuego: "Juego", colPlataformas: "Plataformas", colEstado: "Estado", porConfirmar: "Por confirmar" },
  },
  en: {
    DescubrirPage: { nuevasEntradas: "New entries", nuevasEntradasDesc: "Just out or about to land, by hype.", top: "Community top", topDesc: "What the most hunters have started in the last 30 days.", cazadoresNuevos: "{n, plural, one {# new hunter} other {# new hunters}}", votos: "{n, plural, one {# vote} other {# votes}}", joyasNota: "Average score" },
    HeroCarousel: { puesto: "No. {n}", destacados: "Recent highlights" },
    UpcomingGames: { colFecha: "Date", colJuego: "Game", colPlataformas: "Platforms", colEstado: "Status", porConfirmar: "TBC" },
  },
  de: {
    DescubrirPage: { nuevasEntradas: "Neueinsteiger", nuevasEntradasDesc: "Gerade erschienen oder kurz davor, nach Hype.", top: "Community-Top", topDesc: "Was die meisten Jäger in den letzten 30 Tagen angefangen haben.", cazadoresNuevos: "{n, plural, one {# neuer Jäger} other {# neue Jäger}}", votos: "{n, plural, one {# Stimme} other {# Stimmen}}", joyasNota: "Durchschnittsnote" },
    HeroCarousel: { puesto: "Nr. {n}", destacados: "Aktuelle Highlights" },
    UpcomingGames: { colFecha: "Datum", colJuego: "Spiel", colPlataformas: "Plattformen", colEstado: "Status", porConfirmar: "Noch offen" },
  },
  fr: {
    DescubrirPage: { nuevasEntradas: "Nouvelles entrées", nuevasEntradasDesc: "Tout juste sortis ou sur le point de sortir, par attente.", top: "Top de la communauté", topDesc: "Ce que le plus de chasseurs ont commencé ces 30 derniers jours.", cazadoresNuevos: "{n, plural, one {# nouveau chasseur} other {# nouveaux chasseurs}}", votos: "{n, plural, one {# vote} other {# votes}}", joyasNota: "Note moyenne" },
    HeroCarousel: { puesto: "N° {n}", destacados: "À la une récemment" },
    UpcomingGames: { colFecha: "Date", colJuego: "Jeu", colPlataformas: "Plateformes", colEstado: "Statut", porConfirmar: "À confirmer" },
  },
};
for (const [lang, grupos] of Object.entries(T)) {
  const f = `messages/Descubrir/${lang}.json`;
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const [g, keys] of Object.entries(grupos)) { if (!j[g]) throw new Error(lang + g); Object.assign(j[g], keys); }
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n");
}
console.log("ok");
