const fs = require("fs");
const T = {
  es: { dif: "Dif.", lider: "Líder", clanes: { titulo: "Clanes de cazadores", descripcion: "Únete a un clan y suma fuerzas para dominar Paragon.", tuClan: "Tu clan: [{tag}] {nombre}", miembros: "{n, plural, one {# miembro} other {# miembros}}", vacio: "Todavía no hay ningún clan. ¡Sé el primero en crear uno!" },
        clan: { noEncontrado: "Clan no encontrado", xpTotal: "XP total del clan", miembros: "Miembros", actividad: "Actividad del clan", ranking: "Clasificación ({n})", lider: "Líder", miembro: "Miembro", trofeos: "{n} trofeos" } },
  en: { dif: "Gap", lider: "Leader", clanes: { titulo: "Hunter clans", descripcion: "Join a clan and team up to rule Paragon.", tuClan: "Your clan: [{tag}] {nombre}", miembros: "{n, plural, one {# member} other {# members}}", vacio: "No clans yet. Be the first to create one!" },
        clan: { noEncontrado: "Clan not found", xpTotal: "Clan total XP", miembros: "Members", actividad: "Clan activity", ranking: "Standings ({n})", lider: "Leader", miembro: "Member", trofeos: "{n} trophies" } },
  de: { dif: "Abst.", lider: "Führung", clanes: { titulo: "Jäger-Clans", descripcion: "Tritt einem Clan bei und erobert Paragon gemeinsam.", tuClan: "Dein Clan: [{tag}] {nombre}", miembros: "{n, plural, one {# Mitglied} other {# Mitglieder}}", vacio: "Noch keine Clans. Gründe den ersten!" },
        clan: { noEncontrado: "Clan nicht gefunden", xpTotal: "Gesamt-XP des Clans", miembros: "Mitglieder", actividad: "Clan-Aktivität", ranking: "Rangliste ({n})", lider: "Anführer", miembro: "Mitglied", trofeos: "{n} Trophäen" } },
  fr: { dif: "Écart", lider: "Leader", clanes: { titulo: "Clans de chasseurs", descripcion: "Rejoins un clan et unissez vos forces pour dominer Paragon.", tuClan: "Ton clan : [{tag}] {nombre}", miembros: "{n, plural, one {# membre} other {# membres}}", vacio: "Aucun clan pour l'instant. Sois le premier à en créer un !" },
        clan: { noEncontrado: "Clan introuvable", xpTotal: "XP total du clan", miembros: "Membres", actividad: "Activité du clan", ranking: "Classement ({n})", lider: "Chef", miembro: "Membre", trofeos: "{n} trophées" } },
};
for (const l of Object.keys(T)) {
  const p = `messages/Perfil/${l}.json`;
  const d = JSON.parse(fs.readFileSync(p, "utf8"));
  d.LigasPage.colDif = T[l].dif; d.LigasPage.lider = T[l].lider;
  d.LigaPage.colDif = T[l].dif; d.LigaPage.lider = T[l].lider;
  d.ClanesPage = T[l].clanes; d.ClanPage = T[l].clan;
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
}
console.log("ok");
