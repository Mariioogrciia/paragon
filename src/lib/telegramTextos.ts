/**
 * Textos del bot de Telegram (lib/telegram.ts), en el idioma de Telegram de
 * quien escribe (`language_code`). Módulo puro: `tests/telegramTextos.test.ts`.
 */
import { esIdioma, type Idioma } from "@/lib/idiomasTrofeo";

export interface TextosTelegram {
  bienvenida: string;
  vinculado: (nombre: string) => string;
  codigoMalo: string;
  sinVincular: string;
  ayuda: string;
  perfil: (d: { nombre: string; nivel: number; platinos: number; trofeos: number; juegos: number; enlace: string }) => string;
  racha: (actual: number, mejor: number) => string;
  sinRacha: string;
  desvinculado: string;
  desconocido: string;
}

const T: Record<Idioma, TextosTelegram> = {
  es: {
    bienvenida: "👋 Soy el bot de Paragon. Para conectarlo, entra en Paragon → Ajustes → Avisos → Telegram y pulsa «Conectar».",
    vinculado: (n) => `✅ Conectado a la cuenta de Paragon de ${n}. A partir de ahora te aviso aquí de tus trofeos y platinos.`,
    codigoMalo: "Ese enlace ya no vale. Vuelve a pulsar «Conectar» en Paragon → Ajustes → Avisos.",
    sinVincular: "Todavía no has conectado tu cuenta: entra en Paragon → Ajustes → Avisos → Telegram.",
    ayuda: "/perfil — tus números de Paragon\n/racha — tu racha de días con trofeo\n/salir — dejar de recibir avisos aquí",
    perfil: (d) => `🏆 <b>${d.nombre}</b> · nivel ${d.nivel}\n💎 ${d.platinos} platinos · 🧩 ${d.trofeos} trofeos · 🎮 ${d.juegos} juegos\n${d.enlace}`,
    racha: (a, m) => `🔥 Llevas <b>${a}</b> ${a === 1 ? "día" : "días"} seguidos con algún trofeo. Tu mejor racha: ${m}.`,
    sinRacha: "No tienes racha activa ahora mismo: saca un trofeo hoy para empezar una.",
    desvinculado: "Hecho: ya no te aviso por aquí. Para volver, conéctalo otra vez desde Ajustes.",
    desconocido: "No conozco ese comando. Prueba /ayuda.",
  },
  en: {
    bienvenida: "👋 I'm the Paragon bot. To connect it, go to Paragon → Settings → Notifications → Telegram and press “Connect”.",
    vinculado: (n) => `✅ Connected to ${n}'s Paragon account. From now on I'll tell you about your trophies and platinums here.`,
    codigoMalo: "That link no longer works. Press “Connect” again in Paragon → Settings → Notifications.",
    sinVincular: "You haven't connected your account yet: go to Paragon → Settings → Notifications → Telegram.",
    ayuda: "/perfil — your Paragon numbers\n/racha — your trophy streak\n/salir — stop getting notifications here",
    perfil: (d) => `🏆 <b>${d.nombre}</b> · level ${d.nivel}\n💎 ${d.platinos} platinums · 🧩 ${d.trofeos} trophies · 🎮 ${d.juegos} games\n${d.enlace}`,
    racha: (a, m) => `🔥 You've earned a trophy <b>${a}</b> ${a === 1 ? "day" : "days"} in a row. Best streak: ${m}.`,
    sinRacha: "No active streak right now: earn a trophy today to start one.",
    desvinculado: "Done: no more notifications here. To come back, connect it again from Settings.",
    desconocido: "I don't know that command. Try /ayuda.",
  },
  de: {
    bienvenida: "👋 Ich bin der Paragon-Bot. Zum Verbinden: Paragon → Einstellungen → Benachrichtigungen → Telegram → „Verbinden“.",
    vinculado: (n) => `✅ Mit dem Paragon-Konto von ${n} verbunden. Ab jetzt melde ich dir hier deine Trophäen und Platin.`,
    codigoMalo: "Dieser Link gilt nicht mehr. Drück in Paragon → Einstellungen → Benachrichtigungen erneut auf „Verbinden“.",
    sinVincular: "Du hast dein Konto noch nicht verbunden: Paragon → Einstellungen → Benachrichtigungen → Telegram.",
    ayuda: "/perfil — deine Paragon-Zahlen\n/racha — deine Trophäen-Serie\n/salir — hier keine Benachrichtigungen mehr",
    perfil: (d) => `🏆 <b>${d.nombre}</b> · Stufe ${d.nivel}\n💎 ${d.platinos} Platin · 🧩 ${d.trofeos} Trophäen · 🎮 ${d.juegos} Spiele\n${d.enlace}`,
    racha: (a, m) => `🔥 Du hast seit <b>${a}</b> ${a === 1 ? "Tag" : "Tagen"} jeden Tag eine Trophäe. Beste Serie: ${m}.`,
    sinRacha: "Gerade keine aktive Serie: Hol dir heute eine Trophäe, um eine zu starten.",
    desvinculado: "Erledigt: Hier kommen keine Benachrichtigungen mehr. Zum Zurückkommen in den Einstellungen neu verbinden.",
    desconocido: "Diesen Befehl kenne ich nicht. Versuch /ayuda.",
  },
  fr: {
    bienvenida: "👋 Je suis le bot Paragon. Pour le connecter : Paragon → Paramètres → Notifications → Telegram → « Connecter ».",
    vinculado: (n) => `✅ Connecté au compte Paragon de ${n}. Désormais, je te préviens ici de tes trophées et platines.`,
    codigoMalo: "Ce lien ne marche plus. Appuie de nouveau sur « Connecter » dans Paragon → Paramètres → Notifications.",
    sinVincular: "Tu n’as pas encore connecté ton compte : Paragon → Paramètres → Notifications → Telegram.",
    ayuda: "/perfil — tes chiffres Paragon\n/racha — ta série de trophées\n/salir — ne plus recevoir de notifications ici",
    perfil: (d) => `🏆 <b>${d.nombre}</b> · niveau ${d.nivel}\n💎 ${d.platinos} platines · 🧩 ${d.trofeos} trophées · 🎮 ${d.juegos} jeux\n${d.enlace}`,
    racha: (a, m) => `🔥 Tu as eu un trophée <b>${a}</b> ${a === 1 ? "jour" : "jours"} d’affilée. Meilleure série : ${m}.`,
    sinRacha: "Pas de série en cours : obtiens un trophée aujourd’hui pour en lancer une.",
    desvinculado: "C’est fait : plus de notifications ici. Pour revenir, reconnecte-le depuis les Paramètres.",
    desconocido: "Je ne connais pas cette commande. Essaie /ayuda.",
  },
  it: {
    bienvenida: "👋 Sono il bot di Paragon. Per collegarlo: Paragon → Impostazioni → Notifiche → Telegram → «Collega».",
    vinculado: (n) => `✅ Collegato all’account Paragon di ${n}. D’ora in poi ti avviso qui dei tuoi trofei e platini.`,
    codigoMalo: "Questo link non vale più. Premi di nuovo «Collega» in Paragon → Impostazioni → Notifiche.",
    sinVincular: "Non hai ancora collegato il tuo account: Paragon → Impostazioni → Notifiche → Telegram.",
    ayuda: "/perfil — i tuoi numeri di Paragon\n/racha — la tua serie di trofei\n/salir — smetti di ricevere avvisi qui",
    perfil: (d) => `🏆 <b>${d.nombre}</b> · livello ${d.nivel}\n💎 ${d.platinos} platini · 🧩 ${d.trofeos} trofei · 🎮 ${d.juegos} giochi\n${d.enlace}`,
    racha: (a, m) => `🔥 Hai un trofeo da <b>${a}</b> ${a === 1 ? "giorno" : "giorni"} di fila. Serie migliore: ${m}.`,
    sinRacha: "Nessuna serie attiva ora: prendi un trofeo oggi per iniziarne una.",
    desvinculado: "Fatto: niente più avvisi qui. Per tornare, ricollegalo dalle Impostazioni.",
    desconocido: "Non conosco questo comando. Prova /ayuda.",
  },
  pt: {
    bienvenida: "👋 Sou o bot do Paragon. Para o ligar: Paragon → Definições → Avisos → Telegram → «Ligar».",
    vinculado: (n) => `✅ Ligado à conta do Paragon de ${n}. A partir de agora aviso-te aqui dos teus troféus e platinas.`,
    codigoMalo: "Essa ligação já não vale. Carrega outra vez em «Ligar» em Paragon → Definições → Avisos.",
    sinVincular: "Ainda não ligaste a tua conta: Paragon → Definições → Avisos → Telegram.",
    ayuda: "/perfil — os teus números do Paragon\n/racha — a tua sequência de troféus\n/salir — deixar de receber avisos aqui",
    perfil: (d) => `🏆 <b>${d.nombre}</b> · nível ${d.nivel}\n💎 ${d.platinos} platinas · 🧩 ${d.trofeos} troféus · 🎮 ${d.juegos} jogos\n${d.enlace}`,
    racha: (a, m) => `🔥 Tens troféus há <b>${a}</b> ${a === 1 ? "dia" : "dias"} seguidos. Melhor sequência: ${m}.`,
    sinRacha: "Sem sequência ativa agora: ganha um troféu hoje para começar uma.",
    desvinculado: "Feito: já não te aviso aqui. Para voltar, liga outra vez nas Definições.",
    desconocido: "Não conheço esse comando. Experimenta /ayuda.",
  },
};

export function textosTelegram(codigo: string | null | undefined): TextosTelegram {
  const corto = (codigo ?? "").slice(0, 2).toLowerCase();
  return T[esIdioma(corto) ? corto : "es"];
}

/** Telegram con `parse_mode: HTML` solo admite unas pocas etiquetas: todo lo de fuera, escapado. */
export function escaparTelegram(texto: string): string {
  return texto.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}

/** "/start abc", "/perfil@ParagonBot" → { comando: "start", argumento: "abc" }. */
export function leerComando(texto: string | undefined): { comando: string; argumento: string } | null {
  const m = /^\/([a-z_]+)(?:@\w+)?(?:\s+(.*))?$/i.exec((texto ?? "").trim());
  return m ? { comando: m[1].toLowerCase(), argumento: (m[2] ?? "").trim() } : null;
}
