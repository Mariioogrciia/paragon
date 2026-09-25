import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { accounts, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ProfileForm } from "@/components/forms/ProfileForm";
import { getParagonLevel } from "@/lib/paragonLevel";
import { getGamesForBackground, getProfileByUserId, getUserBadges } from "@/lib/profiles";

export default async function AjustesGeneralPage(props: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const { error } = await props.searchParams;

  const db = getDb();
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!dbUser) redirect("/entrar");

  const [nivel, badges, profile, discordVinculado, juegosParaFondo] = await Promise.all([
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
  ]);

  return (
    <>
      {error === "contenido_ofensivo" && (
        <p
          className="mb-4 rounded-lg px-4 py-3 text-sm font-semibold"
          style={{ background: "rgb(239 68 68 / 0.1)", border: "1px solid rgb(239 68 68 / 0.3)", color: "#f87171" }}
        >
          No se ha guardado nada — algún campo (nombre, título o estado) contiene lenguaje ofensivo. Cámbialo e inténtalo de nuevo.
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
    </>
  );
}
