import "server-only";
import { and, desc, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { noDeclaradoPorId } from "@/lib/declaradoSql";
import { friendChallengeParticipants, friendChallenges, userTrophies, users } from "@/db/schema";
import { avatarUrlSql } from "@/lib/avatarSql";
import { avisarUsuario } from "@/lib/avisos";
import { contieneLenguajeOfensivo } from "@/lib/contentFilter";
import { listFriends } from "@/lib/profiles";
import { ganadoresReto, DURACIONES_RETO, MAX_INVITADOS_RETO, MAX_RETOS_ABIERTOS } from "@/lib/retosAmigosReglas";

/**
 * Retos entre amigos: quien lo crea invita a los amigos que quiera y elige
 * cuánto dura. Gana quien más trofeos consiga entre los que aceptan, con las
 * fechas del reto — cada reto es un grupo cerrado, así que no importa que
 * cada uno tenga amigos distintos (la pega de "ganar la semana" de /amigos).
 *
 * Los trofeos se cuentan por `earnedAt` (la fecha real de la plataforma), así
 * que los que se sincronizan tarde también cuentan. Por eso el cron no cierra
 * un reto hasta `MARGEN_CIERRE` después de su fin: da tiempo a una pasada de
 * sincronización diaria.
 */

/** El texto lo pone la interfaz (`Perfil.RetosAmigos.errores.<codigo>`). */
export class RetoAmigosError extends Error {
  constructor(public codigo: string) {
    super(codigo);
  }
}

const MARGEN_CIERRE = 12 * 3_600_000;

const nombreCorto = (name: string | null, handle: string | null) => name?.trim().split(/\s+/)[0] || (handle ? `@${handle}` : "Alguien");

export async function crearRetoAmigos(
  creadorId: string,
  datos: { invitados: string[]; dias: number; titulo?: string },
): Promise<void> {
  if (!(DURACIONES_RETO as readonly number[]).includes(datos.dias)) throw new RetoAmigosError("duracion");
  const invitados = [...new Set(datos.invitados)].filter((id) => id !== creadorId);
  if (invitados.length === 0) throw new RetoAmigosError("sinInvitados");
  if (invitados.length > MAX_INVITADOS_RETO) throw new RetoAmigosError("demasiados");

  const titulo = datos.titulo?.trim().slice(0, 60) || null;
  if (titulo && contieneLenguajeOfensivo(titulo)) throw new RetoAmigosError("ofensivo");

  const amigos = new Set((await listFriends(creadorId)).map((a) => a.userId));
  if (invitados.some((id) => !amigos.has(id))) throw new RetoAmigosError("noAmigo");

  const [{ abiertos }] = await db
    .select({ abiertos: sql<number>`count(*)::int` })
    .from(friendChallenges)
    .where(and(eq(friendChallenges.creadorId, creadorId), eq(friendChallenges.estado, "activo")));
  if (abiertos >= MAX_RETOS_ABIERTOS) throw new RetoAmigosError("limite");

  const inicio = new Date();
  const fin = new Date(inicio.getTime() + datos.dias * 86_400_000);
  const id = crypto.randomUUID();
  await db.insert(friendChallenges).values({ id, creadorId, titulo, inicio, fin });
  await db.insert(friendChallengeParticipants).values([
    { challengeId: id, userId: creadorId, estado: "aceptado" },
    ...invitados.map((userId) => ({ challengeId: id, userId })),
  ]);

  const [yo] = await db.select({ name: users.name, handle: users.handle }).from(users).where(eq(users.id, creadorId)).limit(1);
  const quien = nombreCorto(yo?.name ?? null, yo?.handle ?? null);
  // Sin categoría: es una invitación dirigida a ti, llega siempre (igual que las de amistad).
  await Promise.allSettled(
    invitados.map((uid) =>
      avisarUsuario(uid, {
        titulo: `⚔️ ${quien} te reta`,
        texto: `${titulo ? `«${titulo}»: ` : ""}quien más trofeos consiga en ${datos.dias} días gana. Acéptalo desde Amigos.`,
        ruta: "/amigos",
      }),
    ),
  );
}

async function participanteActivo(userId: string, challengeId: string) {
  const [fila] = await db
    .select({ estadoReto: friendChallenges.estado, fin: friendChallenges.fin, creadorId: friendChallenges.creadorId, estado: friendChallengeParticipants.estado })
    .from(friendChallengeParticipants)
    .innerJoin(friendChallenges, eq(friendChallenges.id, friendChallengeParticipants.challengeId))
    .where(and(eq(friendChallengeParticipants.challengeId, challengeId), eq(friendChallengeParticipants.userId, userId)))
    .limit(1);
  if (!fila || fila.estadoReto !== "activo" || fila.fin.getTime() < Date.now()) throw new RetoAmigosError("cerrado");
  return fila;
}

export async function responderRetoAmigos(userId: string, challengeId: string, aceptar: boolean): Promise<void> {
  const fila = await participanteActivo(userId, challengeId);
  if (fila.estado !== "pendiente") throw new RetoAmigosError("yaRespondido");
  await db
    .update(friendChallengeParticipants)
    .set({ estado: aceptar ? "aceptado" : "rechazado" })
    .where(and(eq(friendChallengeParticipants.challengeId, challengeId), eq(friendChallengeParticipants.userId, userId)));

  if (aceptar) {
    const [yo] = await db.select({ name: users.name, handle: users.handle }).from(users).where(eq(users.id, userId)).limit(1);
    await avisarUsuario(fila.creadorId, {
      titulo: "⚔️ Reto aceptado",
      texto: `${nombreCorto(yo?.name ?? null, yo?.handle ?? null)} entra en tu reto.`,
      ruta: "/amigos",
    }, "social");
  }
}

/** Solo quien lo creó, y mientras esté en marcha. */
export async function cancelarRetoAmigos(userId: string, challengeId: string): Promise<void> {
  const fila = await participanteActivo(userId, challengeId);
  if (fila.creadorId !== userId) throw new RetoAmigosError("noCreador");
  await db.update(friendChallenges).set({ estado: "cancelado" }).where(eq(friendChallenges.id, challengeId));
}

/** Trofeos conseguidos por cada uno entre `desde` y `hasta` (por fecha real de la plataforma). */
async function trofeosEntre(userIds: string[], desde: Date, hasta: Date): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const filas = await db
    .select({ userId: userTrophies.userId, total: sql<number>`count(*)::int` })
    .from(userTrophies)
    // Progreso declarado (Epic) no cuenta en retos entre amigos: lib/declarado.ts.
    .where(and(inArray(userTrophies.userId, userIds), eq(userTrophies.earned, true), gte(userTrophies.earnedAt, desde), lte(userTrophies.earnedAt, hasta), ...noDeclaradoPorId(userTrophies.gameId)))
    .groupBy(userTrophies.userId);
  return new Map(filas.map((f) => [f.userId, Number(f.total)]));
}

export interface ParticipanteReto {
  userId: string;
  nombre: string;
  handle: string | null;
  avatar: string | null;
  estado: string;
  trofeos: number;
  ganador: boolean;
}

export interface RetoAmigosVista {
  id: string;
  titulo: string | null;
  estado: string;
  inicio: string;
  fin: string;
  /** Días que quedan (0 si ya acabó y está pendiente de cerrarse). */
  diasRestantes: number;
  soyCreador: boolean;
  miEstado: string;
  participantes: ParticipanteReto[];
}

/** Retos en marcha y los terminados de las últimas 2 semanas en los que estás (sin los que rechazaste). */
export async function misRetosAmigos(userId: string): Promise<RetoAmigosVista[]> {
  const hace14 = new Date(Date.now() - 14 * 86_400_000);
  const mios = await db
    .select({ reto: friendChallenges, miEstado: friendChallengeParticipants.estado })
    .from(friendChallengeParticipants)
    .innerJoin(friendChallenges, eq(friendChallenges.id, friendChallengeParticipants.challengeId))
    .where(
      and(
        eq(friendChallengeParticipants.userId, userId),
        ne(friendChallengeParticipants.estado, "rechazado"),
        or(eq(friendChallenges.estado, "activo"), and(eq(friendChallenges.estado, "terminado"), gte(friendChallenges.fin, hace14))),
      ),
    )
    .orderBy(desc(friendChallenges.fin))
    .limit(12);
  if (mios.length === 0) return [];

  const ids = mios.map((m) => m.reto.id);
  const participantes = await db
    .select({
      challengeId: friendChallengeParticipants.challengeId,
      userId: friendChallengeParticipants.userId,
      estado: friendChallengeParticipants.estado,
      resultado: friendChallengeParticipants.resultado,
      ganador: friendChallengeParticipants.ganador,
      name: users.name,
      handle: users.handle,
      avatar: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
    })
    .from(friendChallengeParticipants)
    .innerJoin(users, eq(users.id, friendChallengeParticipants.userId))
    .where(and(inArray(friendChallengeParticipants.challengeId, ids), ne(friendChallengeParticipants.estado, "rechazado")));

  // Los activos se cuentan en directo (una consulta por reto: son pocos y cada uno tiene sus fechas).
  const enDirecto = new Map<string, Map<string, number>>();
  await Promise.all(
    mios
      .filter((m) => m.reto.estado === "activo")
      .map(async (m) => {
        const aceptados = participantes.filter((p) => p.challengeId === m.reto.id && p.estado === "aceptado").map((p) => p.userId);
        const hasta = new Date(Math.min(Date.now(), m.reto.fin.getTime()));
        enDirecto.set(m.reto.id, await trofeosEntre(aceptados, m.reto.inicio, hasta));
      }),
  );

  return mios.map(({ reto, miEstado }) => ({
    id: reto.id,
    titulo: reto.titulo,
    estado: reto.estado,
    inicio: reto.inicio.toISOString(),
    fin: reto.fin.toISOString(),
    diasRestantes: Math.max(0, Math.ceil((reto.fin.getTime() - Date.now()) / 86_400_000)),
    soyCreador: reto.creadorId === userId,
    miEstado,
    participantes: participantes
      .filter((p) => p.challengeId === reto.id)
      .map((p) => ({
        userId: p.userId,
        nombre: nombreCorto(p.name, p.handle),
        handle: p.handle,
        avatar: p.avatar,
        estado: p.estado,
        trofeos: reto.estado === "activo" ? (enDirecto.get(reto.id)?.get(p.userId) ?? 0) : (p.resultado ?? 0),
        ganador: p.ganador,
      }))
      .sort((a, b) => Number(b.estado === "aceptado") - Number(a.estado === "aceptado") || b.trofeos - a.trofeos),
  }));
}

/** Cron: cierra los retos que acabaron hace más de `MARGEN_CIERRE`, apunta el resultado y avisa. */
export async function cerrarRetosAmigos(hastaReloj: number): Promise<number> {
  const vencidos = await db
    .select()
    .from(friendChallenges)
    .where(and(eq(friendChallenges.estado, "activo"), lte(friendChallenges.fin, new Date(Date.now() - MARGEN_CIERRE))))
    .limit(30);

  let cerrados = 0;
  for (const reto of vencidos) {
    if (Date.now() > hastaReloj) break;
    const participantes = await db
      .select({ userId: friendChallengeParticipants.userId, estado: friendChallengeParticipants.estado })
      .from(friendChallengeParticipants)
      .where(eq(friendChallengeParticipants.challengeId, reto.id));
    const aceptados = participantes.filter((p) => p.estado === "aceptado").map((p) => p.userId);
    const nombre = reto.titulo ? `«${reto.titulo}»` : "tu reto";

    if (aceptados.length < 2) {
      await db.update(friendChallenges).set({ estado: "cancelado" }).where(and(eq(friendChallenges.id, reto.id), eq(friendChallenges.estado, "activo")));
      await avisarUsuario(reto.creadorId, { titulo: "⚔️ Reto sin rivales", texto: `Nadie aceptó ${nombre} a tiempo.`, ruta: "/amigos" }, "social");
      cerrados++;
      continue;
    }

    const cuenta = await trofeosEntre(aceptados, reto.inicio, reto.fin);
    const resultados = aceptados.map((userId) => ({ userId, trofeos: cuenta.get(userId) ?? 0 }));
    const ganadores = new Set(ganadoresReto(resultados));

    const [cerrado] = await db
      .update(friendChallenges)
      .set({ estado: "terminado" })
      .where(and(eq(friendChallenges.id, reto.id), eq(friendChallenges.estado, "activo")))
      .returning({ id: friendChallenges.id });
    if (!cerrado) continue; // otra pasada del cron se adelantó

    for (const r of resultados) {
      await db
        .update(friendChallengeParticipants)
        .set({ resultado: r.trofeos, ganador: ganadores.has(r.userId) })
        .where(and(eq(friendChallengeParticipants.challengeId, reto.id), eq(friendChallengeParticipants.userId, r.userId)));
    }

    const nombres = await db.select({ id: users.id, name: users.name, handle: users.handle }).from(users).where(inArray(users.id, [...ganadores]));
    const quienes = nombres.map((n) => nombreCorto(n.name, n.handle)).join(" y ");
    await Promise.allSettled(
      resultados.map((r) =>
        avisarUsuario(
          r.userId,
          ganadores.size === 0
            ? { titulo: "⚔️ Reto terminado", texto: `${nombre} acabó sin trofeos para nadie: empate a cero.`, ruta: "/amigos" }
            : ganadores.has(r.userId)
              ? { titulo: ganadores.size > 1 ? "🏆 ¡Empate en cabeza!" : "🏆 ¡Has ganado el reto!", texto: `${nombre}: ${r.trofeos} trofeos.`, ruta: "/amigos" }
              : { titulo: "⚔️ Reto terminado", texto: `Gana ${quienes} en ${nombre}. Tú: ${r.trofeos} trofeos.`, ruta: "/amigos" },
          "social",
        ),
      ),
    );
    cerrados++;
  }
  return cerrados;
}
