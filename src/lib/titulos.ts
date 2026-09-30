/**
 * Títulos especiales: se desbloquean por nivel Paragon o por una insignia y
 * se enseñan junto al nombre en el perfil y en Comunidad, con su propio
 * estilo. Aparte del "título de perfil" de texto libre (`profileTitle`), que
 * cualquiera puede escribir: este se gana. Textos en
 * `messages/Perfil/*.json`, `Titulos.<clave>`.
 */

export type RequisitoTitulo = { nivel: number } | { insignia: string };

export interface TituloDesbloqueable {
  clave: string;
  requisito: RequisitoTitulo;
  color: string;
}

export const TITULOS: TituloDesbloqueable[] = [
  { clave: "aprendiz", requisito: { nivel: 5 }, color: "#94a3b8" },
  { clave: "rastreador", requisito: { nivel: 15 }, color: "#60a5fa" },
  { clave: "veterano", requisito: { nivel: 25 }, color: "#a78bfa" },
  { clave: "elite", requisito: { nivel: 40 }, color: "#f472b6" },
  { clave: "leyenda_viva", requisito: { nivel: 60 }, color: "#fbbf24" },
  { clave: "paragon", requisito: { nivel: 100 }, color: "#9fd4ec" },
  { clave: "buscador_joyas", requisito: { insignia: "joya_rara" }, color: "#67e8f9" },
  { clave: "uno_entre_cien", requisito: { insignia: "uno_entre_cien" }, color: "#e879f9" },
  { clave: "campeon", requisito: { insignia: "campeon" }, color: "#fde047" },
  { clave: "senor_guerra", requisito: { insignia: "senor_guerra" }, color: "#fb923c" },
  { clave: "sabio", requisito: { insignia: "guia" }, color: "#a3e635" },
  { clave: "perfeccionista", requisito: { insignia: "semana_perfecta" }, color: "#34d399" },
  { clave: "criatura_noche", requisito: { insignia: "noctambulo" }, color: "#818cf8" },
  { clave: "maratoniano", requisito: { insignia: "maraton" }, color: "#fda4af" },
];

export const TITULO_POR_CLAVE = new Map(TITULOS.map((t) => [t.clave, t]));

export function tituloDesbloqueado(titulo: TituloDesbloqueable, nivel: number, insignias: string[]): boolean {
  return "nivel" in titulo.requisito ? nivel >= titulo.requisito.nivel : insignias.includes(titulo.requisito.insignia);
}
