import type { Trophy } from "@/lib/types";

/**
 * Junta los logros de un mismo juego leídos con varias cuentas (las de Steam
 * extra, ver lib/steamExtra.ts): conseguido si lo tiene cualquiera, con la
 * fecha más antigua. La lista base manda en el orden y los datos del logro;
 * si viene vacía (la cuenta no lo tiene), se usa la primera que no lo esté.
 */
export function juntarLogros(base: Trophy[], otras: Trophy[][]): Trophy[] {
  let juntos = base;
  for (const lista of otras) {
    if (lista.length === 0) continue;
    if (juntos.length === 0) {
      juntos = lista;
      continue;
    }
    const porId = new Map(lista.map((t) => [t.id, t]));
    juntos = juntos.map((t) => {
      const otro = porId.get(t.id);
      if (!otro?.earned) return t;
      if (!t.earned) return { ...t, earned: true, earnedAt: otro.earnedAt };
      const antes = [t.earnedAt, otro.earnedAt].filter((f): f is string => !!f).sort()[0];
      return { ...t, earnedAt: antes ?? t.earnedAt };
    });
  }
  return juntos;
}
