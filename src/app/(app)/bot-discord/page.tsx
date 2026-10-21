import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { BackButton } from "@/components/BackButton";
import { GuiaBotDiscord } from "@/components/GuiaBotDiscord";

export const metadata = { title: "Bot de Discord · Paragon" };

/**
 * La misma guía, pública (5 oct 2026): la app de Android la abre en el
 * navegador, donde puede no haber sesión web, y desde "Cómo funciona". Con
 * sesión enseña el estado real de cada paso; sin ella, la guía a secas.
 */
export default async function BotDiscordPage() {
  const session = await auth();
  let vinculado: boolean | null = null;
  if (session?.user?.id) {
    const [vinculada] = await getDb()
      .select({ id: accounts.providerAccountId })
      .from(accounts)
      .where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, "discord")))
      .limit(1);
    vinculado = Boolean(vinculada);
  }

  return (
    <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-7">
      <BackButton fallbackHref="/como-funciona" />
      <GuiaBotDiscord vinculado={vinculado} urlPaso1={vinculado === null ? "/entrar" : "/ajustes/seguridad"} />
    </div>
  );
}
