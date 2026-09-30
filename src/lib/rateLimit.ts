import "server-only";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

/**
 * Limitador de peticiones con ventana fija, en Postgres (auditoría, 28 sept
 * 2026: no había ninguno — cualquiera podía gastar la cuota de IGDB, lanzar
 * scraping de YouTube o subir archivos sin tope).
 *
 * Por qué en la base y no en memoria: con varias instancias de función, un
 * contador en memoria solo ve su parte del tráfico. Y no el WAF de Vercel:
 * en Hobby solo admite UNA regla por proyecto y se configura a mano en el
 * panel.
 *
 * Falla ABIERTO: si la tabla no existe todavía o la base da error, deja
 * pasar. Un limitador caído no puede tumbar la app entera.
 */
// La tabla aún no existe (falta `scripts/crear-tabla-rate-limit.mts`): se
// avisa una vez por instancia y se deja de intentar, en vez de llenar los
// logs con el mismo error en cada petición.
let sinTabla = false;

export async function dentroDelLimite(clave: string, maximo: number, ventanaSegundos: number): Promise<boolean> {
  if (sinTabla) return true;
  try {
    const [fila] = await db
      .insert(rateLimits)
      // `ventana` por defecto `now()` de Postgres, igual que en el UPDATE: la
      // hora sale siempre del mismo reloj, no del de cada función.
      .values({ clave, cuenta: 1 })
      .onConflictDoUpdate({
        target: rateLimits.clave,
        set: {
          cuenta: sql`case when ${rateLimits.ventana} < now() - make_interval(secs => ${ventanaSegundos}) then 1 else ${rateLimits.cuenta} + 1 end`,
          ventana: sql`case when ${rateLimits.ventana} < now() - make_interval(secs => ${ventanaSegundos}) then now() else ${rateLimits.ventana} end`,
        },
      })
      .returning({ cuenta: rateLimits.cuenta });
    return (fila?.cuenta ?? 0) <= maximo;
  } catch (error) {
    const causa = (error as { cause?: { code?: string } })?.cause;
    if (causa?.code === "42P01") {
      sinTabla = true;
      console.warn("[rate-limit] falta la tabla rate_limit — límites desactivados hasta crearla");
    } else {
      console.error("[rate-limit]", clave, error instanceof Error ? error.message : error);
    }
    return true;
  }
}

/** IP del cliente según Vercel (`x-forwarded-for`, primera entrada). */
export function ipDe(cabeceras: Headers): string {
  return cabeceras.get("x-forwarded-for")?.split(",")[0]?.trim() || cabeceras.get("x-real-ip") || "desconocida";
}

/** Para Server Actions, que no reciben el `Request`. */
export async function ipActual(): Promise<string> {
  return ipDe(await headers());
}

/** Límites por acción: [máximo, ventana en segundos]. */
export const LIMITES = {
  busquedaJuegos: [30, 60],
  guiaVideo: [30, 60],
  guiaVideoRebuscar: [10, 60],
  subida: [10, 600],
  comentario: [20, 60],
  estado: [5, 600],
  arcade: [30, 60],
  psnExtension: [5, 600],
  perfil: [20, 60],
} as const satisfies Record<string, readonly [number, number]>;

export function limitar(accion: keyof typeof LIMITES, quien: string): Promise<boolean> {
  const [maximo, ventana] = LIMITES[accion];
  return dentroDelLimite(`${accion}:${quien}`, maximo, ventana);
}
