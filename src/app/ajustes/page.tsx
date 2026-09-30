import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { accounts, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ProfileForm } from "@/components/forms/ProfileForm";
import { PreferenciasAvisos } from "@/components/PreferenciasAvisos";
import { CATEGORIAS_AVISO, getAvisosDesactivados } from "@/lib/avisosPreferencias";
import { getParagonLevel } from "@/lib/paragonLevel";
import { getGamesForBackground, getProfileByUserId, getUserBadges } from "@/lib/profiles";
import { getTranslations } from "next-intl/server";

/** Los `?error=` que devuelve /api/profile/update — texto en ajustesErrores.*, namespace Onboarding. */
const CLAVES_ERROR_PERFIL = [
  "contenido_ofensivo",
  "handle_invalido",
  "handle_cogido",
  "datos_invalidos",
  "update_failed",
  "demasiados_intentos",
] as const;

export default async function AjustesGeneralPage(props: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const { error } = await props.searchParams;

  const db = getDb();
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!dbUser) redirect("/entrar");

  const [nivel, badges, profile, discordVinculado, juegosParaFondo, avisosOff] = await Promise.all([
    getParagonLevel(session.user.id),
    getUserBadges(session.user.id),
    getProfileByUserId(session.user.id),
    // Si el bot puede escribirle por DM — sale de haber iniciado sesión con
    // Discord alguna vez (accounts.provider='discord'), no de un campo aparte.
    db
      .select({ id: accounts.providerAccountId })
      .from(accounts)
      .where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, "discord")))
      .limit(1)
      .then((rows) => rows.length > 0),
    // Para el selector visual de "juego para el fondo" — solo id/título/
    // carátula, filtrados ya en SQL, no la biblioteca entera vía getLibrary.
    getGamesForBackground(session.user.id),
    getAvisosDesactivados(session.user.id).catch(() => new Set<string>()),
  ]);

  // Las claves son la fuente de la verdad (avisosPreferencias.ts); el texto
  // que se ve sale siempre de la traducción, no del `label` en español que
  // lleva esa constante (ese solo sirve de comentario para quien lea el código).
  const t = await getTranslations("Onboarding");
  const categoriasTraducidas = CATEGORIAS_AVISO.map((c) => ({ clave: c.clave, label: t(`categoriaAviso.${c.clave}`) }));
  const errorValido = (CLAVES_ERROR_PERFIL as readonly string[]).includes(error ?? "");

  return (
    <>
      {errorValido && (
        <p
          className="mb-4 rounded-lg px-4 py-3 text-sm font-semibold"
          style={{ background: "rgb(239 68 68 / 0.1)", border: "1px solid rgb(239 68 68 / 0.3)", color: "#f87171" }}
        >
          {t(`ajustesErrores.${error}`)}
        </p>
      )}
      <ProfileForm
      user={dbUser}
      nivel={nivel.level}
      badges={badges.map((b) => b.badgeId)}
      favoritos={profile?.favorites ?? []}
      juegos={juegosParaFondo}
      discordVinculado={discordVinculado}
      cuentasVinculadas={profile?.accounts.filter(a => a.avatarUrl).map(a => ({ platform: a.platform, avatarUrl: a.avatarUrl! })) ?? []}
    />
      <div className="mt-8">
        <PreferenciasAvisos categorias={categoriasTraducidas} desactivadas={[...avisosOff]} />
      </div>
    </>
  );
}
