const fs = require("fs");
const T = {
  es: {
    ajustesNav: { titulo: "Ajustes", grupoPerfil: "Tu perfil", grupoCuenta: "Cuenta", grupoPanel: "Panel y menú" },
    appearanceSettings: {
      gameTitle: "Desde tu juego",
      gameDescription: "Toda la app toma el color de la carátula del juego que elijas. Si ese color se lee mal, se corrige solo.",
      gameEmpty: "Cuando tengas juegos con carátula en la biblioteca, podrás elegir uno aquí.",
      gameFavorite: "Favorito",
      previewTitle: "Vista previa",
      previewHint: "Cambia al momento con lo que elijas.",
      previewNext: "Siguiente platino",
      previewLeft: "{n} trofeos para el platino",
      previewButton: "Ver ruta",
    },
    profileForm: { previewTitle: "Así te ven", previewHint: "Se actualiza mientras editas; se guarda al pulsar Guardar." },
  },
  en: {
    ajustesNav: { titulo: "Settings", grupoPerfil: "Your profile", grupoCuenta: "Account", grupoPanel: "Dashboard and menu" },
    appearanceSettings: {
      gameTitle: "From your game",
      gameDescription: "The whole app takes the colour of the cover of the game you pick. If that colour is hard to read, it is corrected automatically.",
      gameEmpty: "Once you have games with covers in your library, you can pick one here.",
      gameFavorite: "Favourite",
      previewTitle: "Preview",
      previewHint: "Updates instantly with what you pick.",
      previewNext: "Next platinum",
      previewLeft: "{n} trophies to the platinum",
      previewButton: "See route",
    },
    profileForm: { previewTitle: "How others see you", previewHint: "Updates as you edit; saved when you press Save." },
  },
  de: {
    ajustesNav: { titulo: "Einstellungen", grupoPerfil: "Dein Profil", grupoCuenta: "Konto", grupoPanel: "Dashboard und Menü" },
    appearanceSettings: {
      gameTitle: "Aus deinem Spiel",
      gameDescription: "Die ganze App übernimmt die Farbe des Covers des gewählten Spiels. Ist die Farbe schlecht lesbar, wird sie automatisch korrigiert.",
      gameEmpty: "Sobald du Spiele mit Cover in deiner Bibliothek hast, kannst du hier eines wählen.",
      gameFavorite: "Favorit",
      previewTitle: "Vorschau",
      previewHint: "Ändert sich sofort mit deiner Auswahl.",
      previewNext: "Nächste Platin",
      previewLeft: "{n} Trophäen bis zur Platin",
      previewButton: "Route ansehen",
    },
    profileForm: { previewTitle: "So sehen dich andere", previewHint: "Aktualisiert sich beim Bearbeiten; gespeichert wird mit Speichern." },
  },
  fr: {
    ajustesNav: { titulo: "Réglages", grupoPerfil: "Ton profil", grupoCuenta: "Compte", grupoPanel: "Tableau de bord et menu" },
    appearanceSettings: {
      gameTitle: "Depuis ton jeu",
      gameDescription: "Toute l’appli prend la couleur de la jaquette du jeu choisi. Si cette couleur se lit mal, elle est corrigée automatiquement.",
      gameEmpty: "Quand tu auras des jeux avec jaquette dans ta bibliothèque, tu pourras en choisir un ici.",
      gameFavorite: "Favori",
      previewTitle: "Aperçu",
      previewHint: "Change instantanément selon ton choix.",
      previewNext: "Prochain platine",
      previewLeft: "{n} trophées avant le platine",
      previewButton: "Voir le parcours",
    },
    profileForm: { previewTitle: "Ce que voient les autres", previewHint: "Se met à jour pendant l’édition ; enregistré avec Enregistrer." },
  },
};
for (const [lang, grupos] of Object.entries(T)) {
  const f = `messages/Onboarding/${lang}.json`;
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const [g, keys] of Object.entries(grupos)) { if (!j[g]) throw new Error(lang + g); Object.assign(j[g], keys); }
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n");
}
console.log("ok");
