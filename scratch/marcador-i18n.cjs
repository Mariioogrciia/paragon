const fs = require("fs");
const T = {
  es: { colPos: "Pos", colJugador: "Cazador", colXp: "XP", tuEtiqueta: "Tú", marcadorPie: "Ordenado por XP Paragon" },
  en: { colPos: "Pos", colJugador: "Hunter", colXp: "XP", tuEtiqueta: "You", marcadorPie: "Ranked by Paragon XP" },
  de: { colPos: "Pl.", colJugador: "Jäger", colXp: "XP", tuEtiqueta: "Du", marcadorPie: "Nach Paragon-XP sortiert" },
  fr: { colPos: "Pos", colJugador: "Chasseur", colXp: "XP", tuEtiqueta: "Toi", marcadorPie: "Classé par XP Paragon" },
};
for (const [lang, keys] of Object.entries(T)) {
  const f = `messages/Perfil/${lang}.json`;
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  Object.assign(j.AmigosPage, keys);
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n");
}
console.log("ok");
