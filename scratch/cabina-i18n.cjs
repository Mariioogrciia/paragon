const fs = require("fs");
const T = {
  es: { editarPanel: "Editar panel", lecturas: "Lecturas", cabinaPie: "{n, plural, =0 {Todos los módulos a la vista} one {# módulo oculto} other {# módulos ocultos}}", cabinaPieAccion: "Elige qué módulos ves" },
  en: { editarPanel: "Edit dashboard", lecturas: "Readouts", cabinaPie: "{n, plural, =0 {Every module on display} one {# module hidden} other {# modules hidden}}", cabinaPieAccion: "Choose which modules you see" },
  de: { editarPanel: "Dashboard bearbeiten", lecturas: "Anzeigen", cabinaPie: "{n, plural, =0 {Alle Module sichtbar} one {# Modul ausgeblendet} other {# Module ausgeblendet}}", cabinaPieAccion: "Wähle, welche Module du siehst" },
  fr: { editarPanel: "Modifier le tableau de bord", lecturas: "Relevés", cabinaPie: "{n, plural, =0 {Tous les modules affichés} one {# module masqué} other {# modules masqués}}", cabinaPieAccion: "Choisis les modules à afficher" },
};
for (const [lang, keys] of Object.entries(T)) {
  const f = `messages/Shell/${lang}.json`;
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  Object.assign(j.Home, keys);
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n");
  console.log(lang, Object.keys(keys).every((k) => j.Home[k] === keys[k]));
}
