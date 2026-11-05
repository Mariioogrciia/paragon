/**
 * El correo del resumen semanal (lib/correo.ts), en HTML sencillo de tablas
 * (lo único que pintan igual Gmail, Outlook y Apple Mail) y en texto.
 * Módulo puro: `tests/correoPlantilla.test.ts`.
 */
import type { Idioma } from "@/lib/idiomasTrofeo";

const TEXTOS: Record<Idioma, { asunto: string; saludo: (n: string) => string; boton: string; pie: string; baja: string }> = {
  es: { asunto: "📅 Tu semana en Paragon", saludo: (n) => `Hola, ${n}. Así ha ido tu semana:`, boton: "Ver mi ritmo", pie: "Recibes esto porque activaste el resumen semanal por correo en Paragon.", baja: "Darme de baja" },
  en: { asunto: "📅 Your week on Paragon", saludo: (n) => `Hi, ${n}. Here's how your week went:`, boton: "See my pace", pie: "You're getting this because you turned on the weekly email summary on Paragon.", baja: "Unsubscribe" },
  de: { asunto: "📅 Deine Woche auf Paragon", saludo: (n) => `Hallo, ${n}. So lief deine Woche:`, boton: "Mein Tempo ansehen", pie: "Du bekommst diese E-Mail, weil du die wöchentliche Zusammenfassung auf Paragon aktiviert hast.", baja: "Abmelden" },
  fr: { asunto: "📅 Ta semaine sur Paragon", saludo: (n) => `Salut, ${n}. Voici ta semaine :`, boton: "Voir mon rythme", pie: "Tu reçois ce message car tu as activé le résumé hebdomadaire par e-mail sur Paragon.", baja: "Se désabonner" },
  it: { asunto: "📅 La tua settimana su Paragon", saludo: (n) => `Ciao, ${n}. Ecco com’è andata la tua settimana:`, boton: "Vedi il mio ritmo", pie: "Ricevi questa e-mail perché hai attivato il riepilogo settimanale su Paragon.", baja: "Annulla l’iscrizione" },
  pt: { asunto: "📅 A tua semana no Paragon", saludo: (n) => `Olá, ${n}. Foi assim a tua semana:`, boton: "Ver o meu ritmo", pie: "Recebes isto porque ativaste o resumo semanal por e-mail no Paragon.", baja: "Cancelar a subscrição" },
};

const escapar = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
/** `**negrita**` del resumen (formato de Discord) a <strong>, ya escapado. */
const negritas = (t: string) => escapar(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
const sinMarcas = (t: string) => t.replace(/\*\*(.+?)\*\*/g, "$1");

export interface CorreoResumen {
  asunto: string;
  html: string;
  texto: string;
}

export function correoResumen(idioma: Idioma, nombre: string, lineas: string[], enlaces: { ritmo: string; baja: string }): CorreoResumen {
  const t = TEXTOS[idioma];
  const html = `<!doctype html><html lang="${idioma}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#0a0f18;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#e6edf5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f18"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#111a2a;border:1px solid #243042;border-radius:14px">
<tr><td style="padding:24px 24px 8px;font-size:20px;font-weight:700">${escapar(t.asunto)}</td></tr>
<tr><td style="padding:0 24px 12px;font-size:15px;color:#a7b4c6">${escapar(t.saludo(nombre))}</td></tr>
${lineas.map((l) => `<tr><td style="padding:6px 24px;font-size:15px;line-height:1.5">${negritas(l)}</td></tr>`).join("\n")}
<tr><td style="padding:20px 24px 24px"><a href="${escapar(enlaces.ritmo)}" style="display:inline-block;background:#7fbcd8;color:#061021;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:10px">${escapar(t.boton)}</a></td></tr>
</table>
<p style="max-width:520px;font-size:12px;color:#7b889b;line-height:1.5;margin:16px auto 0">${escapar(t.pie)} <a href="${escapar(enlaces.baja)}" style="color:#7b889b">${escapar(t.baja)}</a></p>
</td></tr></table></body></html>`;
  const texto = [t.saludo(nombre), "", ...lineas.map(sinMarcas), "", `${t.boton}: ${enlaces.ritmo}`, "", `${t.pie} ${t.baja}: ${enlaces.baja}`].join("\n");
  return { asunto: t.asunto, html, texto };
}
