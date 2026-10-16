import "server-only";
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { avisosBandeja, friendships, users } from "@/db/schema";
import { avisoPermitido } from "@/lib/avisosPreferencias";
import type { Idioma } from "@/lib/idiomasTrofeo";
import { traducirMensaje } from "@/lib/mensajesApi";

/**
 * Bandeja de avisos dentro de la plataforma (16 oct 2026). Antes, un aviso
 * (solicitud de amistad, te han adelantado en la liga, trofeo nuevo...) solo
 * existía como push: si no la tenías activada, o la descartabas, se perdía, y
 * estando dentro de la web no había dónde verlo. Ahora todo lo que sale por
 * push se guarda también aquí, y la web (campana de la cabecera,
 * components/CampanaAvisos.tsx) y la app (pantalla Avisos) lo enseñan, con
 * aviso en directo mientras estás dentro.
 *
 * Se guarda desde `avisarUsuario` (lib/avisos.ts) y desde los pocos sitios
 * que mandan push a mano (trofeos en lib/sync.ts, solicitudes de amistad,
 * invitaciones a ligas y clanes). Nada de aquí lanza: un aviso que no se
 * guarda nunca puede tumbar lo que lo provocó.
 */

export interface AvisoBandeja {
  id: string;
  titulo: string;
  texto: string;
  ruta: string | null;
  imagen: string | null;
  leido: boolean;
  createdAt: string;
}

export interface AvisoNuevo {
  titulo: string;
  texto: string;
  ruta?: string | null;
  imagen?: string | null;
}

/** Más viejos que esto se borran en el cron: la bandeja es de lo reciente. */
const DIAS_RETENCION = 60;
const MAX_LISTA = 40;

let tablaLista: Promise<boolean> | null = null;

/** Crea la tabla si no existe (una vez por instancia), como `asegurarTablaSteamExtra`. */
export function asegurarTablaAvisos(): Promise<boolean> {
  tablaLista ??= (async () => {
    try {
      const [fila] = await db.execute<{ existe: string | null }>(sql`select to_regclass('public.aviso')::text as existe`);
      if (fila?.existe) return true;
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "aviso" (
          "id" text PRIMARY KEY,
          "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
          "titulo" text NOT NULL,
          "texto" text NOT NULL,
          "ruta" text,
          "imagen" text,
          "leido" boolean NOT NULL DEFAULT false,
          "createdAt" timestamp NOT NULL DEFAULT now()
        )
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "aviso_userId_createdAt_idx" ON "aviso" ("userId", "createdAt")`);
      await db.execute(sql`ALTER TABLE "aviso" ENABLE ROW LEVEL SECURITY`);
      return true;
    } catch (error) {
      console.error("[bandeja] no se pudo crear la tabla", error);
      tablaLista = null;
      return false;
    }
  })();
  return tablaLista;
}

/** Guarda el mismo aviso para una o varias personas. Nunca lanza. */
export async function guardarAviso(userIds: string | string[], aviso: AvisoNuevo): Promise<void> {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  if (ids.length === 0) return;
  try {
    if (!(await asegurarTablaAvisos())) return;
    await db.insert(avisosBandeja).values(
      ids.map((userId) => ({
        id: randomUUID(),
        userId,
        titulo: aviso.titulo.slice(0, 200),
        texto: aviso.texto.slice(0, 500),
        ruta: aviso.ruta ?? null,
        imagen: aviso.imagen ?? null,
      })),
    );
  } catch (error) {
    console.error("[bandeja] guardar", error);
  }
}

/**
 * Lo último de la bandeja y cuántos quedan sin leer. Vacío si la tabla no
 * está. Los avisos se guardan en español (como las push); al leerlos se
 * traducen los más comunes (FIJOS y PATRONES de lib/mensajesApi.ts).
 */
export async function avisosDe(userId: string, idioma: Idioma = "es"): Promise<{ avisos: AvisoBandeja[]; noLeidos: number }> {
  if (!(await asegurarTablaAvisos())) return { avisos: [], noLeidos: 0 };
  const [filas, [sinLeer]] = await Promise.all([
    db
      .select()
      .from(avisosBandeja)
      .where(eq(avisosBandeja.userId, userId))
      .orderBy(desc(avisosBandeja.createdAt))
      .limit(MAX_LISTA),
    db
      .select({ n: count() })
      .from(avisosBandeja)
      .where(and(eq(avisosBandeja.userId, userId), eq(avisosBandeja.leido, false))),
  ]);
  return {
    avisos: filas.map((f) => ({
      id: f.id,
      titulo: traducirMensaje(f.titulo, idioma),
      texto: traducirMensaje(f.texto, idioma),
      ruta: f.ruta,
      imagen: f.imagen,
      leido: f.leido,
      createdAt: f.createdAt.toISOString(),
    })),
    noLeidos: Number(sinLeer?.n ?? 0),
  };
}

/** Al abrir la bandeja: todo leído. */
export async function marcarAvisosLeidos(userId: string): Promise<void> {
  if (!(await asegurarTablaAvisos())) return;
  await db
    .update(avisosBandeja)
    .set({ leido: true })
    .where(and(eq(avisosBandeja.userId, userId), eq(avisosBandeja.leido, false)));
}

/** Limpieza del cron: lo de hace más de DIAS_RETENCION días. */
export async function limpiarAvisosViejos(): Promise<number> {
  if (!(await asegurarTablaAvisos())) return 0;
  const limite = new Date(Date.now() - DIAS_RETENCION * 24 * 60 * 60 * 1000);
  const borrados = await db.delete(avisosBandeja).where(lt(avisosBandeja.createdAt, limite)).returning({ id: avisosBandeja.id });
  return borrados.length;
}

/**
 * "Tu amigo ha sacado un platino" (16 oct 2026): solo en la bandeja, sin
 * push, para no llenar el móvil de avisos de otros. Lo llama lib/sync.ts con
 * un platino nuevo de verdad. Quien apague "Platinos de tus amigos" en
 * Ajustes no lo recibe.
 */
export async function avisarAmigosDePlatino(userId: string, juego: { gameId: string; titulo: string; imagen: string | null }): Promise<void> {
  try {
    const [yo] = await db.select({ handle: users.handle, name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    if (!yo?.handle) return;
    const amigos = await db
      .select({ id: sql<string>`case when ${friendships.requesterId} = ${userId} then ${friendships.addresseeId} else ${friendships.requesterId} end` })
      .from(friendships)
      .where(
        and(
          eq(friendships.status, "accepted"),
          sql`(${friendships.requesterId} = ${userId} or ${friendships.addresseeId} = ${userId})`,
        ),
      );
    const destino: string[] = [];
    for (const a of amigos) {
      if (await avisoPermitido(a.id, "amigos")) destino.push(a.id);
    }
    await guardarAviso(destino, {
      titulo: `🏆 ${yo.name ?? `@${yo.handle}`} ha sacado un platino`,
      texto: juego.titulo,
      ruta: `/u/${yo.handle}/${juego.gameId}`,
      imagen: juego.imagen,
    });
  } catch (error) {
    console.error("[bandeja] platino de un amigo", error);
  }
}
