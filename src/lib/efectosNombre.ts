/**
 * Efectos del nombre en el perfil: un degradado animado que no se puede
 * copiar escribiendo un color (el color del perfil es libre, así que un
 * "color desbloqueable" no significaría nada). Se ganan como los títulos
 * especiales. Textos en `messages/Perfil/*.json`, `EfectosNombre.<clave>`.
 */
import type { RequisitoTitulo } from "@/lib/titulos";

export interface EfectoNombre {
  clave: string;
  requisito: RequisitoTitulo;
  degradado: string;
}

export const EFECTOS_NOMBRE: EfectoNombre[] = [
  { clave: "dorado", requisito: { insignia: "campeon" }, degradado: "linear-gradient(90deg, #a16207, #fde047, #fff7cc, #fde047, #a16207)" },
  { clave: "aurora", requisito: { insignia: "temporada_oro" }, degradado: "linear-gradient(90deg, #22d3ee, #a78bfa, #f472b6, #fbbf24, #22d3ee)" },
  { clave: "platino", requisito: { nivel: 50 }, degradado: "linear-gradient(90deg, #7fbcd8, #dff0f8, #ffffff, #dff0f8, #7fbcd8)" },
  { clave: "neon", requisito: { insignia: "joya_rara" }, degradado: "linear-gradient(90deg, #22d3ee, #e879f9, #22d3ee)" },
];

export const EFECTO_POR_CLAVE = new Map(EFECTOS_NOMBRE.map((e) => [e.clave, e]));

export function efectoDisponible(efecto: EfectoNombre, nivel: number, insignias: string[]): boolean {
  return "nivel" in efecto.requisito ? nivel >= efecto.requisito.nivel : insignias.includes(efecto.requisito.insignia);
}
