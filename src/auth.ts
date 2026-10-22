import { cache } from "react";
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
 * Vuelta del login de Epic: con sesión abierta, guarda esa cuenta de Epic
 * como la tuya y verificada; sin sesión, no entra a nadie (Epic no da
 * correo y no es una forma de crear cuentas en Paragon). Siempre devuelve
 * una URL: así Auth.js no crea usuario, ni fila en `accounts`, ni sesión.
 * Import dinámico para no cargar lib/profiles en cada `auth()`.
 */
async function verificarEpic(account: Account, nombre: string | null) {
  const userId = (await auth())?.user?.id;
  if (!userId) return "/entrar?epic=sin-sesion";
  const { guardarEpicVerificada } = await import("@/lib/epic/verificacion");
  const resultado = await guardarEpicVerificada(userId, account.providerAccountId, nombre ?? "Epic Games");
  return `/ajustes/plataformas?epic=${resultado}`;
}

/**
 * Autenticación de la app (no de PSN: eso es otra cosa, ver lib/psn).
 *
 * Delegamos en Google y Discord a propósito: así no guardamos contraseñas de
 * nadie, ni tenemos que resolver el "olvidé mi contraseña" ni el 2FA.
 */
/** Base del proxy de redirección de Epic (ver el proveedor `epic`); `undefined` = sin proxy. */
function proxyRedireccionEpic(): string | undefined {
  const propio = process.env.AUTH_EPIC_REDIRECT_PROXY_URL;
  if (propio !== undefined) return propio.trim() || undefined;
  return process.env.VERCEL_ENV === "production" ? "https://platinos-nine.vercel.app/api/auth" : undefined;
}

const { handlers, auth: uncachedAuth, signIn, signOut } = NextAuth(() => ({
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
    // Epic Games (vuelve el 21 oct 2026, ahora por Epic Account Services,
    // la vía oficial): SOLO para vincular y verificar la cuenta de Epic con
    // la sesión de Paragon ya abierta, nunca para entrar (ver el callback
    // `signIn` y lib/epic/verificacion.ts). OAuth a mano en vez de OIDC:
    // basta con `basic_profile`, y el id de cuenta llega en la respuesta del
    // token (`account_id`); el nombre se pide a la API de cuentas de Epic.
    ...(process.env.AUTH_EPIC_ID
      ? [
          {
            id: "epic",
            name: "Epic Games",
            type: "oauth" as const,
            issuer: "https://api.epicgames.dev/epic/oauth/v2",
            clientId: process.env.AUTH_EPIC_ID,
            clientSecret: process.env.AUTH_EPIC_SECRET,
            checks: ["state" as const],
            // Epic vuelve a la URL de redirección registrada en su portal, que
            // es la de platinos-nine.vercel.app y no deja cambiarla (22 oct
            // 2026). Auth.js manda a Epic esa dirección y, al volver, la
            // misma web (es el mismo despliegue y el `state` va cifrado con
            // AUTH_SECRET) reenvía a quien empezó en www.paragontrophies.com,
            // donde está su sesión. Solo en producción: en local no hay ese
            // AUTH_SECRET. Con AUTH_EPIC_REDIRECT_PROXY_URL="" se apaga.
            redirectProxyUrl: proxyRedireccionEpic(),
            authorization: { url: "https://www.epicgames.com/id/authorize", params: { scope: "basic_profile" } },
            token: "https://api.epicgames.dev/epic/oauth/v2/token",
            userinfo: {
              url: "https://api.epicgames.dev/epic/id/v2/accounts",
              async request({ tokens }: { tokens: { access_token?: string; account_id?: unknown } }) {
                const id = String(tokens.account_id ?? "");
                const res = await fetch(`https://api.epicgames.dev/epic/id/v2/accounts?accountId=${encodeURIComponent(id)}`, {
                  headers: { Authorization: `Bearer ${tokens.access_token}` },
                });
                const cuentas = res.ok ? ((await res.json()) as { accountId?: string; displayName?: string }[]) : [];
                return { accountId: id, displayName: cuentas[0]?.displayName ?? null };
              },
            },
            profile(p: { accountId: string; displayName: string | null }) {
              return { id: p.accountId, name: p.displayName, email: null, image: null };
            },
          },
        ]
      : []),
    // Google Play y Ubisoft Connect se quitaron el 11 de septiembre de 2026
    // (ninguna llegó a tener sincronización real de logros): HANDOFF.md.
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
    async signIn({ account, user }) {
      if (account?.provider === "google" || account?.provider === "discord") {
        return await vincularLoginASesionActiva(account);
      }
      if (account?.provider === "epic") return await verificarEpic(account, user.name ?? null);
      return true;
    },
  },
}));

// `auth()` (estrategia de sesión "database" vía DrizzleAdapter) hace una
// consulta a la base de datos por llamada — y se llama en el layout raíz Y
// en casi todas las páginas (48 sitios), así que sin memoizar, una sola
// carga de página paga esa consulta dos o más veces antes de que empiece
// ningún fetch propio de la página. `cache()` de React memoiza por
// petición: da igual cuántos Server Components llamen a `auth()`, la
// consulta real solo se hace una vez.
export const auth = cache(uncachedAuth);
export { handlers, signIn, signOut };
