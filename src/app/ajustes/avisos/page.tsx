import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { accounts, users } from "@/db/schema";
import { DiscordDmForm } from "@/components/forms/Forms";
import { PreferenciasAvisos } from "@/components/PreferenciasAvisos";
import { PushToggle } from "@/components/PushToggle";
import { CATEGORIAS_AVISO, getAvisosDesactivados } from "@/lib/avisosPreferencias";

export const metadata = { title: "Avisos · Ajustes · Paragon" };

/**
 * Ajustes → Avisos (20 oct 2026). Antes, qué avisos recibir, las
 * notificaciones del navegador y los DM de Discord vivían al final de
 * "General", debajo de todo el formulario del perfil, sin entrada en el
 * menú: "Elegir qué avisos recibir" de la campana llevaba a una página en la
 * que no se veían. Ahora todo junto aquí.
 */
export default async function AjustesAvisosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");
  const userId = session.user.id;
  const db = getDb();

  const [usuario, discordVinculado, avisosOff, t] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId), columns: { discordDmEnabled: true } }),
    // Si el bot puede escribirle por DM: sale de haber iniciado sesión con
    // Discord alguna vez (accounts.provider='discord'), no de un campo aparte.
    db
      .select({ id: accounts.providerAccountId })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.provider, "discord")))
      .limit(1)
      .then((filas) => filas.length > 0),
    getAvisosDesactivados(userId).catch(() => new Set<string>()),
    getTranslations("Onboarding"),
  ]);

  // Las claves son la fuente de la verdad (avisosPreferencias.ts); el texto
  // que se ve sale siempre de la traducción.
  const categorias = CATEGORIAS_AVISO.map((c) => ({ clave: c.clave, label: t(`categoriaAviso.${c.clave}`) }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading mb-2 text-2xl font-bold">{t("ajustesAvisos.titulo")}</h1>
        <p className="text-sm text-muted">{t("ajustesAvisos.descripcion")}</p>
      </div>

      <PreferenciasAvisos categorias={categorias} desactivadas={[...avisosOff]} />

      <section className="ajustes-grupo">
        <h2 className="mb-4 font-semibold">{t("profileForm.pushTitle")}</h2>
        <PushToggle />
      </section>

      <section className="ajustes-grupo">
        <h2 className="mb-4 font-semibold">{t("profileForm.discordTitle")}</h2>
        <DiscordDmForm enabled={usuario?.discordDmEnabled ?? false} vinculado={discordVinculado} />
      </section>
    </div>
  );
}
