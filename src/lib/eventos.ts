/**
 * Evento mensual de la comunidad (5 nov 2026): cada mes, un género. Cuentan
 * los trofeos ganados ese mes en juegos de ese género, con la misma escala
 * que la liga mensual (platino 100, oro 50, plata 25, el resto 10). Abierto a
 * todo Paragon, no solo a tus amigos, para que haya con quién picarse aunque
 * acabes de llegar. Módulo puro: `tests/eventos.test.ts`.
 */
import { CATEGORIAS_GENERO, type CategoriaDna } from "@/lib/trophyDna";

export interface EventoMes {
  /** "2026-11" */
  clave: string;
  categoria: CategoriaDna;
  /** Géneros de IGDB que entran (los de la categoría en lib/trophyDna.ts). */
  generos: string[];
  inicio: Date;
  /** Primer instante del mes siguiente (no incluido). */
  fin: Date;
}

/** El género de cada mes va rotando; con 7 categorías, ningún mes repite el del año anterior. */
export function eventoDelMes(fecha: Date): EventoMes {
  const anio = fecha.getUTCFullYear();
  const mes = fecha.getUTCMonth();
  const indice = (anio * 12 + mes) % CATEGORIAS_GENERO.length;
  const cat = CATEGORIAS_GENERO[indice];
  return {
    clave: `${anio}-${String(mes + 1).padStart(2, "0")}`,
    categoria: cat.key,
    generos: [...cat.generos],
    inicio: new Date(Date.UTC(anio, mes, 1)),
    fin: new Date(Date.UTC(anio, mes + 1, 1)),
  };
}

export function eventoAnterior(fecha: Date): EventoMes {
  return eventoDelMes(new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() - 1, 15)));
}
