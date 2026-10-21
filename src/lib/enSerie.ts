/**
 * Espera una lista de consultas UNA DETRÁS DE OTRA (22 oct 2026). Las
 * consultas de drizzle no arrancan hasta que se esperan, así que esto, a
 * diferencia de `Promise.all`, ocupa una sola conexión del pool (que tiene
 * `max: 5`, ver db/index.ts). Admin → Analítica lanzaba unas 28 a la vez y
 * se quedaba colgado esperando hueco.
 */
export async function enSerie<T extends readonly unknown[]>(consultas: T): Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }> {
  const resultados: unknown[] = [];
  for (const c of consultas) resultados.push(await c);
  return resultados as { -readonly [K in keyof T]: Awaited<T[K]> };
}

/**
 * Recuerda el resultado de `fn` durante `ms` en esta instancia del servidor.
 * Para paneles caros que no necesitan cifras al segundo: si dos cargas
 * llegan a la vez, comparten la misma promesa.
 */
const memoria = new Map<string, { hasta: number; valor: Promise<unknown> }>();
export function recordado<T>(clave: string, ms: number, fn: () => Promise<T>): Promise<T> {
  const ahora = Date.now();
  const hit = memoria.get(clave);
  if (hit && hit.hasta > ahora) return hit.valor as Promise<T>;
  const valor = fn().catch((error) => {
    memoria.delete(clave);
    throw error;
  });
  memoria.set(clave, { hasta: ahora + ms, valor });
  return valor;
}
