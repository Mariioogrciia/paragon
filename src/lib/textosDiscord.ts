import type { Idioma } from "@/lib/idiomasTrofeo";

/**
 * Los DM de Discord que arma lib/discordBot.ts por su cuenta (trofeos
 * nuevos, platino, nivel, invitación a una liga y el de prueba), en el
 * idioma de quien los recibe (17 oct 2026). Los avisos que pasan por
 * `enviarDmSiActivo` se traducen aparte, en lib/avisosTraduccion.ts.
 *
 * Los anuncios en el canal de un servidor siguen en español: los lee todo
 * el servidor, no una persona con su idioma.
 */

export interface TextosDm {
  nivelTitulo: (nivel: number) => string;
  nivelTexto: string;
  platinoTitulo: (juego: string) => string;
  trofeosTitulo: (juego: string, n: number) => string;
  masTrofeos: (n: number) => string;
  conectadoTitulo: string;
  conectadoTexto: string;
  ligaTitulo: string;
  ligaTexto: (quien: string, liga: string) => string;
}

const TEXTOS: Record<Idioma, TextosDm> = {
  es: {
    nivelTitulo: (n) => `⭐ ¡Nivel Paragon ${n}!`,
    nivelTexto: "Le has dado bien esta temporada.",
    platinoTitulo: (j) => `🏆 ¡Platino conseguido! — ${j}`,
    trofeosTitulo: (j, n) => `🎮 ${j} — ${n === 1 ? "1 trofeo nuevo" : `${n} trofeos nuevos`}`,
    masTrofeos: (n) => `… y ${n} más`,
    conectadoTitulo: "✅ Paragon conectado",
    conectadoTexto: "Cuando consigas un trofeo nuevo, te lo digo por aquí.",
    ligaTitulo: "🏅 Invitación a una liga",
    ligaTexto: (q, l) => `${q} te ha invitado a la liga **${l}** en Paragon.`,
  },
  en: {
    nivelTitulo: (n) => `⭐ Paragon level ${n}!`,
    nivelTexto: "You've been on a roll this season.",
    platinoTitulo: (j) => `🏆 Platinum earned! — ${j}`,
    trofeosTitulo: (j, n) => `🎮 ${j} — ${n === 1 ? "1 new trophy" : `${n} new trophies`}`,
    masTrofeos: (n) => `… and ${n} more`,
    conectadoTitulo: "✅ Paragon connected",
    conectadoTexto: "When you earn a new trophy, I'll tell you here.",
    ligaTitulo: "🏅 League invite",
    ligaTexto: (q, l) => `${q} invited you to the league **${l}** on Paragon.`,
  },
  de: {
    nivelTitulo: (n) => `⭐ Paragon-Stufe ${n}!`,
    nivelTexto: "Du bist diese Saison richtig in Fahrt.",
    platinoTitulo: (j) => `🏆 Platin erreicht! — ${j}`,
    trofeosTitulo: (j, n) => `🎮 ${j} — ${n === 1 ? "1 neue Trophäe" : `${n} neue Trophäen`}`,
    masTrofeos: (n) => `… und ${n} weitere`,
    conectadoTitulo: "✅ Paragon verbunden",
    conectadoTexto: "Wenn du eine neue Trophäe holst, sage ich es dir hier.",
    ligaTitulo: "🏅 Liga-Einladung",
    ligaTexto: (q, l) => `${q} hat dich in die Liga **${l}** auf Paragon eingeladen.`,
  },
  fr: {
    nivelTitulo: (n) => `⭐ Niveau Paragon ${n} !`,
    nivelTexto: "Tu es en forme cette saison.",
    platinoTitulo: (j) => `🏆 Platine obtenu ! — ${j}`,
    trofeosTitulo: (j, n) => `🎮 ${j} — ${n === 1 ? "1 nouveau trophée" : `${n} nouveaux trophées`}`,
    masTrofeos: (n) => `… et ${n} de plus`,
    conectadoTitulo: "✅ Paragon connecté",
    conectadoTexto: "Quand tu obtiens un nouveau trophée, je te le dis ici.",
    ligaTitulo: "🏅 Invitation à une ligue",
    ligaTexto: (q, l) => `${q} t'a invité dans la ligue **${l}** sur Paragon.`,
  },
};

export function textosDm(idioma: Idioma): TextosDm {
  return TEXTOS[idioma];
}
