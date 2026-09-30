import "server-only";
import { and, eq, gt, inArray, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { coopChallenges, games, userGames, users } from "@/db/schema";
import { avisarUsuario } from "@/lib/avisos";
import { listFriends } from "@/lib/profiles";

/**
 * "Platinar juntos": dos amigos con el mismo juego a medias se proponen
 * terminarlo antes de una fecha. Cada uno puede tenerlo en su plataforma
 * (se empareja por igdbId, o por el mismo id si no hay igdbId). El cron
 * (`revisarRetosCoop`) avisa cuando lo consiguen los dos o vence la fecha.
 */

export class CoopError extends Error {}

export interface JuegoEnComun {
  amigo: { userId: string; handle: string | null; nombre: string; avatar: string | null };
  titulo: string;
  iconUrl: string | null;
  miGameId: string;
  suGameId: string;
  miProgreso: number;
  suProgreso: number;
}

const nombreCorto = (name: string | null, handle: string | null) => name?.trim().split(/\s+/)[0] || (handle ? `@${handle}` : "Alguien");

/** Juegos que tú y algún amigo tenéis a medias a la vez (1-99%). */
export async function juegosEnComun(userId: string, maximo = 12): Promise<JuegoEnComun[]> {
  const amigos = await listFriends(userId);
  if (amigos.length === 0) return [];

  const filas = await db
    .select({
      userId: userGames.userId,
      gameId: userGames.gameId,
      progreso: userGames.progressPercent,
      igdbId: games.igdbId,
      titulo: games.title,
      iconUrl: games.iconUrl,
    })
    .from(userGames)
    .innerJoin(games, eq(games.id, userGames.gameId))
    .where(
      and(
        inArray(userGames.userId, [userId, ...amigos.map((a) => a.userId)]),
        eq(userGames.isWishlist, false),
        gt(userGames.progressPercent, 0),
        lt(userGames.progressPercent, 100),
      ),
    );

  const clave = (f: { igdbId: number | null; gameId: string }) => (f.igdbId !== null ? `igdb:${f.igdbId}` : f.gameId);
  const mios = new Map(filas.filter((f) => f.userId === userId).map((f) => [clave(f), f]));
  const amigoPorId = new Map(amigos.map((a) => [a.userId, a]));

  const resultado: JuegoEnComun[] = [];
  for (const f of filas) {
    if (f.userId === userId) continue;
    const mio = mios.get(clave(f));
    const amigo = amigoPorId.get(f.userId);
    if (!mio || !amigo) continue;
    resultado.push({
      amigo: { userId: amigo.userId, handle: amigo.handle, nombre: nombreCorto(amigo.displayName, amigo.handle), avatar: amigo.avatarUrl ?? amigo.image },
      titulo: mio.titulo,
      iconUrl: mio.iconUrl,
      miGameId: mio.gameId,
      suGameId: f.gameId,
      miProgreso: mio.progreso,
      suProgreso: f.progreso,
    });
  }
  // Los más igualados primero: es donde un reto conjunto tiene más gracia.
  return resultado.sort((a, b) => Math.abs(a.miProgreso - a.suProgreso) - Math.abs(b.miProgreso - b.suProgreso)).slice(0, maximo);
}

export async function proponerReto(
  creadorId: string,
  datos: { invitadoId: string; miGameId: string; suGameId: string; fecha: string },
): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) throw new CoopError("Fecha no válida.");
  const fin = new Date(`${datos.fecha}T23:59:59Z`).getTime();
  if (Number.isNaN(fin) || fin < Date.now() || fin > Date.now() + 180 * 86_400_000) {
    throw new CoopError("Elige una fecha de aquí a 6 meses.");
  }
  const comun = (await juegosEnComun(creadorId, 500)).find(
    (j) => j.amigo.userId === datos.invitadoId && j.miGameId === datos.miGameId && j.suGameId === datos.suGameId,
  );
  if (!comun) throw new CoopError("Ese juego no lo tenéis los dos a medias.");

  const [abierto] = await db
    .select({ id: coopChallenges.id })
    .from(coopChallenges)
    .where(
      and(
        inArray(coopChallenges.estado, ["pendiente", "activo"]),
        or(
          and(eq(coopChallenges.creadorId, creadorId), eq(coopChallenges.invitadoId, datos.invitadoId)),
          and(eq(coopChallenges.creadorId, datos.invitadoId), eq(coopChallenges.invitadoId, creadorId)),
        ),
        or(eq(coopChallenges.gameIdCreador, datos.miGameId), eq(coopChallenges.gameIdInvitado, datos.miGameId)),
      ),
    )
    .limit(1);
  if (abierto) throw new CoopError("Ya tenéis un reto abierto con ese juego.");

  await db.insert(coopChallenges).values({
    creadorId,
    invitadoId: datos.invitadoId,
    gameIdCreador: datos.miGameId,
    gameIdInvitado: datos.suGameId,
    titulo: comun.titulo,
    fechaObjetivo: datos.fecha,
  });

  const [yo] = await db.select({ name: users.name, handle: users.handle }).from(users).where(eq(users.id, creadorId)).limit(1);
  await avisarUsuario(datos.invitadoId, {
    titulo: `🤝 ${nombreCorto(yo?.name ?? null, yo?.handle ?? null)} te propone platinar juntos`,
    texto: `${comun.titulo} antes del ${new Date(`${datos.fecha}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}. Acéptalo desde el Planificador.`,
    ruta: "/amigos",
  });
}

export async function responderReto(userId: string, retoId: string, aceptar: boolean): Promise<void> {
  const [reto] = await db.select().from(coopChallenges).where(eq(coopChallenges.id, retoId)).limit(1);
  if (!reto || reto.invitadoId !== userId || reto.estado !== "pendiente") throw new CoopError("Ese reto ya no está pendiente.");
  await db.update(coopChallenges).set({ estado: aceptar ? "activo" : "rechazado" }).where(eq(coopChallenges.id, retoId));
  if (aceptar) {
    await avisarUsuario(reto.creadorId, {
      titulo: "🤝 Reto aceptado",
      texto: `A por ${reto.titulo} los dos antes del ${reto.fechaObjetivo}.`,
      ruta: "/amigos",
    });
  }
}

export interface RetoVista {
  id: string;
  estado: string;
  titulo: string;
  fechaObjetivo: string;
  soyCreador: boolean;
  otro: { nombre: string; handle: string | null };
  miProgreso: number;
  suProgreso: number;
}

/** Retos pendientes y activos en los que participas, con el progreso de los dos. */
export async function misRetos(userId: string): Promise<RetoVista[]> {
  const retos = await db
    .select()
    .from(coopChallenges)
    .where(
      and(
        inArray(coopChallenges.estado, ["pendiente", "activo", "cumplido"]),
        or(eq(coopChallenges.creadorId, userId), eq(coopChallenges.invitadoId, userId)),
      ),
    )
    .limit(20);
  if (retos.length === 0) return [];

  const otrosIds = [...new Set(retos.map((r) => (r.creadorId === userId ? r.invitadoId : r.creadorId)))];
  const [otros, progresos] = await Promise.all([
    db.select({ id: users.id, name: users.name, handle: users.handle }).from(users).where(inArray(users.id, otrosIds)),
    db
      .select({ userId: userGames.userId, gameId: userGames.gameId, progreso: userGames.progressPercent })
      .from(userGames)
      .where(inArray(userGames.gameId, [...new Set(retos.flatMap((r) => [r.gameIdCreador, r.gameIdInvitado]))])),
  ]);
  const otroPorId = new Map(otros.map((o) => [o.id, o]));
  const progreso = (uid: string, gid: string) => progresos.find((p) => p.userId === uid && p.gameId === gid)?.progreso ?? 0;

  return retos.map((r) => {
    const soyCreador = r.creadorId === userId;
    const otroId = soyCreador ? r.invitadoId : r.creadorId;
    const otro = otroPorId.get(otroId);
    return {
      id: r.id,
      estado: r.estado,
      titulo: r.titulo,
      fechaObjetivo: r.fechaObjetivo,
      soyCreador,
      otro: { nombre: nombreCorto(otro?.name ?? null, otro?.handle ?? null), handle: otro?.handle ?? null },
      miProgreso: progreso(userId, soyCreador ? r.gameIdCreador : r.gameIdInvitado),
      suProgreso: progreso(otroId, soyCreador ? r.gameIdInvitado : r.gameIdCreador),
    };
  });
}

/** Cron: cierra los retos activos cumplidos (los dos al 100%) o vencidos, y avisa. */
export async function revisarRetosCoop(hasta: number): Promise<number> {
  const activos = await db.select().from(coopChallenges).where(eq(coopChallenges.estado, "activo")).limit(50);
  let cerrados = 0;
  for (const r of activos) {
    if (Date.now() > hasta) break;
    const filas = await db
      .select({ userId: userGames.userId, gameId: userGames.gameId, progreso: userGames.progressPercent })
      .from(userGames)
      .where(
        or(
          and(eq(userGames.userId, r.creadorId), eq(userGames.gameId, r.gameIdCreador)),
          and(eq(userGames.userId, r.invitadoId), eq(userGames.gameId, r.gameIdInvitado)),
        ),
      );
    const completados = filas.filter((f) => f.progreso >= 100).length === 2;
    const vencido = new Date(`${r.fechaObjetivo}T23:59:59Z`).getTime() < Date.now();
    if (!completados && !vencido) continue;

    const estado = completados ? "cumplido" : "vencido";
    await db.update(coopChallenges).set({ estado }).where(and(eq(coopChallenges.id, r.id), eq(coopChallenges.estado, "activo")));
    const aviso = completados
      ? { titulo: `🏆 ¡Reto conseguido: ${r.titulo}!`, texto: "Lo habéis terminado los dos a tiempo." }
      : { titulo: `⌛ Se acabó el plazo de ${r.titulo}`, texto: "El reto conjunto ha vencido. ¿Otro intento?" };
    await Promise.all([r.creadorId, r.invitadoId].map((uid) => avisarUsuario(uid, { ...aviso, ruta: "/amigos" })));
    cerrados++;
  }
  return cerrados;
}
