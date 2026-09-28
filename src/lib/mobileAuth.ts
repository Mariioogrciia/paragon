import "server-only";
import { and, count, eq, gt, ne } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";

/**
 * Autenticación para el cliente nativo de Android (Compose): usa un
 * `sessionToken` en la MISMA tabla `session` que Auth.js (estrategia en
 * base de datos, no JWT) — sin tabla nueva. Pero NO es el mismo token que
 * la cookie del navegador: `/movil/enlazar` lo cambia por uno propio nada
 * más recibirlo (`mintMobileSession`, ver abajo), para que cerrar sesión en
 * el móvil o en el navegador de ese teléfono sean cosas independientes.
 * El móvil manda `Authorization: Bearer <token>` y aquí se resuelve igual
 * que la cookie en el navegador.
 *
 * Vive fuera de la cookie a propósito: un `Request` de una API route no
 * pasa por `auth()` de la misma forma que un Server Component, y así el
 * mismo token sirve para cualquier ruta bajo `/api/mobile/*` sin repetir
 * la consulta a `session` en cada una.
 */
export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

export async function getMobileUserId(req: Request): Promise<string | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  const row = await db.query.sessions.findFirst({
    where: and(eq(sessions.sessionToken, token), gt(sessions.expires, new Date())),
  });

  return row?.userId ?? null;
}

// Mismo maxAge por defecto que usa Auth.js para sesiones en base de datos
// (no hay `session.maxAge` propio en auth.ts, así que hereda ese valor) —
// se replica aquí a mano porque esta fila la creamos nosotros, no el
// adaptador de Auth.js.
const TREINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Cambia la sesión "prestada" (la cookie que puso el login por Custom
 * Tab/Chrome, ver /movil/enlazar) por una propia del móvil, y BORRA la
 * prestada — desde este momento son dos filas de `session` independientes:
 * cerrar sesión en el Chrome de ese teléfono ya no toca la app, y al revés.
 */
export async function mintMobileSession(userId: string, sesionPrestada: string): Promise<string> {
  const mobileToken = crypto.randomUUID();

  await db.insert(sessions).values({
    sessionToken: mobileToken,
    userId,
    expires: new Date(Date.now() + TREINTA_DIAS_MS),
  });
  await db.delete(sessions).where(eq(sessions.sessionToken, sesionPrestada));

  return mobileToken;
}

/** Cierra sesión SOLO en este móvil — borra únicamente su fila de `session`. */
export async function revokeMobileSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.sessionToken, token));
}

/**
 * Token propio para la extensión de navegador (ver /movil/enlazar-extension
 * y /api/extension/psn-sync) — mismo mecanismo que `mintMobileSession` (una
 * fila nueva en `session`, Bearer en vez de cookie), pero SIN borrar nada:
 * a diferencia del móvil, aquí no hay una "sesión prestada" que consumir —
 * el usuario sigue con su pestaña de Paragon abierta con su cookie normal,
 * y la extensión vive en un tercer sitio (su propio storage), independiente
 * de las dos.
 */
export async function mintExtensionSession(userId: string): Promise<string> {
  const token = crypto.randomUUID();

  await db.insert(sessions).values({
    sessionToken: token,
    userId,
    expires: new Date(Date.now() + TREINTA_DIAS_MS),
  });

  return token;
}

/** Nombres de la cookie de sesión de Auth.js (con y sin HTTPS). */
export const COOKIES_SESION = ["__Secure-authjs.session-token", "authjs.session-token"];

/** Sesiones sin caducar de un usuario: navegadores, app Android y extensión. */
export async function contarSesionesActivas(userId: string): Promise<number> {
  const [fila] = await db
    .select({ n: count() })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expires, new Date())));
  return Number(fila?.n ?? 0);
}

/**
 * "Cerrar sesión en los demás dispositivos": borra todas las filas de
 * `session` del usuario salvo la de este navegador. Incluye la app Android y
 * la extensión (tokens propios, ver arriba) — antes no había forma de
 * revocarlas, y /movil/enlazar-extension crea una nueva en cada visita.
 */
export async function cerrarOtrasSesiones(userId: string, tokenActual: string): Promise<number> {
  const borradas = await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.sessionToken, tokenActual)))
    .returning({ token: sessions.sessionToken });
  return borradas.length;
}
