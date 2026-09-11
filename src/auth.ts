import NextAuth, { type Account } from "next-auth";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

/**
 * Vincula Google/Discord a la cuenta de Paragon que YA tiene sesión
 * abierta — pedido explícito del usuario: "una vez se tiene iniciada
 * sesión con Google o con Discord debe dejar vincular con la otra".
 *
 * Antes de esto, pulsar "Entrar con Discord" estando ya dentro con Google
 * (o al revés) NO los unía de verdad: Auth.js resuelve cualquier login por
 * su cuenta — busca el correo (con `allowDangerousEmailAccountLinking`) o,
 * si no coincide (el caso normal: el Gmail y el Discord de una persona
 * casi nunca son el mismo correo), **crea un usuario de Paragon nuevo y
 * cambia la sesión a él** — la sesión activa se pierde en silencio en vez
 * de sumar el segundo proveedor a la cuenta de siempre.
 *
 * La solución: si hay sesión abierta, escribir la fila en `accounts` A MANO
 * contra ESE usuario (con
 * `db.insert` en vez de dejar que Auth.js decida), y devolver una URL en
 * vez de `true` para cortar su flujo por defecto antes de que toque la
 * sesión. Casos:
 *   - Sin sesión abierta: no es un intento de vincular, es un login
 *     normal — se deja pasar (`true`), con el email-linking "peligroso"
 *     de siempre como red de seguridad para quien SÍ comparte correo.
 *   - Esa cuenta de Google/Discord ya es de OTRO usuario de Paragon: no
 *     se fusiona en silencio — se corta con un aviso, cada cuenta de
 *     Paragon es de una persona, no de un correo compartido a medias.
 *   - Ya es tuya (re-login normal del mismo proveedor con el que
 *     entraste): no hay nada que insertar, se deja pasar tal cual.
 *   - Genuinamente nueva: se inserta y se manda de vuelta a Ajustes.
 */
async function vincularLoginASesionActiva(account: Account) {
  const session = await auth();
  const userIdActual = session?.user?.id;
  // Sin sesión: es un login normal (o el primer inicio de sesión de
  // alguien nuevo en Paragon), no un intento de vincular — se deja pasar.
  if (!userIdActual) return true;

  const db = getDb();
  const existente = await db.query.accounts.findFirst({
    where: and(eq(accounts.provider, account.provider), eq(accounts.providerAccountId, account.providerAccountId)),
  });

  if (existente) {
    // Ya es tuya (mismo usuario): re-login normal, nada que hacer. De
    // otro usuario: no se fusiona en silencio.
    return existente.userId === userIdActual ? true : "/ajustes/seguridad?error=cuenta-ya-vinculada";
  }

  // `Account` (next-auth) extiende `Partial<TokenEndpointResponse>`, que
  // admite cualquier valor JSON en sus campos "extra" del proveedor — de
  // ahí los `String(...)`/`Number(...)` explícitos: las columnas de
  // `accounts` (schema.ts) son texto/entero de verdad, no JSON suelto.
  await db.insert(accounts).values({
    userId: userIdActual,
    type: account.type as (typeof accounts.$inferInsert)["type"],
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    refresh_token: account.refresh_token != null ? String(account.refresh_token) : null,
    access_token: account.access_token != null ? String(account.access_token) : null,
    expires_at: account.expires_at != null ? Number(account.expires_at) : null,
    token_type: account.token_type != null ? String(account.token_type) : null,
    scope: account.scope != null ? String(account.scope) : null,
    id_token: account.id_token != null ? String(account.id_token) : null,
    session_state: account.session_state != null ? String(account.session_state) : null,
  });

  return "/ajustes/seguridad?vinculado=1";
}

/**
 * Autenticación de la app (no de PSN: eso es otra cosa, ver lib/psn).
 *
 * Delegamos en Google y Discord a propósito: así no guardamos contraseñas de
 * nadie, ni tenemos que resolver el "olvidé mi contraseña" ni el 2FA.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // Solo los proveedores que estén configurados: un proveedor a medias falla
  // al pulsarlo, no al arrancar, que es la peor forma de enterarse.
  providers: [
    ...(process.env.AUTH_GOOGLE_ID
      ? [
          Google({
            // Une por email verificado en vez de rechazar el login.
            //
            // Sin esto, quien ya entró una vez con Discord y luego pulsa
            // Google recibe un `OAuthAccountNotLinked` y vuelve al login sin
            // explicación: Auth.js no enlaza dos proveedores al mismo usuario
            // por su cuenta. Se llama "dangerous" porque con un proveedor que
            // NO verifique el correo, cualquiera podría reclamar tu cuenta
            // registrando ese email. Google y Discord sí lo verifican, que es
            // la condición para que esto sea seguro.
            allowDangerousEmailAccountLinking: true,
            authorization: {
              // Sin el scope de Google Play Games: es "sensible" para Google
              // (obliga a verificación y a listar cada tester a mano en modo
              // Prueba, que es el "Acceso bloqueado" que se ve al entrar).
              // Y de nada sirve: lib/google/client.ts explica por qué esa
              // API nunca puede dar la biblioteca completa de un jugador,
              // solo logros del juego atado a este Client ID. openid/email/
              // profile son scopes normales — no piden verificación.
              params: {
                scope: "openid email profile",
              },
            },
          }),
        ]
      : []),
    // Mismo motivo que en Google: si no, entrar por el otro proveedor con el
    // mismo correo rebota al login sin decir por qué.
    ...(process.env.AUTH_DISCORD_ID
      ? [Discord({ allowDangerousEmailAccountLinking: true })]
      : []),
    // El proveedor de Epic Games (login OAuth para vincular la cuenta, no
    // para entrar a Paragon) se quitó el 11 de septiembre de 2026, junto
    // con Google Play y Ubisoft Connect — ninguna de las tres llegó a tener
    // sincronización real de logros. Detalle completo en HANDOFF.md y en el
    // comentario de PLATFORM_LABEL (lib/types.ts).
  ],
  pages: {
    signIn: "/entrar",
  },
  callbacks: {
    session({ session, user }) {
      // El handle viaja en la sesión para no consultarlo en cada página.
      session.user.id = user.id;
      session.user.handle = (user as { handle?: string | null }).handle ?? null;
      return session;
    },
    async signIn({ account }) {
      if (account?.provider === "google" || account?.provider === "discord") {
        return await vincularLoginASesionActiva(account);
      }
      return true;
    },
  },
}));
