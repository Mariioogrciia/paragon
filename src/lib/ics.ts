/**
 * Calendario iCalendar (RFC 5545) sin dependencias: lo justo para que
 * Google Calendar, Apple Calendar y Outlook se suscriban a un `webcal://`.
 * Módulo puro (sin `server-only`): `tests/ics.test.ts`.
 */
import type { Idioma } from "@/lib/idiomasTrofeo";

export interface EventoIcs {
  uid: string;
  titulo: string;
  descripcion?: string;
  url?: string;
  /** Evento de día entero (lanzamientos, cierres): solo cuenta la fecha. */
  diaEntero?: boolean;
  inicio: Date;
  /** Solo para eventos con hora; por defecto, una hora después de `inicio`. */
  fin?: Date;
}

/** `20261105T174000Z` */
export const fechaHoraIcs = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
/** `20261105`, en UTC: un lanzamiento de IGDB viene a medianoche UTC. */
export const fechaIcs = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

/** Escapa un TEXT de iCalendar: barra, coma, punto y coma y saltos de línea. */
export function textoIcs(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
}

/**
 * Parte las líneas de más de 75 octetos como pide la RFC (línea de
 * continuación que empieza por un espacio). Cuenta bytes, no caracteres, y
 * no corta un carácter UTF-8 por la mitad.
 */
export function plegarLinea(linea: string): string {
  const codificador = new TextEncoder();
  if (codificador.encode(linea).length <= 75) return linea;
  const trozos: string[] = [];
  let actual = "";
  let bytes = 0;
  for (const c of linea) {
    const tam = codificador.encode(c).length;
    const limite = trozos.length === 0 ? 75 : 74;
    if (bytes + tam > limite) {
      trozos.push(actual);
      actual = "";
      bytes = 0;
    }
    actual += c;
    bytes += tam;
  }
  trozos.push(actual);
  return trozos.join("\r\n ");
}

export function calendarioIcs(nombre: string, eventos: EventoIcs[], ahora = new Date()): string {
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Paragon//Calendario//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${textoIcs(nombre)}`,
    // Cada cuánto vuelve a pedirlo el calendario (Apple y Outlook lo respetan; Google va a su ritmo).
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];
  for (const e of eventos) {
    lineas.push("BEGIN:VEVENT", `UID:${e.uid}@paragontrophies.com`, `DTSTAMP:${fechaHoraIcs(ahora)}`);
    if (e.diaEntero) {
      const siguiente = new Date(e.inicio.getTime() + 86_400_000);
      lineas.push(`DTSTART;VALUE=DATE:${fechaIcs(e.inicio)}`, `DTEND;VALUE=DATE:${fechaIcs(siguiente)}`, "TRANSP:TRANSPARENT");
    } else {
      const fin = e.fin ?? new Date(e.inicio.getTime() + 3_600_000);
      lineas.push(`DTSTART:${fechaHoraIcs(e.inicio)}`, `DTEND:${fechaHoraIcs(fin)}`);
    }
    lineas.push(`SUMMARY:${textoIcs(e.titulo)}`);
    if (e.descripcion) lineas.push(`DESCRIPTION:${textoIcs(e.descripcion)}`);
    if (e.url) lineas.push(`URL:${e.url}`);
    lineas.push("END:VEVENT");
  }
  lineas.push("END:VCALENDAR");
  return lineas.map(plegarLinea).join("\r\n") + "\r\n";
}

/** Textos del calendario personal, en el idioma de su dueño. */
export const TEXTOS_CALENDARIO: Record<
  Idioma,
  { nombre: string; sale: string; sesion: string; cierraLiga: string; cierraMensual: string; objetivo: string }
> = {
  es: { nombre: "Paragon", sale: "Sale {juego}", sesion: "Sesión: {trofeo} · {juego}", cierraLiga: "Cierra la liga {liga}", cierraMensual: "Cierra la liga mensual de Paragon", objetivo: "Objetivo: platinar {juego}" },
  en: { nombre: "Paragon", sale: "{juego} releases", sesion: "Session: {trofeo} · {juego}", cierraLiga: "League {liga} ends", cierraMensual: "Paragon monthly league ends", objetivo: "Goal: platinum {juego}" },
  de: { nombre: "Paragon", sale: "{juego} erscheint", sesion: "Session: {trofeo} · {juego}", cierraLiga: "Liga {liga} endet", cierraMensual: "Paragon-Monatsliga endet", objetivo: "Ziel: Platin in {juego}" },
  fr: { nombre: "Paragon", sale: "Sortie de {juego}", sesion: "Session : {trofeo} · {juego}", cierraLiga: "Fin de la ligue {liga}", cierraMensual: "Fin de la ligue mensuelle Paragon", objetivo: "Objectif : platiner {juego}" },
  it: { nombre: "Paragon", sale: "Esce {juego}", sesion: "Sessione: {trofeo} · {juego}", cierraLiga: "Chiude la lega {liga}", cierraMensual: "Chiude la lega mensile di Paragon", objetivo: "Obiettivo: platinare {juego}" },
  pt: { nombre: "Paragon", sale: "Sai {juego}", sesion: "Sessão: {trofeo} · {juego}", cierraLiga: "Termina a liga {liga}", cierraMensual: "Termina a liga mensal do Paragon", objetivo: "Objetivo: platinar {juego}" },
};

export function rellenar(plantilla: string, valores: Record<string, string>): string {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave: string) => valores[clave] ?? "");
}

/** Último día del mes de `d` (UTC), el día que cierra la liga mensual. */
export function ultimoDiaDelMes(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}
