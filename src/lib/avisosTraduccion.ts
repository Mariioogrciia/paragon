import type { Idioma } from "@/lib/idiomasTrofeo";
import { traducirMensaje } from "@/lib/mensajesApi";

/**
 * Los avisos (push, DM de Discord y la bandeja) en el idioma de cada
 * persona (16 oct 2026). Los avisos se escriben en español donde se generan
 * (lib/sync.ts, lib/avisosAutomaticos.ts, lib/sesiones.ts...) y se traducen
 * al salir: en `enviarPush`, `enviarPushFcm` y `enviarDmSiActivo` con el
 * idioma de quien lo recibe (`users.language`), y en la bandeja al leerla.
 *
 * Igual que `traducirMensaje` (lib/mensajesApi.ts), con textos fijos y
 * patrones; un aviso de varias líneas se traduce línea a línea. Si un texto
 * no está aquí, sale en español: mejor eso que nada.
 *
 * **Si cambias la redacción de un aviso en español, cámbiala también aquí**
 * (los tests de tests/avisosTraduccion.test.ts usan las frases reales).
 */

type Trad = Record<Exclude<Idioma, "es">, string>;

const FIJOS: Record<string, Trad> = {
  "✅ Paragon conectado": { en: "✅ Paragon connected", de: "✅ Paragon verbunden", fr: "✅ Paragon connecté" },
  "Cuando consigas un trofeo nuevo, se avisa aquí.": { en: "When you earn a new trophy, you'll be notified here.", de: "Wenn du eine neue Trophäe holst, wirst du hier benachrichtigt.", fr: "Quand tu obtiens un nouveau trophée, tu es prévenu ici." },
  "Nueva solicitud de amistad": { en: "New friend request", de: "Neue Freundschaftsanfrage", fr: "Nouvelle demande d'ami" },
  "🤝 Solicitud aceptada": { en: "🤝 Request accepted", de: "🤝 Anfrage angenommen", fr: "🤝 Demande acceptée" },
  "Invitación a una liga": { en: "League invite", de: "Liga-Einladung", fr: "Invitation à une ligue" },
  "Invitación a un clan": { en: "Clan invite", de: "Clan-Einladung", fr: "Invitation à un clan" },
  "🏆 ¡Platino conseguido!": { en: "🏆 Platinum earned!", de: "🏆 Platin erreicht!", fr: "🏆 Platine obtenu !" },
  "1 trofeo nuevo": { en: "1 new trophy", de: "1 neue Trophäe", fr: "1 nouveau trophée" },
  "Está en tu lista de deseados de Paragon.": { en: "It's on your Paragon wishlist.", de: "Es steht auf deiner Paragon-Wunschliste.", fr: "Il est dans ta liste de souhaits Paragon." },
  "❌ Sesión cancelada": { en: "❌ Session cancelled", de: "❌ Sitzung abgesagt", fr: "❌ Session annulée" },
  "⚔️ Os han retado a una guerra de clanes": { en: "⚔️ Your clan has been challenged to a clan war", de: "⚔️ Euer Clan wurde zu einem Clankrieg herausgefordert", fr: "⚔️ Votre clan a été défié dans une guerre de clans" },
  "⚔️ ¡Empieza la guerra de clanes!": { en: "⚔️ The clan war begins!", de: "⚔️ Der Clankrieg beginnt!", fr: "⚔️ La guerre de clans commence !" },
  "🤝 Reto aceptado": { en: "🤝 Challenge accepted", de: "🤝 Herausforderung angenommen", fr: "🤝 Défi accepté" },
  "Lo habéis terminado los dos a tiempo.": { en: "You both finished it in time.", de: "Ihr habt es beide rechtzeitig geschafft.", fr: "Vous l'avez terminé tous les deux à temps." },
  "El reto conjunto ha vencido. ¿Otro intento?": { en: "The joint challenge has expired. Another try?", de: "Die gemeinsame Herausforderung ist abgelaufen. Noch ein Versuch?", fr: "Le défi commun a expiré. Une autre tentative ?" },
  "⚔️ Reto aceptado": { en: "⚔️ Challenge accepted", de: "⚔️ Herausforderung angenommen", fr: "⚔️ Défi accepté" },
  "⚔️ Reto sin rivales": { en: "⚔️ Challenge with no rivals", de: "⚔️ Herausforderung ohne Gegner", fr: "⚔️ Défi sans adversaires" },
  "⚔️ Reto terminado": { en: "⚔️ Challenge over", de: "⚔️ Herausforderung beendet", fr: "⚔️ Défi terminé" },
  "🏆 ¡Empate en cabeza!": { en: "🏆 Tied for first!", de: "🏆 Gleichstand an der Spitze!", fr: "🏆 Égalité en tête !" },
  "🏆 ¡Has ganado el reto!": { en: "🏆 You won the challenge!", de: "🏆 Du hast die Herausforderung gewonnen!", fr: "🏆 Tu as gagné le défi !" },
  "Nadie sumó puntos durante la liga: no hay ganador.": { en: "Nobody scored during the league: there's no winner.", de: "Niemand hat in der Liga gepunktet: Es gibt keinen Sieger.", fr: "Personne n'a marqué pendant la ligue : pas de gagnant." },
};

const MESES: Record<string, Trad> = {
  enero: { en: "January", de: "Januar", fr: "janvier" },
  febrero: { en: "February", de: "Februar", fr: "février" },
  marzo: { en: "March", de: "März", fr: "mars" },
  abril: { en: "April", de: "April", fr: "avril" },
  mayo: { en: "May", de: "Mai", fr: "mai" },
  junio: { en: "June", de: "Juni", fr: "juin" },
  julio: { en: "July", de: "Juli", fr: "juillet" },
  agosto: { en: "August", de: "August", fr: "août" },
  septiembre: { en: "September", de: "September", fr: "septembre" },
  octubre: { en: "October", de: "Oktober", fr: "octobre" },
  noviembre: { en: "November", de: "November", fr: "novembre" },
  diciembre: { en: "December", de: "Dezember", fr: "décembre" },
};

/** "15 de noviembre" (toLocaleDateString es-ES) en cada idioma. */
function fecha(dia: string, mes: string): Trad {
  const m = MESES[mes] ?? { en: mes, de: mes, fr: mes };
  return { en: `${m.en} ${dia}`, de: `${dia}. ${m.de}`, fr: `${dia} ${m.fr}` };
}

const s = (n: string) => (n === "1" ? "" : "s");

const PATRONES: { re: RegExp; trad: (m: RegExpMatchArray) => Trad }[] = [
  // Amigos, ligas y clanes.
  { re: /^(.*) quiere ser tu amigo en Paragon\.$/, trad: (m) => ({ en: `${m[1]} wants to be your friend on Paragon.`, de: `${m[1]} möchte auf Paragon mit dir befreundet sein.`, fr: `${m[1]} veut être ton ami sur Paragon.` }) },
  { re: /^(.*) ya es tu amigo en Paragon\.$/, trad: (m) => ({ en: `${m[1]} is now your friend on Paragon.`, de: `${m[1]} ist jetzt auf Paragon mit dir befreundet.`, fr: `${m[1]} est maintenant ton ami sur Paragon.` }) },
  { re: /^(.*) te ha invitado a la liga "(.*)" en Paragon\.$/, trad: (m) => ({ en: `${m[1]} invited you to the league "${m[2]}" on Paragon.`, de: `${m[1]} hat dich in die Liga „${m[2]}“ auf Paragon eingeladen.`, fr: `${m[1]} t'a invité dans la ligue « ${m[2]} » sur Paragon.` }) },
  { re: /^(.*) te invita a unirte a (\[.*\] .*)\.$/, trad: (m) => ({ en: `${m[1]} invites you to join ${m[2]}.`, de: `${m[1]} lädt dich ein, ${m[2]} beizutreten.`, fr: `${m[1]} t'invite à rejoindre ${m[2]}.` }) },
  { re: /^🏆 (.*) ha sacado un platino$/, trad: (m) => ({ en: `🏆 ${m[1]} earned a platinum`, de: `🏆 ${m[1]} hat ein Platin geholt`, fr: `🏆 ${m[1]} a obtenu un platine` }) },

  // Trofeos.
  { re: /^(\d+) trofeos nuevos$/, trad: (m) => ({ en: `${m[1]} new trophies`, de: `${m[1]} neue Trophäen`, fr: `${m[1]} nouveaux trophées` }) },
  { re: /^⚠️ (.*) tiene (\d+) trofeos? perdibles?$/, trad: (m) => ({ en: `⚠️ ${m[1]} has ${m[2]} missable troph${m[2] === "1" ? "y" : "ies"}`, de: `⚠️ ${m[1]} hat ${m[2]} verpassbare Trophäe${m[2] === "1" ? "" : "n"}`, fr: `⚠️ ${m[1]} a ${m[2]} trophée${s(m[2])} manquable${s(m[2])}` }) },
  { re: /^Míralos antes de avanzar: (.*)$/, trad: (m) => ({ en: `Check them before moving on: ${m[1]}`, de: `Sieh sie dir an, bevor du weitermachst: ${m[1]}`, fr: `Regarde-les avant d'avancer : ${m[1]}` }) },
  { re: /^🎮 ¡(.*) sale hoy!$/, trad: (m) => ({ en: `🎮 ${m[1]} is out today!`, de: `🎮 ${m[1]} erscheint heute!`, fr: `🎮 ${m[1]} sort aujourd'hui !` }) },
  { re: /^🎮 (.*) sale mañana$/, trad: (m) => ({ en: `🎮 ${m[1]} is out tomorrow`, de: `🎮 ${m[1]} erscheint morgen`, fr: `🎮 ${m[1]} sort demain` }) },
  { re: /^💸 (.*) a (\S+\s€)$/, trad: (m) => ({ en: `💸 ${m[1]} for ${m[2]}`, de: `💸 ${m[1]} für ${m[2]}`, fr: `💸 ${m[1]} à ${m[2]}` }) },
  { re: /^Ha bajado de tu objetivo de (\S+\s€) en Steam( \(-\d+%\))?\.$/, trad: (m) => ({ en: `It dropped below your target of ${m[1]} on Steam${m[2] ?? ""}.`, de: `Unter dein Ziel von ${m[1]} bei Steam gefallen${m[2] ?? ""}.`, fr: `Il est passé sous ton objectif de ${m[1]} sur Steam${m[2] ?? ""}.` }) },

  // Liga del mes, ligas privadas y temporada.
  { re: /^📉 (.*) te ha adelantado en la liga$/, trad: (m) => ({ en: `📉 ${m[1]} overtook you in the league`, de: `📉 ${m[1]} hat dich in der Liga überholt`, fr: `📉 ${m[1]} t'a dépassé dans la ligue` }) },
  { re: /^Ahora vas (\d+)º de (\d+) en la liga del mes \((\d+) puntos por detrás\)\.$/, trad: (m) => ({ en: `You're now ${m[1]} of ${m[2]} in this month's league (${m[3]} points behind).`, de: `Du bist jetzt ${m[1]}. von ${m[2]} in der Monatsliga (${m[3]} Punkte dahinter).`, fr: `Tu es maintenant ${m[1]}e sur ${m[2]} dans la ligue du mois (${m[3]} points derrière).` }) },
  { re: /^🏆 ¡Empate en lo más alto de «(.*)»!$/, trad: (m) => ({ en: `🏆 Tied for first in “${m[1]}”!`, de: `🏆 Gleichstand an der Spitze von „${m[1]}“!`, fr: `🏆 Égalité en tête de « ${m[1]} » !` }) },
  { re: /^🏆 ¡Has ganado la liga «(.*)»!$/, trad: (m) => ({ en: `🏆 You won the league “${m[1]}”!`, de: `🏆 Du hast die Liga „${m[1]}“ gewonnen!`, fr: `🏆 Tu as gagné la ligue « ${m[1]} » !` }) },
  { re: /^La liga ha terminado: (\d+) puntos\. Ya está en tu palmarés\.$/, trad: (m) => ({ en: `The league is over: ${m[1]} points. It's in your trophy case now.`, de: `Die Liga ist vorbei: ${m[1]} Punkte. Sie ist jetzt in deiner Vitrine.`, fr: `La ligue est terminée : ${m[1]} points. Elle est dans ton palmarès.` }) },
  { re: /^🏁 Ha terminado la liga «(.*)»$/, trad: (m) => ({ en: `🏁 The league “${m[1]}” is over`, de: `🏁 Die Liga „${m[1]}“ ist vorbei`, fr: `🏁 La ligue « ${m[1]} » est terminée` }) },
  { re: /^Ganó (.*) con (\d+) puntos\. Tú quedaste (\d+)\.º de (\d+)\.$/, trad: (m) => ({ en: `${m[1]} won with ${m[2]} points. You finished ${m[3]} of ${m[4]}.`, de: `${m[1]} hat mit ${m[2]} Punkten gewonnen. Du bist ${m[3]}. von ${m[4]} geworden.`, fr: `${m[1]} a gagné avec ${m[2]} points. Tu as fini ${m[3]}e sur ${m[4]}.` }) },
  { re: /^(.+) Temporada (T\d \d{4}) cerrada: nivel (\d+)$/, trad: (m) => ({ en: `${m[1]} Season ${m[2]} closed: level ${m[3]}`, de: `${m[1]} Saison ${m[2]} beendet: Stufe ${m[3]}`, fr: `${m[1]} Saison ${m[2]} terminée : niveau ${m[3]}` }) },
  { re: /^Temporada (T\d \d{4}) cerrada$/, trad: (m) => ({ en: `Season ${m[1]} closed`, de: `Saison ${m[1]} beendet`, fr: `Saison ${m[1]} terminée` }) },
  { re: /^(\d+) puntos · (\d+)º de (\d+)\. Empieza una temporada nueva, desde cero\.$/, trad: (m) => ({ en: `${m[1]} points · ${m[2]} of ${m[3]}. A new season starts, from zero.`, de: `${m[1]} Punkte · ${m[2]}. von ${m[3]}. Eine neue Saison beginnt, bei null.`, fr: `${m[1]} points · ${m[2]}e sur ${m[3]}. Une nouvelle saison commence, à zéro.` }) },

  // Guerras de clanes.
  { re: /^(\[.*\]) (.*) reta a tu clan a (\d+) días de caza\. Acepta o rechaza desde la página del clan\.$/, trad: (m) => ({ en: `${m[1]} ${m[2]} challenges your clan to ${m[3]} days of hunting. Accept or decline from the clan page.`, de: `${m[1]} ${m[2]} fordert deinen Clan zu ${m[3]} Tagen Jagd heraus. Nimm an oder lehne ab auf der Clanseite.`, fr: `${m[1]} ${m[2]} défie ton clan pour ${m[3]} jours de chasse. Accepte ou refuse depuis la page du clan.` }) },
  { re: /^(\[.*\]) contra (\[.*\]) durante (\d+) días\. Cada trofeo de cualquier miembro suma\.$/, trad: (m) => ({ en: `${m[1]} vs ${m[2]} for ${m[3]} days. Every trophy from any member counts.`, de: `${m[1]} gegen ${m[2]} für ${m[3]} Tage. Jede Trophäe jedes Mitglieds zählt.`, fr: `${m[1]} contre ${m[2]} pendant ${m[3]} jours. Chaque trophée de chaque membre compte.` }) },
  {
    re: /^⚔️ (Empate|¡Victoria!|Derrota) en la guerra de clanes$/,
    trad: (m) => {
      const r = { Empate: { en: "Draw", de: "Unentschieden", fr: "Égalité" }, "¡Victoria!": { en: "Victory!", de: "Sieg!", fr: "Victoire !" }, Derrota: { en: "Defeat", de: "Niederlage", fr: "Défaite" } }[m[1]]!;
      return { en: `⚔️ ${r.en} in the clan war`, de: `⚔️ ${r.de} im Clankrieg`, fr: `⚔️ ${r.fr} dans la guerre de clans` };
    },
  },

  // Platinar juntos y retos entre amigos.
  { re: /^🤝 (.*) te propone platinar juntos$/, trad: (m) => ({ en: `🤝 ${m[1]} suggests going for a platinum together`, de: `🤝 ${m[1]} schlägt vor, gemeinsam zu platinieren`, fr: `🤝 ${m[1]} te propose de platiner ensemble` }) },
  {
    re: /^(.*) antes del (\d+) de (\p{L}+)\. Acéptalo desde Amigos\.$/u,
    trad: (m) => {
      const f = fecha(m[2], m[3]);
      return { en: `${m[1]} before ${f.en}. Accept it from Friends.`, de: `${m[1]} bis zum ${f.de}. Nimm es unter Freunde an.`, fr: `${m[1]} avant le ${f.fr}. Accepte-le depuis Amis.` };
    },
  },
  { re: /^A por (.*) los dos antes del (\d{4}-\d{2}-\d{2})\.$/, trad: (m) => ({ en: `Going for ${m[1]} together before ${m[2]}.`, de: `Gemeinsam auf ${m[1]} bis ${m[2]}.`, fr: `À vous deux pour ${m[1]} avant le ${m[2]}.` }) },
  { re: /^🏆 ¡Reto conseguido: (.*)!$/, trad: (m) => ({ en: `🏆 Challenge complete: ${m[1]}!`, de: `🏆 Herausforderung geschafft: ${m[1]}!`, fr: `🏆 Défi réussi : ${m[1]} !` }) },
  { re: /^⌛ Se acabó el plazo de (.*)$/, trad: (m) => ({ en: `⌛ Time's up for ${m[1]}`, de: `⌛ Die Frist für ${m[1]} ist abgelaufen`, fr: `⌛ Le délai pour ${m[1]} est écoulé` }) },
  { re: /^⚔️ (.*) te reta$/, trad: (m) => ({ en: `⚔️ ${m[1]} challenges you`, de: `⚔️ ${m[1]} fordert dich heraus`, fr: `⚔️ ${m[1]} te défie` }) },
  {
    re: /^(«.*»: )?quien más trofeos consiga en (\d+) días gana\. Acéptalo desde Amigos\.$/,
    trad: (m) => {
      const t = m[1] ?? "";
      return { en: `${t}whoever earns the most trophies in ${m[2]} days wins. Accept it from Friends.`, de: `${t}wer in ${m[2]} Tagen die meisten Trophäen holt, gewinnt. Nimm es unter Freunde an.`, fr: `${t}celui qui obtient le plus de trophées en ${m[2]} jours gagne. Accepte-le depuis Amis.` };
    },
  },
  { re: /^(.*) entra en tu reto\.$/, trad: (m) => ({ en: `${m[1]} joins your challenge.`, de: `${m[1]} macht bei deiner Herausforderung mit.`, fr: `${m[1]} rejoint ton défi.` }) },
  { re: /^Nadie aceptó (.*) a tiempo\.$/, trad: (m) => ({ en: `Nobody accepted ${m[1]} in time.`, de: `Niemand hat ${m[1]} rechtzeitig angenommen.`, fr: `Personne n'a accepté ${m[1]} à temps.` }) },
  { re: /^(.*) acabó sin trofeos para nadie: empate a cero\.$/, trad: (m) => ({ en: `${m[1]} ended with no trophies for anyone: a goalless draw.`, de: `${m[1]} endete ohne Trophäen für alle: torloses Unentschieden.`, fr: `${m[1]} s'est terminé sans trophée pour personne : match nul.` }) },
  { re: /^Gana (.*) en (.*)\. Tú: (\d+) trofeos\.$/, trad: (m) => ({ en: `${m[1]} wins ${m[2]}. You: ${m[3]} trophies.`, de: `${m[1]} gewinnt ${m[2]}. Du: ${m[3]} Trophäen.`, fr: `${m[1]} gagne ${m[2]}. Toi : ${m[3]} trophées.` }) },
  { re: /^(.*): (\d+) trofeos\.$/, trad: (m) => ({ en: `${m[1]}: ${m[2]} trophies.`, de: `${m[1]}: ${m[2]} Trophäen.`, fr: `${m[1]} : ${m[2]} trophées.` }) },

  // Sesiones (los avisos de "se ha unido" llevan varias líneas).
  { re: /^🎮 (.*) se ha unido a tu sesión$/, trad: (m) => ({ en: `🎮 ${m[1]} joined your session`, de: `🎮 ${m[1]} ist deiner Sitzung beigetreten`, fr: `🎮 ${m[1]} a rejoint ta session` }) },
  { re: /^🎮 (.*) se ha unido a la sesión$/, trad: (m) => ({ en: `🎮 ${m[1]} joined the session`, de: `🎮 ${m[1]} ist der Sitzung beigetreten`, fr: `🎮 ${m[1]} a rejoint la session` }) },
  { re: /^👋 (.*) se ha salido de tu sesión$/, trad: (m) => ({ en: `👋 ${m[1]} left your session`, de: `👋 ${m[1]} hat deine Sitzung verlassen`, fr: `👋 ${m[1]} a quitté ta session` }) },
  {
    re: /^(\d+)\/(\d+) plazas ocupadas · (?:(¡completa!)|queda 1 libre|quedan (\d+) libres|(\d+) libres)$/,
    trad: (m) => {
      const libres = m[3] ? null : (m[4] ?? m[5] ?? "1");
      const resto = libres === null
        ? { en: "full!", de: "voll!", fr: "complet !" }
        : { en: `${libres} free`, de: `${libres} frei`, fr: `${libres} libre${s(libres)}` };
      return { en: `${m[1]}/${m[2]} spots taken · ${resto.en}`, de: `${m[1]}/${m[2]} Plätze belegt · ${resto.de}`, fr: `${m[1]}/${m[2]} places prises · ${resto.fr}` };
    },
  },
  {
    re: /^Dentro: (.*)$/,
    trad: (m) => ({
      en: `In: ${m[1].replace(" (organiza)", " (host)")}`,
      de: `Dabei: ${m[1].replace(" (organiza)", " (Gastgeber)")}`,
      fr: `Dedans : ${m[1].replace(" (organiza)", " (organise)")}`,
    }),
  },
  { re: /^Se ha cancelado la sesión de «(.*)»\.$/, trad: (m) => ({ en: `The session for "${m[1]}" has been cancelled.`, de: `Die Sitzung für „${m[1]}“ wurde abgesagt.`, fr: `La session pour « ${m[1]} » a été annulée.` }) },
  { re: /^⏰ Sesión en (\d+) min: (.*)$/, trad: (m) => ({ en: `⏰ Session in ${m[1]} min: ${m[2]}`, de: `⏰ Sitzung in ${m[1]} Min.: ${m[2]}`, fr: `⏰ Session dans ${m[1]} min : ${m[2]}` }) },
  { re: /^«(.*)» con (\d+) personas\.$/, trad: (m) => ({ en: `“${m[1]}” with ${m[2]} people.`, de: `„${m[1]}“ mit ${m[2]} Personen.`, fr: `« ${m[1]} » avec ${m[2]} personnes.` }) },
];

function traducirLinea(linea: string, idioma: Exclude<Idioma, "es">): string {
  const fijo = FIJOS[linea];
  if (fijo) return fijo[idioma];
  for (const p of PATRONES) {
    const m = linea.match(p.re);
    if (m) return p.trad(m)[idioma];
  }
  // Algunos avisos reutilizan mensajes de la API (lib/mensajesApi.ts).
  return traducirMensaje(linea, idioma);
}

/** Un aviso (título o texto, de una o varias líneas) en el idioma pedido. */
export function traducirAviso(texto: string, idioma: Idioma): string {
  if (idioma === "es" || !texto) return texto;
  return texto
    .split("\n")
    .map((linea) => traducirLinea(linea, idioma))
    .join("\n");
}
