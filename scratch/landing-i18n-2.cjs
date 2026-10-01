const fs = require("fs");
const T = {
  es: { temaTitulo: "Cámbiala a tu gusto: prueba un estilo", temas: { clasico: "Clásico", brutalista: "Brutalista", consola: "Consola", hacker: "Terminal" },
        discordHora: "Hoy a las 16:20", discordAnuncio: "acaba de conseguir el platino de", discordRareza: "Rareza en la comunidad", discordDificultad: "Dificultad media: {n}/10" },
  en: { temaTitulo: "Make it yours: try a style", temas: { clasico: "Classic", brutalista: "Brutalist", consola: "Console", hacker: "Terminal" },
        discordHora: "Today at 4:20 PM", discordAnuncio: "just earned the platinum for", discordRareza: "Community rarity", discordDificultad: "Average difficulty: {n}/10" },
  de: { temaTitulo: "Mach sie zu deiner: probier einen Stil", temas: { clasico: "Klassisch", brutalista: "Brutalistisch", consola: "Konsole", hacker: "Terminal" },
        discordHora: "Heute um 16:20", discordAnuncio: "hat gerade die Platin geholt in", discordRareza: "Seltenheit in der Community", discordDificultad: "Durchschnittliche Schwierigkeit: {n}/10" },
  fr: { temaTitulo: "À ton goût : essaie un style", temas: { clasico: "Classique", brutalista: "Brutaliste", consola: "Console", hacker: "Terminal" },
        discordHora: "Aujourd'hui à 16:20", discordAnuncio: "vient d'obtenir le platine de", discordRareza: "Rareté dans la communauté", discordDificultad: "Difficulté moyenne : {n}/10" },
};
for (const lang of Object.keys(T)) {
  const p = `messages/Shell/${lang}.json`;
  const d = JSON.parse(fs.readFileSync(p, "utf-8"));
  Object.assign(d.Home.landing, T[lang]);
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
}
console.log("ok");
