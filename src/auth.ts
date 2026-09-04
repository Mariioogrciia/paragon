import NextAuth, { customFetch } from "next-auth";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "@/db";
import { accounts, platformAccounts, sessions, users, verificationTokens } from "@/db/schema";

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
    ...(process.env.AUTH_EPIC_ID
      ? [
          {
            id: "epic",
            name: "Epic Games",
            type: "oauth" as const,
            version: "2.0" as const,
            authorization: {
              url: "https://www.epicgames.com/id/authorize",
              params: { response_type: "code", scope: "basic_profile" },
            },
            token: "https://api.epicgames.dev/epic/oauth/v2/token",
            userinfo: "https://api.epicgames.dev/epic/oauth/v2/userInfo",
            profile(profile: any) {
              return {
                id: profile.sub || profile.account_id,
                name: profile.preferred_username,
                email: profile.email || null,
              };
            },
            clientId: process.env.AUTH_EPIC_ID,
            clientSecret: process.env.AUTH_EPIC_SECRET,
            checks: ["state"] as ("pkce" | "state")[],
            /**
             * El endpoint de token de Epic no cumple RFC 6749 §2.3.1: si el
             * secret lleva "+" o "/", la cabecera Basic estándar (percent-encode
             * cada parte antes de unirlas y pasarlas a base64 — lo que hace la
             * librería por defecto) hace que Epic la rechace con
             * "invalid_client_credentials" — confirmado en un hilo del foro
             * oficial de Epic (jul. 2026) con el mismo error exacto.
             *
             * El escape oficial documentado en los tipos (`token.request`) NO
             * está implementado de verdad en el código que corre para
             * proveedores `type: "oauth"` en esta versión (comprobado leyendo
             * el propio `node_modules/@auth/core/src/lib/actions/callback/
             * oauth/callback.ts` — solo consulta `token.conform`, nunca
             * `token.request`). Por eso el primer intento no cambiaba nada por
             * mucho que se reiniciara el servidor.
             *
             * `[customFetch]` sí está de verdad enganchado (lo usan los
             * proveedores oficiales de Apple/Microsoft Entra ID para este
             * mismo tipo de problema) — intercepta la petición de red real
             * antes de salir y se reescribe la cabecera Authorization en
             * crudo, sin el percent-encoding que rompe a Epic.
             */
            async [customFetch](...args: Parameters<typeof fetch>) {
              const req = args[0];
              const url = req instanceof Request ? req.url : String(req);
              if (!url.startsWith("https://api.epicgames.dev/epic/oauth/v2/token")) {
                return fetch(...args);
              }

              const basic = Buffer.from(
                `${process.env.AUTH_EPIC_ID}:${process.env.AUTH_EPIC_SECRET}`,
              ).toString("base64");

              if (req instanceof Request) {
                const headers = new Headers(req.headers);
                headers.set("Authorization", `Basic ${basic}`);
                return fetch(new Request(req, { headers }));
              }

              const init = (args[1] ?? {}) as RequestInit;
              const headers = new Headers(init.headers);
              headers.set("Authorization", `Basic ${basic}`);
              return fetch(req, { ...init, headers });
            },
          }
        ]
      : []),
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
    /**
     * Epic Games no es un método de login de Paragon (a diferencia de
     * Google/Discord, que sí abren sesión de verdad) — es solo una fuente
     * de datos que se vincula a una cuenta YA existente, el equivalente por
     * OAuth de escribir tu ID de PSN a mano. Sin este callback, Auth.js no
     * encuentra ninguna cuenta Epic vinculada la primera vez que alguien
     * pulsa "Vincular Epic" y sigue su camino normal de login: **crea un
     * usuario de Paragon nuevo y cambia la sesión a él** — quien pulsó el
     * botón se queda mirando una cuenta vacía, como si hubiera cerrado
     * sesión de la suya real. Es un fallo documentado de Auth.js/NextAuth
     * cuando se usa `signIn(provider)` para "vincular una cuenta más" sin
     * este tipo de comprobación.
     *
     * La solución: interceptar aquí, escribir nosotros mismos en
     * `platformAccounts` (igual que hace `linkAccount()` en profiles.ts
     * para PSN/Steam/Xbox) contra el usuario que YA tiene sesión, y
     * devolver `false` — eso corta el flujo de Auth.js antes de que cree
     * ninguna fila en `users`/`accounts`/`sessions` ni toque la sesión
     * actual. Epic nunca llega al evento `linkAccount` de abajo (que sigue
     * siendo el sitio real para Google, que sí es login).
     *
     * Sin probar en vivo todavía — hace falta `AUTH_EPIC_ID`/`AUTH_EPIC_SECRET`
     * reales y completar el login una vez para confirmar que `auth()` lee
     * la cookie de sesión correcta desde dentro de este callback (ver
     * HANDOFF.md).
     */
    async signIn({ account, profile }) {
      if (account?.provider !== "epic") return true;

      const session = await auth();
      const userId = session?.user?.id;
      // Nadie con sesión de Paragon abierta: no tiene sentido dejar que
      // Auth.js cree una cuenta nueva solo por haber pulsado "Vincular Epic"
      // sin haber entrado antes a Paragon.
      if (!userId) return "/entrar";

      const epicProfile = profile as { preferred_username?: string } | undefined;
      const accountId = account.providerAccountId;
      if (!accountId) return "/ajustes/plataformas";

      const db = getDb();
      await db
        .insert(platformAccounts)
        .values({
          userId,
          platform: "epic",
          accountId,
          username: epicProfile?.preferred_username ?? "Usuario de Epic",
          // Sin sincronización real de biblioteca todavía — lib/sync.ts
          // excluye "epic" a propósito hasta que se resuelva cómo leer los
          // logros (ver el aviso de HANDOFF.md sobre el método de Exophase).
          // `false` para que la ficha diga "Privado" en vez de "Vinculado"
          // con cero juegos, que sería mentir sobre lo que de verdad pasa.
          isPublic: false,
        })
        .onConflictDoUpdate({
          target: [platformAccounts.userId, platformAccounts.platform],
          // isPublic también en el UPDATE, no solo en el INSERT inicial:
          // sin esto, una fila vieja de una prueba anterior (de antes de
          // que este callback existiera) se habría quedado con
          // isPublic:true para siempre, aunque se revinculara.
          set: { accountId, username: epicProfile?.preferred_username ?? "Usuario de Epic", isPublic: false },
        });

      // Una URL, no `false`: `false` siempre lanza "AccessDenied" en Auth.js
      // (ver handleAuthorized en @auth/core), incluso cuando el enlace ha
      // ido bien — es la única forma de decirle "no abras sesión, pero
      // tampoco es un error" sin enseñar la pantalla de error genérica.
      return "/ajustes/plataformas";
    },
  },
  events: {
    async linkAccount({ user, account, profile }) {
      // Epic ya no llega aquí: lo intercepta el callback `signIn` de arriba,
      // que corta el flujo antes de que Auth.js dispare este evento.
      if (account.provider === "steam" || account.provider === "google") {
        const db = getDb();

        let username = "Usuario";
        let avatarUrl = null;

        if (account.provider === "google") {
          username = profile?.name ?? "Usuario de Google";
          avatarUrl = (profile as any)?.picture ?? null;
        } else if (account.provider === "steam") {
          username = (profile as any)?.personaname ?? "Usuario de Steam";
          avatarUrl = (profile as any)?.avatarfull ?? null;
        }

        await db
          .insert(platformAccounts)
          .values({
            userId: user.id!,
            platform: account.provider,
            accountId: account.providerAccountId,
            username: String(username),
            avatarUrl: avatarUrl ? String(avatarUrl) : null,
          })
          .onConflictDoNothing();
      }
    },
  },
}));
