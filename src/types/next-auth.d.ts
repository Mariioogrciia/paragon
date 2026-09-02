import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** Identificador dentro de la plataforma. Null hasta que lo elige. */
      handle: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    handle?: string | null;
  }
}
