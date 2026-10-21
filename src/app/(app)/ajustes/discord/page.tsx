import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { GuiaBotDiscord } from "@/components/GuiaBotDiscord";

export const metadata = { title: "Bot de Discord · Paragon" };

/** Guía del bot de Discord dentro de Ajustes, con el estado real de tu cuenta (ver GuiaBotDiscord). */
export default async function AjustesDiscordPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");

  const [vinculada] = await getDb()
    .select({ id: accounts.providerAccountId })
    .from(accounts)
    .where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, "discord")))
    .limit(1);

  return <GuiaBotDiscord vinculado={Boolean(vinculada)} urlPaso1="/ajustes/seguridad" />;
}
