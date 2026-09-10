import type { Game } from "@/lib/types";
import { esPlatinoEquivalente } from "@/lib/stats";

export interface DietaGamer {
  genero: string;
  juegos: { gameId: string; titulo: string }[];
  horasTotales: number;
}

/** Umbral de horas a partir del cual se avisa — arbitrario como cualquier regla de este tipo (mismo caso que el 5€/h de "Por amortizar" en la biblioteca), aquí puesto en 150h porque es lo que tardan de verdad 2-3 RPGs/mundo abierto seguidos según HLTB. */
const UMBRAL_HORAS = 150;

/**
 * "La Dieta Gamer": si tus últimos 3 juegos terminados comparten género Y
 * suman muchas horas, un aviso de que toca cambiar de aires antes del
 * siguiente — para no quemarte con el mismo tipo de juego una y otra vez.
 *
 * "Terminado" = `esPlatinoEquivalente` (mismo criterio de siempre), y el
 * ORDEN sale de `lastPlayedAt` (lo más reciente primero) — no hay una
 * fecha real de "cuándo lo terminaste" en ningún sitio del proyecto, así
 * que es la mejor aproximación honesta que hay, igual que ya se usa para
 * "Jugado recientemente" en Estadísticas.
 *
 * Solo cuenta con juegos que tienen `hltb.completionist` guardado — sin
 * ese dato no hay con qué sumar horas, así que ese juego simplemente no
 * entra en la cuenta, no se inventa una media.
 */
export function dietaGamer(games: Game[]): DietaGamer | null {
  const terminados = games
    .filter((g) => !g.isWishlist && esPlatinoEquivalente(g) && g.lastPlayedAt && g.genres && g.genres.length > 0)
    .sort((a, b) => new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime())
    .slice(0, 3);

  if (terminados.length < 3) return null;

  // Género compartido por LOS TRES, no solo por dos — "denso de verdad"
  // significa que ninguno rompe la racha, no que la mayoría coincida.
  const [primero, ...resto] = terminados;
  const generoComun = primero.genres!.find((g) => resto.every((otro) => otro.genres!.includes(g)));
  if (!generoComun) return null;

  const conHoras = terminados.filter((g) => g.hltb?.completionist != null);
  if (conHoras.length === 0) return null;

  const horasTotales = conHoras.reduce((acc, g) => acc + g.hltb!.completionist!, 0);
  if (horasTotales < UMBRAL_HORAS) return null;

  return {
    genero: generoComun,
    juegos: terminados.map((g) => ({ gameId: g.id, titulo: g.title })),
    horasTotales: Math.round(horasTotales),
  };
}
