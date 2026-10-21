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
 * Italiano y portugués (de Portugal) desde el 21 oct 2026.
 *
 * **Si cambias la redacción de un aviso en español, cámbiala también aquí**
 * (los tests de tests/avisosTraduccion.test.ts usan las frases reales).
 */

type Trad = Record<Exclude<Idioma, "es">, string>;

const FIJOS: Record<string, Trad> = {
  "✅ Paragon conectado": { en: "✅ Paragon connected", de: "✅ Paragon verbunden", fr: "✅ Paragon connecté", it: "✅ Paragon collegato", pt: "✅ Paragon ligado" },
  "Cuando consigas un trofeo nuevo, se avisa aquí.": { en: "When you earn a new trophy, you'll be notified here.", de: "Wenn du eine neue Trophäe holst, wirst du hier benachrichtigt.", fr: "Quand tu obtiens un nouveau trophée, tu es prévenu ici.", it: "Quando ottieni un nuovo trofeo, riceverai un avviso qui.", pt: "Quando conseguires um troféu novo, vais ser avisado aqui." },
  "📅 Tu semana en Paragon": { en: "📅 Your week on Paragon", de: "📅 Deine Woche auf Paragon", fr: "📅 Ta semaine sur Paragon", it: "📅 La tua settimana su Paragon", pt: "📅 A tua semana no Paragon" },
  "Esta semana no ha caído ningún trofeo — ¿retomamos algo?": { en: "No trophies this week — shall we pick something back up?", de: "Diese Woche keine Trophäe — sollen wir etwas wieder aufnehmen?", fr: "Aucun trophée cette semaine — on reprend quelque chose ?", it: "Nessun trofeo questa settimana — riprendiamo qualcosa?", pt: "Nenhum troféu esta semana — retomamos alguma coisa?" },
  "Nueva solicitud de amistad": { en: "New friend request", de: "Neue Freundschaftsanfrage", fr: "Nouvelle demande d'ami", it: "Nuova richiesta di amicizia", pt: "Novo pedido de amizade" },
  "🤝 Solicitud aceptada": { en: "🤝 Request accepted", de: "🤝 Anfrage angenommen", fr: "🤝 Demande acceptée", it: "🤝 Richiesta accettata", pt: "🤝 Pedido aceite" },
  "Invitación a una liga": { en: "League invite", de: "Liga-Einladung", fr: "Invitation à une ligue", it: "Invito a una lega", pt: "Convite para uma liga" },
  "Invitación a un clan": { en: "Clan invite", de: "Clan-Einladung", fr: "Invitation à un clan", it: "Invito a un clan", pt: "Convite para um clã" },
  "🏆 ¡Platino conseguido!": { en: "🏆 Platinum earned!", de: "🏆 Platin erreicht!", fr: "🏆 Platine obtenu !", it: "🏆 Platino ottenuto!", pt: "🏆 Platina conquistada!" },
  "1 trofeo nuevo": { en: "1 new trophy", de: "1 neue Trophäe", fr: "1 nouveau trophée", it: "1 nuovo trofeo", pt: "1 troféu novo" },
  "Está en tu lista de deseados de Paragon.": { en: "It's on your Paragon wishlist.", de: "Es steht auf deiner Paragon-Wunschliste.", fr: "Il est dans ta liste de souhaits Paragon.", it: "È nella tua lista dei desideri di Paragon.", pt: "Está na tua lista de desejos do Paragon." },
  "❌ Sesión cancelada": { en: "❌ Session cancelled", de: "❌ Sitzung abgesagt", fr: "❌ Session annulée", it: "❌ Sessione annullata", pt: "❌ Sessão cancelada" },
  "⚔️ Os han retado a una guerra de clanes": { en: "⚔️ Your clan has been challenged to a clan war", de: "⚔️ Euer Clan wurde zu einem Clankrieg herausgefordert", fr: "⚔️ Votre clan a été défié dans une guerre de clans", it: "⚔️ Il vostro clan è stato sfidato a una guerra tra clan", pt: "⚔️ O vosso clã foi desafiado para uma guerra de clãs" },
  "⚔️ ¡Empieza la guerra de clanes!": { en: "⚔️ The clan war begins!", de: "⚔️ Der Clankrieg beginnt!", fr: "⚔️ La guerre de clans commence !", it: "⚔️ Inizia la guerra tra clan!", pt: "⚔️ Começa a guerra de clãs!" },
  "🤝 Reto aceptado": { en: "🤝 Challenge accepted", de: "🤝 Herausforderung angenommen", fr: "🤝 Défi accepté", it: "🤝 Sfida accettata", pt: "🤝 Desafio aceite" },
  "Lo habéis terminado los dos a tiempo.": { en: "You both finished it in time.", de: "Ihr habt es beide rechtzeitig geschafft.", fr: "Vous l'avez terminé tous les deux à temps.", it: "L'avete finito entrambi in tempo.", pt: "Terminaram os dois a tempo." },
  "El reto conjunto ha vencido. ¿Otro intento?": { en: "The joint challenge has expired. Another try?", de: "Die gemeinsame Herausforderung ist abgelaufen. Noch ein Versuch?", fr: "Le défi commun a expiré. Une autre tentative ?", it: "La sfida di coppia è scaduta. Un altro tentativo?", pt: "O desafio conjunto expirou. Outra tentativa?" },
  "⚔️ Reto aceptado": { en: "⚔️ Challenge accepted", de: "⚔️ Herausforderung angenommen", fr: "⚔️ Défi accepté", it: "⚔️ Sfida accettata", pt: "⚔️ Desafio aceite" },
  "⚔️ Reto sin rivales": { en: "⚔️ Challenge with no rivals", de: "⚔️ Herausforderung ohne Gegner", fr: "⚔️ Défi sans adversaires", it: "⚔️ Sfida senza rivali", pt: "⚔️ Desafio sem rivais" },
  "⚔️ Reto terminado": { en: "⚔️ Challenge over", de: "⚔️ Herausforderung beendet", fr: "⚔️ Défi terminé", it: "⚔️ Sfida terminata", pt: "⚔️ Desafio terminado" },
  "🏆 ¡Empate en cabeza!": { en: "🏆 Tied for first!", de: "🏆 Gleichstand an der Spitze!", fr: "🏆 Égalité en tête !", it: "🏆 Pareggio in testa!", pt: "🏆 Empate na liderança!" },
  "🏆 ¡Has ganado el reto!": { en: "🏆 You won the challenge!", de: "🏆 Du hast die Herausforderung gewonnen!", fr: "🏆 Tu as gagné le défi !", it: "🏆 Hai vinto la sfida!", pt: "🏆 Ganhaste o desafio!" },
  "Nadie sumó puntos durante la liga: no hay ganador.": { en: "Nobody scored during the league: there's no winner.", de: "Niemand hat in der Liga gepunktet: Es gibt keinen Sieger.", fr: "Personne n'a marqué pendant la ligue : pas de gagnant.", it: "Nessuno ha fatto punti durante la lega: non c'è un vincitore.", pt: "Ninguém somou pontos durante a liga: não há vencedor." },
};

const MESES: Record<string, Trad> = {
  enero: { en: "January", de: "Januar", fr: "janvier", it: "gennaio", pt: "janeiro" },
  febrero: { en: "February", de: "Februar", fr: "février", it: "febbraio", pt: "fevereiro" },
  marzo: { en: "March", de: "März", fr: "mars", it: "marzo", pt: "março" },
  abril: { en: "April", de: "April", fr: "avril", it: "aprile", pt: "abril" },
  mayo: { en: "May", de: "Mai", fr: "mai", it: "maggio", pt: "maio" },
  junio: { en: "June", de: "Juni", fr: "juin", it: "giugno", pt: "junho" },
  julio: { en: "July", de: "Juli", fr: "juillet", it: "luglio", pt: "julho" },
  agosto: { en: "August", de: "August", fr: "août", it: "agosto", pt: "agosto" },
  septiembre: { en: "September", de: "September", fr: "septembre", it: "settembre", pt: "setembro" },
  octubre: { en: "October", de: "Oktober", fr: "octobre", it: "ottobre", pt: "outubro" },
  noviembre: { en: "November", de: "November", fr: "novembre", it: "novembre", pt: "novembro" },
  diciembre: { en: "December", de: "Dezember", fr: "décembre", it: "dicembre", pt: "dezembro" },
};

/** "15 de noviembre" (toLocaleDateString es-ES) en cada idioma. */
function fecha(dia: string, mes: string): Trad {
  const m = MESES[mes] ?? { en: mes, de: mes, fr: mes, it: mes, pt: mes };
  return { en: `${m.en} ${dia}`, de: `${dia}. ${m.de}`, fr: `${dia} ${m.fr}`, it: `${dia} ${m.it}`, pt: `${dia} de ${m.pt}` };
}

const s = (n: string) => (n === "1" ? "" : "s");
/** Plural italiano: "trofeo/trofei", "giorno/giorni"... (raíz + o/i). */
const oi = (n: string) => (n === "1" ? "o" : "i");

const PATRONES: { re: RegExp; trad: (m: RegExpMatchArray) => Trad }[] = [
  // Amigos, ligas y clanes.
  { re: /^(.*) quiere ser tu amigo en Paragon\.$/, trad: (m) => ({ en: `${m[1]} wants to be your friend on Paragon.`, de: `${m[1]} möchte auf Paragon mit dir befreundet sein.`, fr: `${m[1]} veut être ton ami sur Paragon.`, it: `${m[1]} vuole essere tuo amico su Paragon.`, pt: `${m[1]} quer ser teu amigo no Paragon.` }) },
  { re: /^(.*) ya es tu amigo en Paragon\.$/, trad: (m) => ({ en: `${m[1]} is now your friend on Paragon.`, de: `${m[1]} ist jetzt auf Paragon mit dir befreundet.`, fr: `${m[1]} est maintenant ton ami sur Paragon.`, it: `${m[1]} ora è tuo amico su Paragon.`, pt: `${m[1]} já é teu amigo no Paragon.` }) },
  { re: /^(.*) te ha invitado a la liga "(.*)" en Paragon\.$/, trad: (m) => ({ en: `${m[1]} invited you to the league "${m[2]}" on Paragon.`, de: `${m[1]} hat dich in die Liga „${m[2]}“ auf Paragon eingeladen.`, fr: `${m[1]} t'a invité dans la ligue « ${m[2]} » sur Paragon.`, it: `${m[1]} ti ha invitato alla lega "${m[2]}" su Paragon.`, pt: `${m[1]} convidou-te para a liga "${m[2]}" no Paragon.` }) },
  { re: /^(.*) te invita a unirte a (\[.*\] .*)\.$/, trad: (m) => ({ en: `${m[1]} invites you to join ${m[2]}.`, de: `${m[1]} lädt dich ein, ${m[2]} beizutreten.`, fr: `${m[1]} t'invite à rejoindre ${m[2]}.`, it: `${m[1]} ti invita a unirti a ${m[2]}.`, pt: `${m[1]} convida-te a juntares-te a ${m[2]}.` }) },
  { re: /^🏆 (.*) ha sacado un platino$/, trad: (m) => ({ en: `🏆 ${m[1]} earned a platinum`, de: `🏆 ${m[1]} hat ein Platin geholt`, fr: `🏆 ${m[1]} a obtenu un platine`, it: `🏆 ${m[1]} ha ottenuto un platino`, pt: `🏆 ${m[1]} conquistou uma platina` }) },

  // Trofeos.
  { re: /^(\d+) trofeos nuevos$/, trad: (m) => ({ en: `${m[1]} new trophies`, de: `${m[1]} neue Trophäen`, fr: `${m[1]} nouveaux trophées`, it: `${m[1]} nuovi trofei`, pt: `${m[1]} troféus novos` }) },
  { re: /^⚠️ (.*) tiene (\d+) trofeos? perdibles?$/, trad: (m) => ({ en: `⚠️ ${m[1]} has ${m[2]} missable troph${m[2] === "1" ? "y" : "ies"}`, de: `⚠️ ${m[1]} hat ${m[2]} verpassbare Trophäe${m[2] === "1" ? "" : "n"}`, fr: `⚠️ ${m[1]} a ${m[2]} trophée${s(m[2])} manquable${s(m[2])}`, it: `⚠️ ${m[1]} ha ${m[2]} trofe${oi(m[2])} perdibil${m[2] === "1" ? "e" : "i"}`, pt: `⚠️ ${m[1]} tem ${m[2]} ${m[2] === "1" ? "troféu perdível" : "troféus perdíveis"}` }) },
  { re: /^Míralos antes de avanzar: (.*)$/, trad: (m) => ({ en: `Check them before moving on: ${m[1]}`, de: `Sieh sie dir an, bevor du weitermachst: ${m[1]}`, fr: `Regarde-les avant d'avancer : ${m[1]}`, it: `Guardali prima di andare avanti: ${m[1]}`, pt: `Vê-os antes de avançares: ${m[1]}` }) },
  { re: /^🎮 ¡(.*) sale hoy!$/, trad: (m) => ({ en: `🎮 ${m[1]} is out today!`, de: `🎮 ${m[1]} erscheint heute!`, fr: `🎮 ${m[1]} sort aujourd'hui !`, it: `🎮 ${m[1]} esce oggi!`, pt: `🎮 ${m[1]} sai hoje!` }) },
  { re: /^🎮 (.*) sale mañana$/, trad: (m) => ({ en: `🎮 ${m[1]} is out tomorrow`, de: `🎮 ${m[1]} erscheint morgen`, fr: `🎮 ${m[1]} sort demain`, it: `🎮 ${m[1]} esce domani`, pt: `🎮 ${m[1]} sai amanhã` }) },
  { re: /^💸 (.*) a (\S+\s€)$/, trad: (m) => ({ en: `💸 ${m[1]} for ${m[2]}`, de: `💸 ${m[1]} für ${m[2]}`, fr: `💸 ${m[1]} à ${m[2]}`, it: `💸 ${m[1]} a ${m[2]}`, pt: `💸 ${m[1]} a ${m[2]}` }) },
  { re: /^Ha bajado de tu objetivo de (\S+\s€) en Steam( \(-\d+%\))?\.$/, trad: (m) => ({ en: `It dropped below your target of ${m[1]} on Steam${m[2] ?? ""}.`, de: `Unter dein Ziel von ${m[1]} bei Steam gefallen${m[2] ?? ""}.`, fr: `Il est passé sous ton objectif de ${m[1]} sur Steam${m[2] ?? ""}.`, it: `È sceso sotto il tuo obiettivo di ${m[1]} su Steam${m[2] ?? ""}.`, pt: `Desceu abaixo do teu objetivo de ${m[1]} no Steam${m[2] ?? ""}.` }) },

  // Liga del mes, ligas privadas y temporada.
  { re: /^📉 (.*) te ha adelantado en la liga$/, trad: (m) => ({ en: `📉 ${m[1]} overtook you in the league`, de: `📉 ${m[1]} hat dich in der Liga überholt`, fr: `📉 ${m[1]} t'a dépassé dans la ligue`, it: `📉 ${m[1]} ti ha superato nella lega`, pt: `📉 ${m[1]} ultrapassou-te na liga` }) },
  { re: /^Ahora vas (\d+)º de (\d+) en la liga del mes \((\d+) puntos por detrás\)\.$/, trad: (m) => ({ en: `You're now ${m[1]} of ${m[2]} in this month's league (${m[3]} points behind).`, de: `Du bist jetzt ${m[1]}. von ${m[2]} in der Monatsliga (${m[3]} Punkte dahinter).`, fr: `Tu es maintenant ${m[1]}e sur ${m[2]} dans la ligue du mois (${m[3]} points derrière).`, it: `Ora sei ${m[1]}º su ${m[2]} nella lega del mese (${m[3]} punti dietro).`, pt: `Agora estás em ${m[1]}.º de ${m[2]} na liga do mês (${m[3]} pontos atrás).` }) },
  { re: /^🏆 ¡Empate en lo más alto de «(.*)»!$/, trad: (m) => ({ en: `🏆 Tied for first in “${m[1]}”!`, de: `🏆 Gleichstand an der Spitze von „${m[1]}“!`, fr: `🏆 Égalité en tête de « ${m[1]} » !`, it: `🏆 Pareggio in vetta a «${m[1]}»!`, pt: `🏆 Empate no topo de «${m[1]}»!` }) },
  { re: /^🏆 ¡Has ganado la liga «(.*)»!$/, trad: (m) => ({ en: `🏆 You won the league “${m[1]}”!`, de: `🏆 Du hast die Liga „${m[1]}“ gewonnen!`, fr: `🏆 Tu as gagné la ligue « ${m[1]} » !`, it: `🏆 Hai vinto la lega «${m[1]}»!`, pt: `🏆 Ganhaste a liga «${m[1]}»!` }) },
  { re: /^La liga ha terminado: (\d+) puntos\. Ya está en tu palmarés\.$/, trad: (m) => ({ en: `The league is over: ${m[1]} points. It's in your trophy case now.`, de: `Die Liga ist vorbei: ${m[1]} Punkte. Sie ist jetzt in deiner Vitrine.`, fr: `La ligue est terminée : ${m[1]} points. Elle est dans ton palmarès.`, it: `La lega è finita: ${m[1]} punti. Ora è nel tuo palmarès.`, pt: `A liga terminou: ${m[1]} pontos. Já está no teu palmarés.` }) },
  { re: /^🏁 Ha terminado la liga «(.*)»$/, trad: (m) => ({ en: `🏁 The league “${m[1]}” is over`, de: `🏁 Die Liga „${m[1]}“ ist vorbei`, fr: `🏁 La ligue « ${m[1]} » est terminée`, it: `🏁 La lega «${m[1]}» è finita`, pt: `🏁 A liga «${m[1]}» terminou` }) },
  { re: /^Ganó (.*) con (\d+) puntos\. Tú quedaste (\d+)\.º de (\d+)\.$/, trad: (m) => ({ en: `${m[1]} won with ${m[2]} points. You finished ${m[3]} of ${m[4]}.`, de: `${m[1]} hat mit ${m[2]} Punkten gewonnen. Du bist ${m[3]}. von ${m[4]} geworden.`, fr: `${m[1]} a gagné avec ${m[2]} points. Tu as fini ${m[3]}e sur ${m[4]}.`, it: `Ha vinto ${m[1]} con ${m[2]} punti. Tu sei arrivato ${m[3]}º su ${m[4]}.`, pt: `Ganhou ${m[1]} com ${m[2]} pontos. Ficaste em ${m[3]}.º de ${m[4]}.` }) },
  { re: /^(.+) Temporada (T\d \d{4}) cerrada: nivel (\d+)$/, trad: (m) => ({ en: `${m[1]} Season ${m[2]} closed: level ${m[3]}`, de: `${m[1]} Saison ${m[2]} beendet: Stufe ${m[3]}`, fr: `${m[1]} Saison ${m[2]} terminée : niveau ${m[3]}`, it: `${m[1]} Stagione ${m[2]} chiusa: livello ${m[3]}`, pt: `${m[1]} Temporada ${m[2]} encerrada: nível ${m[3]}` }) },
  { re: /^Temporada (T\d \d{4}) cerrada$/, trad: (m) => ({ en: `Season ${m[1]} closed`, de: `Saison ${m[1]} beendet`, fr: `Saison ${m[1]} terminée`, it: `Stagione ${m[1]} chiusa`, pt: `Temporada ${m[1]} encerrada` }) },
  { re: /^(\d+) puntos · (\d+)º de (\d+)\. Empieza una temporada nueva, desde cero\.$/, trad: (m) => ({ en: `${m[1]} points · ${m[2]} of ${m[3]}. A new season starts, from zero.`, de: `${m[1]} Punkte · ${m[2]}. von ${m[3]}. Eine neue Saison beginnt, bei null.`, fr: `${m[1]} points · ${m[2]}e sur ${m[3]}. Une nouvelle saison commence, à zéro.`, it: `${m[1]} punti · ${m[2]}º su ${m[3]}. Inizia una nuova stagione, da zero.`, pt: `${m[1]} pontos · ${m[2]}.º de ${m[3]}. Começa uma temporada nova, do zero.` }) },

  // Guerras de clanes.
  { re: /^(\[.*\]) (.*) reta a tu clan a (\d+) días de caza\. Acepta o rechaza desde la página del clan\.$/, trad: (m) => ({ en: `${m[1]} ${m[2]} challenges your clan to ${m[3]} days of hunting. Accept or decline from the clan page.`, de: `${m[1]} ${m[2]} fordert deinen Clan zu ${m[3]} Tagen Jagd heraus. Nimm an oder lehne ab auf der Clanseite.`, fr: `${m[1]} ${m[2]} défie ton clan pour ${m[3]} jours de chasse. Accepte ou refuse depuis la page du clan.`, it: `${m[1]} ${m[2]} sfida il tuo clan a ${m[3]} giorni di caccia. Accetta o rifiuta dalla pagina del clan.`, pt: `${m[1]} ${m[2]} desafia o teu clã para ${m[3]} dias de caça. Aceita ou recusa na página do clã.` }) },
  { re: /^(\[.*\]) contra (\[.*\]) durante (\d+) días\. Cada trofeo de cualquier miembro suma\.$/, trad: (m) => ({ en: `${m[1]} vs ${m[2]} for ${m[3]} days. Every trophy from any member counts.`, de: `${m[1]} gegen ${m[2]} für ${m[3]} Tage. Jede Trophäe jedes Mitglieds zählt.`, fr: `${m[1]} contre ${m[2]} pendant ${m[3]} jours. Chaque trophée de chaque membre compte.`, it: `${m[1]} contro ${m[2]} per ${m[3]} giorni. Ogni trofeo di qualsiasi membro conta.`, pt: `${m[1]} contra ${m[2]} durante ${m[3]} dias. Cada troféu de qualquer membro conta.` }) },
  {
    re: /^⚔️ (Empate|¡Victoria!|Derrota) en la guerra de clanes$/,
    trad: (m) => {
      const r = {
        Empate: { en: "Draw", de: "Unentschieden", fr: "Égalité", it: "Pareggio", pt: "Empate" },
        "¡Victoria!": { en: "Victory!", de: "Sieg!", fr: "Victoire !", it: "Vittoria!", pt: "Vitória!" },
        Derrota: { en: "Defeat", de: "Niederlage", fr: "Défaite", it: "Sconfitta", pt: "Derrota" },
      }[m[1]]!;
      return { en: `⚔️ ${r.en} in the clan war`, de: `⚔️ ${r.de} im Clankrieg`, fr: `⚔️ ${r.fr} dans la guerre de clans`, it: `⚔️ ${r.it} nella guerra tra clan`, pt: `⚔️ ${r.pt} na guerra de clãs` };
    },
  },

  // Platinar juntos y retos entre amigos.
  { re: /^🤝 (.*) te propone platinar juntos$/, trad: (m) => ({ en: `🤝 ${m[1]} suggests going for a platinum together`, de: `🤝 ${m[1]} schlägt vor, gemeinsam zu platinieren`, fr: `🤝 ${m[1]} te propose de platiner ensemble`, it: `🤝 ${m[1]} ti propone di platinare insieme`, pt: `🤝 ${m[1]} propõe-te platinarem juntos` }) },
  {
    re: /^(.*) antes del (\d+) de (\p{L}+)\. Acéptalo desde Amigos\.$/u,
    trad: (m) => {
      const f = fecha(m[2], m[3]);
      return { en: `${m[1]} before ${f.en}. Accept it from Friends.`, de: `${m[1]} bis zum ${f.de}. Nimm es unter Freunde an.`, fr: `${m[1]} avant le ${f.fr}. Accepte-le depuis Amis.`, it: `${m[1]} entro il ${f.it}. Accettalo da Amici.`, pt: `${m[1]} até ${f.pt}. Aceita-o em Amigos.` };
    },
  },
  { re: /^A por (.*) los dos antes del (\d{4}-\d{2}-\d{2})\.$/, trad: (m) => ({ en: `Going for ${m[1]} together before ${m[2]}.`, de: `Gemeinsam auf ${m[1]} bis ${m[2]}.`, fr: `À vous deux pour ${m[1]} avant le ${m[2]}.`, it: `Insieme per ${m[1]} entro il ${m[2]}.`, pt: `Os dois atrás de ${m[1]} até ${m[2]}.` }) },
  { re: /^🏆 ¡Reto conseguido: (.*)!$/, trad: (m) => ({ en: `🏆 Challenge complete: ${m[1]}!`, de: `🏆 Herausforderung geschafft: ${m[1]}!`, fr: `🏆 Défi réussi : ${m[1]} !`, it: `🏆 Sfida completata: ${m[1]}!`, pt: `🏆 Desafio cumprido: ${m[1]}!` }) },
  { re: /^⌛ Se acabó el plazo de (.*)$/, trad: (m) => ({ en: `⌛ Time's up for ${m[1]}`, de: `⌛ Die Frist für ${m[1]} ist abgelaufen`, fr: `⌛ Le délai pour ${m[1]} est écoulé`, it: `⌛ Tempo scaduto per ${m[1]}`, pt: `⌛ Acabou o prazo de ${m[1]}` }) },
  { re: /^⚔️ (.*) te reta$/, trad: (m) => ({ en: `⚔️ ${m[1]} challenges you`, de: `⚔️ ${m[1]} fordert dich heraus`, fr: `⚔️ ${m[1]} te défie`, it: `⚔️ ${m[1]} ti sfida`, pt: `⚔️ ${m[1]} desafia-te` }) },
  {
    re: /^(«.*»: )?quien más trofeos consiga en (\d+) días gana\. Acéptalo desde Amigos\.$/,
    trad: (m) => {
      const t = m[1] ?? "";
      return {
        en: `${t}whoever earns the most trophies in ${m[2]} days wins. Accept it from Friends.`,
        de: `${t}wer in ${m[2]} Tagen die meisten Trophäen holt, gewinnt. Nimm es unter Freunde an.`,
        fr: `${t}celui qui obtient le plus de trophées en ${m[2]} jours gagne. Accepte-le depuis Amis.`,
        it: `${t}vince chi ottiene più trofei in ${m[2]} giorni. Accettalo da Amici.`,
        pt: `${t}ganha quem conseguir mais troféus em ${m[2]} dias. Aceita-o em Amigos.`,
      };
    },
  },
  { re: /^(.*) entra en tu reto\.$/, trad: (m) => ({ en: `${m[1]} joins your challenge.`, de: `${m[1]} macht bei deiner Herausforderung mit.`, fr: `${m[1]} rejoint ton défi.`, it: `${m[1]} entra nella tua sfida.`, pt: `${m[1]} entra no teu desafio.` }) },
  { re: /^Nadie aceptó (.*) a tiempo\.$/, trad: (m) => ({ en: `Nobody accepted ${m[1]} in time.`, de: `Niemand hat ${m[1]} rechtzeitig angenommen.`, fr: `Personne n'a accepté ${m[1]} à temps.`, it: `Nessuno ha accettato ${m[1]} in tempo.`, pt: `Ninguém aceitou ${m[1]} a tempo.` }) },
  { re: /^(.*) acabó sin trofeos para nadie: empate a cero\.$/, trad: (m) => ({ en: `${m[1]} ended with no trophies for anyone: a goalless draw.`, de: `${m[1]} endete ohne Trophäen für alle: torloses Unentschieden.`, fr: `${m[1]} s'est terminé sans trophée pour personne : match nul.`, it: `${m[1]} è finita senza trofei per nessuno: pareggio a reti inviolate.`, pt: `${m[1]} acabou sem troféus para ninguém: empate a zero.` }) },
  { re: /^Gana (.*) en (.*)\. Tú: (\d+) trofeos\.$/, trad: (m) => ({ en: `${m[1]} wins ${m[2]}. You: ${m[3]} trophies.`, de: `${m[1]} gewinnt ${m[2]}. Du: ${m[3]} Trophäen.`, fr: `${m[1]} gagne ${m[2]}. Toi : ${m[3]} trophées.`, it: `${m[1]} vince ${m[2]}. Tu: ${m[3]} trofei.`, pt: `${m[1]} ganha ${m[2]}. Tu: ${m[3]} troféus.` }) },
  { re: /^(.*): (\d+) trofeos\.$/, trad: (m) => ({ en: `${m[1]}: ${m[2]} trophies.`, de: `${m[1]}: ${m[2]} Trophäen.`, fr: `${m[1]} : ${m[2]} trophées.`, it: `${m[1]}: ${m[2]} trofei.`, pt: `${m[1]}: ${m[2]} troféus.` }) },

  // Sesiones (los avisos de "se ha unido" llevan varias líneas).
  { re: /^🎮 (.*) se ha unido a tu sesión$/, trad: (m) => ({ en: `🎮 ${m[1]} joined your session`, de: `🎮 ${m[1]} ist deiner Sitzung beigetreten`, fr: `🎮 ${m[1]} a rejoint ta session`, it: `🎮 ${m[1]} si è unito alla tua sessione`, pt: `🎮 ${m[1]} juntou-se à tua sessão` }) },
  { re: /^🎮 (.*) se ha unido a la sesión$/, trad: (m) => ({ en: `🎮 ${m[1]} joined the session`, de: `🎮 ${m[1]} ist der Sitzung beigetreten`, fr: `🎮 ${m[1]} a rejoint la session`, it: `🎮 ${m[1]} si è unito alla sessione`, pt: `🎮 ${m[1]} juntou-se à sessão` }) },
  { re: /^👋 (.*) se ha salido de tu sesión$/, trad: (m) => ({ en: `👋 ${m[1]} left your session`, de: `👋 ${m[1]} hat deine Sitzung verlassen`, fr: `👋 ${m[1]} a quitté ta session`, it: `👋 ${m[1]} ha lasciato la tua sessione`, pt: `👋 ${m[1]} saiu da tua sessão` }) },
  {
    re: /^(\d+)\/(\d+) plazas ocupadas · (?:(¡completa!)|queda 1 libre|quedan (\d+) libres|(\d+) libres)$/,
    trad: (m) => {
      const libres = m[3] ? null : (m[4] ?? m[5] ?? "1");
      const resto =
        libres === null
          ? { en: "full!", de: "voll!", fr: "complet !", it: "al completo!", pt: "completa!" }
          : { en: `${libres} free`, de: `${libres} frei`, fr: `${libres} libre${s(libres)}`, it: `${libres} liber${libres === "1" ? "o" : "i"}`, pt: `${libres} livre${s(libres)}` };
      return {
        en: `${m[1]}/${m[2]} spots taken · ${resto.en}`,
        de: `${m[1]}/${m[2]} Plätze belegt · ${resto.de}`,
        fr: `${m[1]}/${m[2]} places prises · ${resto.fr}`,
        it: `${m[1]}/${m[2]} posti occupati · ${resto.it}`,
        pt: `${m[1]}/${m[2]} lugares ocupados · ${resto.pt}`,
      };
    },
  },
  {
    re: /^Dentro: (.*)$/,
    trad: (m) => ({
      en: `In: ${m[1].replace(" (organiza)", " (host)")}`,
      de: `Dabei: ${m[1].replace(" (organiza)", " (Gastgeber)")}`,
      fr: `Dedans : ${m[1].replace(" (organiza)", " (organise)")}`,
      it: `Dentro: ${m[1].replace(" (organiza)", " (organizza)")}`,
      pt: `Dentro: ${m[1].replace(" (organiza)", " (organiza)")}`,
    }),
  },
  { re: /^Se ha cancelado la sesión de «(.*)»\.$/, trad: (m) => ({ en: `The session for "${m[1]}" has been cancelled.`, de: `Die Sitzung für „${m[1]}“ wurde abgesagt.`, fr: `La session pour « ${m[1]} » a été annulée.`, it: `La sessione di «${m[1]}» è stata annullata.`, pt: `A sessão de «${m[1]}» foi cancelada.` }) },
  { re: /^⏰ Sesión en (\d+) min: (.*)$/, trad: (m) => ({ en: `⏰ Session in ${m[1]} min: ${m[2]}`, de: `⏰ Sitzung in ${m[1]} Min.: ${m[2]}`, fr: `⏰ Session dans ${m[1]} min : ${m[2]}`, it: `⏰ Sessione tra ${m[1]} min: ${m[2]}`, pt: `⏰ Sessão daqui a ${m[1]} min: ${m[2]}` }) },
  { re: /^«(.*)» con (\d+) personas\.$/, trad: (m) => ({ en: `“${m[1]}” with ${m[2]} people.`, de: `„${m[1]}“ mit ${m[2]} Personen.`, fr: `« ${m[1]} » avec ${m[2]} personnes.`, it: `«${m[1]}» con ${m[2]} persone.`, pt: `«${m[1]}» com ${m[2]} pessoas.` }) },

  // Resumen semanal por DM de Discord (lib/resumenSemanal.ts), línea a línea.
  {
    re: /^🏆 \*\*(\d+)\*\* trofeos en \*\*(\d+)\*\* juegos(?: · 💎 \*\*(\d+)\*\* platinos?)?$/,
    trad: (m) => {
      const p = m[3];
      const pl = {
        en: p ? ` · 💎 **${p}** platinum${p === "1" ? "" : "s"}` : "",
        de: p ? ` · 💎 **${p}** Platin` : "",
        fr: p ? ` · 💎 **${p}** platine${s(p)}` : "",
        it: p ? ` · 💎 **${p}** platin${oi(p)}` : "",
        pt: p ? ` · 💎 **${p}** platina${s(p)}` : "",
      };
      return {
        en: `🏆 **${m[1]}** troph${m[1] === "1" ? "y" : "ies"} in **${m[2]}** game${s(m[2])}${pl.en}`,
        de: `🏆 **${m[1]}** Trophäe${m[1] === "1" ? "" : "n"} in **${m[2]}** Spiel${m[2] === "1" ? "" : "en"}${pl.de}`,
        fr: `🏆 **${m[1]}** trophée${s(m[1])} dans **${m[2]}** jeu${m[2] === "1" ? "" : "x"}${pl.fr}`,
        it: `🏆 **${m[1]}** trofe${oi(m[1])} in **${m[2]}** ${m[2] === "1" ? "gioco" : "giochi"}${pl.it}`,
        pt: `🏆 **${m[1]}** ${m[1] === "1" ? "troféu" : "troféus"} em **${m[2]}** jogo${s(m[2])}${pl.pt}`,
      };
    },
  },
  {
    re: /^🔥 Racha de \*\*(\d+)\*\* días?( \(¡consigue uno hoy para no perderla!\))?$/,
    trad: (m) => {
      const aviso = Boolean(m[2]);
      return {
        en: `🔥 **${m[1]}**-day streak${aviso ? " (earn one today to keep it!)" : ""}`,
        de: `🔥 Serie von **${m[1]}** Tag${m[1] === "1" ? "" : "en"}${aviso ? " (hol heute eine, um sie nicht zu verlieren!)" : ""}`,
        fr: `🔥 Série de **${m[1]}** jour${s(m[1])}${aviso ? " (obtiens-en un aujourd'hui pour ne pas la perdre !)" : ""}`,
        it: `🔥 Serie di **${m[1]}** giorn${oi(m[1])}${aviso ? " (ottienine uno oggi per non perderla!)" : ""}`,
        pt: `🔥 Sequência de **${m[1]}** dia${s(m[1])}${aviso ? " (consegue um hoje para não a perderes!)" : ""}`,
      };
    },
  },
  { re: /^📊 Vas \*\*(\d+)º\*\* de (\d+) en la liga del mes$/, trad: (m) => ({ en: `📊 You're **${m[1]}** of ${m[2]} in this month's league`, de: `📊 Du bist **${m[1]}.** von ${m[2]} in der Monatsliga`, fr: `📊 Tu es **${m[1]}e** sur ${m[2]} dans la ligue du mois`, it: `📊 Sei **${m[1]}º** su ${m[2]} nella lega del mese`, pt: `📊 Estás em **${m[1]}.º** de ${m[2]} na liga do mês` }) },
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
