import NextAuth from "next-auth";
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
  },
  events: {
    async linkAccount({ user, account, profile }) {
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
