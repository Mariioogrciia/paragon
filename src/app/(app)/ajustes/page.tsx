import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ProfileForm } from "@/components/forms/ProfileForm";
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

  const [nivel, badges, profile, juegosParaFondo] = await Promise.all([
    getParagonLevel(session.user.id),
    getUserBadges(session.user.id),
    getProfileByUserId(session.user.id),
    // Para el selector visual de "juego para el fondo" — solo id/título/
    // carátula, filtrados ya en SQL, no la biblioteca entera vía getLibrary.
    getGamesForBackground(session.user.id),
  ]);

  const t = await getTranslations("Onboarding");
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
      cuentasVinculadas={profile?.accounts.filter(a => a.avatarUrl).map(a => ({ platform: a.platform, avatarUrl: a.avatarUrl! })) ?? []}
    />
    </>
  );
}
