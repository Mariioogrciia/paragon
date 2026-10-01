const fs = require("fs");
const T = {
  es: {
    ejemplo: "Ejemplo",
    convergenciaTitulo: "Cuatro listas de trofeos. Un solo cazador.",
    convergenciaTexto: "Tus trofeos de PlayStation y tus logros de Steam, Xbox y Epic viven en cuatro apps que no se hablan. Paragon los junta en un perfil, un nivel y un único platino más cercano.",
    nivelParagon: "Nivel Paragon",
    trofeosEnPlataformas: "{n} trofeos · 4 plataformas",
    tu: "Tú",
    vitrinaVacia: "Esta semana todavía no hay trofeos raros cazados. Estos son los últimos platinos:",
    cartelaRareza: "{percent} % del mundo",
    cartelaPor: "por @{handle}",
    statsLinea: "{trofeos} trofeos contados en {juegos} juegos, y {platinos} platinos entre todos.",
    rutaTitulo: "La caza, paso a paso",
    rutaDescripcion: "Lo que pasa desde que dices quién eres hasta que subes en la liga.",
    pasos: {
      p1: { titulo: "Di quién eres", cuerpo: "Tu ID público de PlayStation, tu usuario de Steam, tu Gamertag o tu perfil de Epic. Ni contraseñas, ni tokens, ni permisos." },
      p2: { titulo: "Te decimos a por qué ir", cuerpo: "El platino que tienes más a mano, la ruta más corta hasta él y los trofeos perdibles antes de que se te escapen." },
      p3: { titulo: "Mírate contra tus amigos", cuerpo: "Juego a juego, barra contra barra. Retos con plazo, platinar juntos y quién va por delante esta semana." },
      p4: { titulo: "Compite cada mes", cuerpo: "Liga mensual, temporadas, clanes y guerras de clanes. El día 1 todo el mundo vuelve a empezar de cero." }
    }
  },
  en: {
    ejemplo: "Example",
    convergenciaTitulo: "Four trophy lists. One hunter.",
    convergenciaTexto: "Your PlayStation trophies and your Steam, Xbox and Epic achievements live in four apps that never talk. Paragon merges them into one profile, one level and one closest platinum.",
    nivelParagon: "Paragon level",
    trofeosEnPlataformas: "{n} trophies · 4 platforms",
    tu: "You",
    vitrinaVacia: "No rare trophies hunted yet this week. Here are the latest platinums:",
    cartelaRareza: "{percent}% of the world",
    cartelaPor: "by @{handle}",
    statsLinea: "{trofeos} trophies counted across {juegos} games, and {platinos} platinums between us.",
    rutaTitulo: "The hunt, step by step",
    rutaDescripcion: "What happens from the moment you say who you are until you climb the league.",
    pasos: {
      p1: { titulo: "Say who you are", cuerpo: "Your public PlayStation ID, Steam username, Gamertag or Epic profile. No passwords, no tokens, no permissions." },
      p2: { titulo: "We tell you what to go for", cuerpo: "The platinum closest to hand, the shortest route to it and the missable trophies before they slip away." },
      p3: { titulo: "Measure up against friends", cuerpo: "Game by game, bar against bar. Timed challenges, platinum together and who's ahead this week." },
      p4: { titulo: "Compete every month", cuerpo: "Monthly league, seasons, clans and clan wars. On day 1 everyone starts again from zero." }
    }
  },
  de: {
    ejemplo: "Beispiel",
    convergenciaTitulo: "Vier Trophäenlisten. Ein Jäger.",
    convergenciaTexto: "Deine PlayStation-Trophäen und deine Erfolge auf Steam, Xbox und Epic leben in vier Apps, die nicht miteinander reden. Paragon führt sie zu einem Profil, einem Level und einer nächsten Platin zusammen.",
    nivelParagon: "Paragon-Level",
    trofeosEnPlataformas: "{n} Trophäen · 4 Plattformen",
    tu: "Du",
    vitrinaVacia: "Diese Woche wurden noch keine seltenen Trophäen gejagt. Hier die letzten Platins:",
    cartelaRareza: "{percent} % der Welt",
    cartelaPor: "von @{handle}",
    statsLinea: "{trofeos} gezählte Trophäen in {juegos} Spielen und {platinos} Platins insgesamt.",
    rutaTitulo: "Die Jagd, Schritt für Schritt",
    rutaDescripcion: "Was passiert, von dem Moment, in dem du sagst, wer du bist, bis du in der Liga aufsteigst.",
    pasos: {
      p1: { titulo: "Sag, wer du bist", cuerpo: "Deine öffentliche PlayStation-ID, dein Steam-Name, dein Gamertag oder dein Epic-Profil. Keine Passwörter, keine Tokens, keine Berechtigungen." },
      p2: { titulo: "Wir sagen dir, worauf du gehen sollst", cuerpo: "Die Platin, die dir am nächsten ist, der kürzeste Weg dorthin und die verpassbaren Trophäen, bevor sie dir entgehen." },
      p3: { titulo: "Miss dich mit deinen Freunden", cuerpo: "Spiel für Spiel, Balken gegen Balken. Herausforderungen mit Frist, gemeinsam platinieren und wer diese Woche vorne liegt." },
      p4: { titulo: "Tritt jeden Monat an", cuerpo: "Monatsliga, Saisons, Clans und Clankriege. Am 1. fangen alle wieder bei null an." }
    }
  },
  fr: {
    ejemplo: "Exemple",
    convergenciaTitulo: "Quatre listes de trophées. Un seul chasseur.",
    convergenciaTexto: "Tes trophées PlayStation et tes succès Steam, Xbox et Epic vivent dans quatre applis qui ne se parlent pas. Paragon les réunit en un profil, un niveau et un seul platine le plus proche.",
    nivelParagon: "Niveau Paragon",
    trofeosEnPlataformas: "{n} trophées · 4 plateformes",
    tu: "Toi",
    vitrinaVacia: "Aucun trophée rare chassé cette semaine pour l'instant. Voici les derniers platines :",
    cartelaRareza: "{percent} % du monde",
    cartelaPor: "par @{handle}",
    statsLinea: "{trofeos} trophées comptés sur {juegos} jeux, et {platinos} platines au total.",
    rutaTitulo: "La chasse, étape par étape",
    rutaDescripcion: "Ce qui se passe entre le moment où tu dis qui tu es et celui où tu grimpes dans la ligue.",
    pasos: {
      p1: { titulo: "Dis qui tu es", cuerpo: "Ton ID PlayStation public, ton pseudo Steam, ton Gamertag ou ton profil Epic. Ni mot de passe, ni jeton, ni autorisation." },
      p2: { titulo: "On te dit quoi viser", cuerpo: "Le platine le plus à portée, le chemin le plus court pour y arriver et les trophées manquables avant qu'ils ne t'échappent." },
      p3: { titulo: "Mesure-toi à tes amis", cuerpo: "Jeu par jeu, barre contre barre. Défis avec échéance, platiner ensemble et qui mène cette semaine." },
      p4: { titulo: "Affronte-les chaque mois", cuerpo: "Ligue mensuelle, saisons, clans et guerres de clans. Le 1er, tout le monde repart de zéro." }
    }
  }
};
for (const lang of Object.keys(T)) {
  const p = `messages/Shell/${lang}.json`;
  const d = JSON.parse(fs.readFileSync(p, "utf-8"));
  d.Home.landing = T[lang];
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
}
console.log("ok");
