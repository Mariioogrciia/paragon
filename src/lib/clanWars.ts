import "server-only";
import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { clanMembers, clanWars, clans, gameTrophies, userTrophies } from "@/db/schema";
import { avisarUsuario } from "@/lib/avisos";

/**
 * Guerra de clanes: el líder de un clan reta a otro; si el líder del otro
 * acepta, durante DURACION_DIAS días compiten con la misma puntuación que
 * las ligas (platino 100, oro 50, plata 25, bronce 10 — ver lib/leagues.ts)
 * sumando a TODOS los miembros de cada clan. El cron cierra las vencidas.
 *
 * Una guerra pendiente o activa por clan como mucho: si no, un clan grande
 * podría retar a todos a la vez y ninguna significaría nada.
 */

export const DURACION_DIAS = 14;
/** Un reto sin contestar caduca: si no, bloquearía a los dos clanes para siempre. */
export const CADUCIDAD_RETO_DIAS = 7;
const caducidadReto = () => new Date(Date.now() - CADUCIDAD_RETO_DIAS * 86_400_000);

export class GuerraError extends Error {}

const puntosSql = sql<number>`coalesce(sum(
  case
    when ${gameTrophies.grade} = 'platinum' then 100
    when ${gameTrophies.grade} = 'gold' then 50
    when ${gameTrophies.grade} = 'silver' then 25
    else 10
  end
), 0)`;

/** Puntos de un clan entre dos fechas (miembros ACTUALES del clan). */
export async function puntosDeClan(clanId: string, desde: Date, hasta: Date): Promise<number> {
  const miembros = await db.select({ userId: clanMembers.userId }).from(clanMembers).where(eq(clanMembers.clanId, clanId));
  if (miembros.length === 0) return 0;
  const [fila] = await db
    .select({ puntos: puntosSql })
    .from(userTrophies)
    .innerJoin(gameTrophies, and(eq(gameTrophies.gameId, userTrophies.gameId), eq(gameTrophies.trophyId, userTrophies.trophyId)))
    .where(
      and(
        inArray(userTrophies.userId, miembros.map((m) => m.userId)),
        eq(userTrophies.earned, true),
        gte(userTrophies.earnedAt, desde),
        lte(userTrophies.earnedAt, hasta),
      ),
    );
  return Number(fila?.puntos ?? 0);
}

async function liderDe(clanId: string): Promise<string | null> {
  const [clan] = await db.select({ ownerId: clans.ownerId }).from(clans).where(eq(clans.id, clanId)).limit(1);
  return clan?.ownerId ?? null;
}

async function guerraAbierta(clanId: string) {
  const [guerra] = await db
    .select()
    .from(clanWars)
    .where(
      and(
        or(eq(clanWars.retadorId, clanId), eq(clanWars.retadoId, clanId)),
        or(eq(clanWars.estado, "activa"), and(eq(clanWars.estado, "pendiente"), gte(clanWars.creadoAt, caducidadReto()))),
      ),
    )
    .limit(1);
  return guerra ?? null;
}

async function avisarMiembros(clanId: string, aviso: { titulo: string; texto: string; ruta?: string }) {
  const miembros = await db.select({ userId: clanMembers.userId }).from(clanMembers).where(eq(clanMembers.clanId, clanId));
  await Promise.all(miembros.map((m) => avisarUsuario(m.userId, aviso, "ligas")));
}

export async function retarClan(userId: string, retadorId: string, retadoId: string): Promise<void> {
  if (retadorId === retadoId) throw new GuerraError("Un clan no puede retarse a sí mismo.");
  if ((await liderDe(retadorId)) !== userId) throw new GuerraError("Solo el líder del clan puede retar a otro.");

  const [retador] = await db.select({ name: clans.name, tag: clans.tag }).from(clans).where(eq(clans.id, retadorId)).limit(1);
  const [retado] = await db.select({ ownerId: clans.ownerId, tag: clans.tag }).from(clans).where(eq(clans.id, retadoId)).limit(1);
  if (!retador || !retado) throw new GuerraError("Ese clan no existe.");
  if (await guerraAbierta(retadorId)) throw new GuerraError("Tu clan ya tiene una guerra pendiente o en marcha.");
  if (await guerraAbierta(retadoId)) throw new GuerraError("Ese clan ya tiene una guerra pendiente o en marcha.");

  await db.insert(clanWars).values({ retadorId, retadoId });
  await avisarUsuario(retado.ownerId, {
    titulo: "⚔️ Os han retado a una guerra de clanes",
    texto: `[${retador.tag}] ${retador.name} reta a tu clan a ${DURACION_DIAS} días de caza. Acepta o rechaza desde la página del clan.`,
    ruta: `/clanes/${retado.tag.toLowerCase()}`,
  });
}

export async function responderGuerra(userId: string, guerraId: string, aceptar: boolean): Promise<void> {
  const [guerra] = await db.select().from(clanWars).where(eq(clanWars.id, guerraId)).limit(1);
  if (!guerra || guerra.estado !== "pendiente" || guerra.creadoAt < caducidadReto()) {
    throw new GuerraError("Ese reto ya no está pendiente.");
  }
  if ((await liderDe(guerra.retadoId)) !== userId) throw new GuerraError("Solo el líder del clan retado puede responder.");

  if (!aceptar) {
    await db.update(clanWars).set({ estado: "rechazada" }).where(eq(clanWars.id, guerraId));
    return;
  }

  const ahora = new Date();
  const fin = new Date(ahora.getTime() + DURACION_DIAS * 86_400_000);
  await db.update(clanWars).set({ estado: "activa", empiezaAt: ahora, terminaAt: fin }).where(eq(clanWars.id, guerraId));

  const [a, b] = await Promise.all([
    db.select({ name: clans.name, tag: clans.tag }).from(clans).where(eq(clans.id, guerra.retadorId)).limit(1),
    db.select({ name: clans.name, tag: clans.tag }).from(clans).where(eq(clans.id, guerra.retadoId)).limit(1),
  ]);
  const texto = `[${a[0]?.tag}] contra [${b[0]?.tag}] durante ${DURACION_DIAS} días. Cada trofeo de cualquier miembro suma.`;
  await Promise.all([
    avisarMiembros(guerra.retadorId, { titulo: "⚔️ ¡Empieza la guerra de clanes!", texto, ruta: `/clanes/${a[0]?.tag.toLowerCase()}` }),
    avisarMiembros(guerra.retadoId, { titulo: "⚔️ ¡Empieza la guerra de clanes!", texto, ruta: `/clanes/${b[0]?.tag.toLowerCase()}` }),
  ]);
}

export interface GuerraVista {
  id: string;
  estado: string;
  soyRetador: boolean;
  rival: { id: string; name: string; tag: string };
  empiezaAt: Date | null;
  terminaAt: Date | null;
  /** Días que le quedan a una guerra activa (0 el último día). */
  diasRestantes: number | null;
  misPuntos: number | null;
  susPuntos: number | null;
  gane: boolean | null;
}

/** Guerra abierta (pendiente o activa, con puntos en vivo) y las 5 últimas terminadas, desde el punto de vista de `clanId`. */
export async function getGuerrasDeClan(clanId: string): Promise<{ abierta: GuerraVista | null; historial: GuerraVista[] }> {
  const filas = await db
    .select()
    .from(clanWars)
    .where(and(or(eq(clanWars.retadorId, clanId), eq(clanWars.retadoId, clanId)), inArray(clanWars.estado, ["pendiente", "activa", "terminada"])))
    .orderBy(desc(clanWars.creadoAt))
    .limit(10);
  if (filas.length === 0) return { abierta: null, historial: [] };

  const rivalesIds = [...new Set(filas.map((f) => (f.retadorId === clanId ? f.retadoId : f.retadorId)))];
  const rivales = await db.select({ id: clans.id, name: clans.name, tag: clans.tag }).from(clans).where(inArray(clans.id, rivalesIds));
  const rivalPorId = new Map(rivales.map((r) => [r.id, r]));

  const vistas = await Promise.all(
    filas.map(async (f): Promise<GuerraVista | null> => {
      const soyRetador = f.retadorId === clanId;
      const rival = rivalPorId.get(soyRetador ? f.retadoId : f.retadorId);
      if (!rival) return null;
      let misPuntos: number | null = null;
      let susPuntos: number | null = null;
      if (f.estado === "terminada") {
        misPuntos = soyRetador ? f.puntosRetador : f.puntosRetado;
        susPuntos = soyRetador ? f.puntosRetado : f.puntosRetador;
      } else if (f.estado === "activa" && f.empiezaAt && f.terminaAt) {
        [misPuntos, susPuntos] = await Promise.all([
          puntosDeClan(clanId, f.empiezaAt, f.terminaAt),
          puntosDeClan(rival.id, f.empiezaAt, f.terminaAt),
        ]);
      }
      return {
        id: f.id,
        estado: f.estado,
        soyRetador,
        rival,
        empiezaAt: f.empiezaAt,
        terminaAt: f.terminaAt,
        diasRestantes: f.terminaAt ? Math.max(0, Math.ceil((f.terminaAt.getTime() - Date.now()) / 86_400_000)) : null,
        misPuntos,
        susPuntos,
        gane: f.estado === "terminada" ? (f.ganadorId === null ? null : f.ganadorId === clanId) : null,
      };
    }),
  );
  const validas = vistas.filter((v): v is GuerraVista => v !== null);
  const filaPorId = new Map(filas.map((f) => [f.id, f]));
  const limite = caducidadReto();
  return {
    abierta:
      validas.find(
        (v) => v.estado === "activa" || (v.estado === "pendiente" && (filaPorId.get(v.id)?.creadoAt ?? limite) >= limite),
      ) ?? null,
    historial: validas.filter((v) => v.estado === "terminada").slice(0, 5),
  };
}

/** Clanes a los que se puede retar: todos menos el propio. */
export async function clanesRetables(clanId: string) {
  return db
    .select({ id: clans.id, name: clans.name, tag: clans.tag })
    .from(clans)
    .where(sql`${clans.id} <> ${clanId}`)
    .orderBy(clans.name)
    .limit(100);
}

/** Cron: cierra las guerras activas vencidas, fija el ganador y avisa. Devuelve cuántas cerró. */
export async function cerrarGuerrasVencidas(): Promise<number> {
  // Retos sin contestar a tiempo: rechazados sin más (sin aviso — nadie los
  // estaba esperando ya).
  await db
    .update(clanWars)
    .set({ estado: "rechazada" })
    .where(and(eq(clanWars.estado, "pendiente"), lte(clanWars.creadoAt, caducidadReto())));

  const vencidas = await db
    .select()
    .from(clanWars)
    .where(and(eq(clanWars.estado, "activa"), lte(clanWars.terminaAt, new Date())));

  for (const g of vencidas) {
    if (!g.empiezaAt || !g.terminaAt) continue;
    const [pa, pb] = await Promise.all([puntosDeClan(g.retadorId, g.empiezaAt, g.terminaAt), puntosDeClan(g.retadoId, g.empiezaAt, g.terminaAt)]);
    const ganadorId = pa === pb ? null : pa > pb ? g.retadorId : g.retadoId;
    // `estado = 'activa'` en el WHERE: si dos pasadas del cron coinciden,
    // solo una la cierra (y solo esa avisa).
    const cerradas = await db
      .update(clanWars)
      .set({ estado: "terminada", ganadorId, puntosRetador: pa, puntosRetado: pb })
      .where(and(eq(clanWars.id, g.id), eq(clanWars.estado, "activa")))
      .returning({ id: clanWars.id });
    if (cerradas.length === 0) continue;

    const [a, b] = await Promise.all([
      db.select({ tag: clans.tag }).from(clans).where(eq(clans.id, g.retadorId)).limit(1),
      db.select({ tag: clans.tag }).from(clans).where(eq(clans.id, g.retadoId)).limit(1),
    ]);
    const marcador = `[${a[0]?.tag}] ${pa} – ${pb} [${b[0]?.tag}]`;
    const resultado = (clanId: string) => (ganadorId === null ? "Empate" : ganadorId === clanId ? "¡Victoria!" : "Derrota");
    await Promise.all([
      avisarMiembros(g.retadorId, { titulo: `⚔️ ${resultado(g.retadorId)} en la guerra de clanes`, texto: marcador, ruta: `/clanes/${a[0]?.tag.toLowerCase()}` }),
      avisarMiembros(g.retadoId, { titulo: `⚔️ ${resultado(g.retadoId)} en la guerra de clanes`, texto: marcador, ruta: `/clanes/${b[0]?.tag.toLowerCase()}` }),
    ]);
  }
  return vencidas.length;
}
