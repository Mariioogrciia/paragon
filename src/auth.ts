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
            authorization: {
              params: {
                scope: "openid email profile https://www.googleapis.com/auth/games",
              },
            },
          }),
        ]
      : []),
    ...(process.env.AUTH_DISCORD_ID ? [Discord] : []),
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
          avatarUrl = profile?.picture ?? null;
        } else if (account.provider === "steam") {
          username = profile?.personaname ?? "Usuario de Steam";
          avatarUrl = profile?.avatarfull ?? null;
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
