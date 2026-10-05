/**
 * Reglas puras del cierre de una liga privada (sin base de datos, con
 * tests en tests/ligasCierre.test.ts). Las usan lib/leagues.ts (bloquear
 * cambios en una liga terminada) y lib/trophyCase.ts (cerrarla en el cron).
 */

/** Una liga con fecha de fin ha terminado cuando esa fecha ya pasó. Sin fecha, nunca. */
export function ligaTerminada(endsAt: Date | string | null | undefined, ahora: Date = new Date()): boolean {
  if (!endsAt) return false;
  const fin = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  return !Number.isNaN(fin.getTime()) && fin.getTime() <= ahora.getTime();
}

/**
 * Quién gana: todos los que empatan en lo más alto, siempre que hayan
 * sumado algo (una liga en la que nadie consiguió un trofeo no tiene
 * ganador).
 */
export function ganadoresDeLiga(ranking: { userId: string; points: number }[]): string[] {
  const maximo = Math.max(0, ...ranking.map((r) => r.points));
  if (maximo <= 0) return [];
  return ranking.filter((r) => r.points === maximo).map((r) => r.userId);
}

/** Puesto de cada uno (1 = primero), con los empates compartiendo puesto. */
export function puestosDeLiga(ranking: { userId: string; points: number }[]): Map<string, number> {
  const ordenado = [...ranking].sort((a, b) => b.points - a.points);
  const puestos = new Map<string, number>();
  ordenado.forEach((r, i) => {
    const anterior = ordenado[i - 1];
    puestos.set(r.userId, anterior && anterior.points === r.points ? puestos.get(anterior.userId)! : i + 1);
  });
  return puestos;
}
