import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { accounts, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ProfileForm } from "@/components/forms/ProfileForm";
import { getParagonLevel } from "@/lib/paragonLevel";
import { getLibrary, getProfileByUserId, getUserBadges } from "@/lib/profiles";

export default async function AjustesGeneralPage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const db = getDb();
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!dbUser) redirect("/entrar");

  const [nivel, badges, profile, discordVinculado] = await Promise.all([
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
  ]);

  // Para el selector visual de "juego para el fondo" — solo lo mínimo
  // (id/título/carátula), no la biblioteca entera con logros y todo.
  const { games } = profile ? await getLibrary(profile) : { games: [] };
  const juegosParaFondo = games
    .filter((g) => !g.isWishlist && g.iconUrl)
    .map((g) => ({ id: g.id, title: g.title, iconUrl: g.iconUrl! }));

  return (
    <ProfileForm
      user={dbUser}
      nivel={nivel.level}
      badges={badges.map((b) => b.badgeId)}
      favoritos={profile?.favorites ?? []}
      juegos={juegosParaFondo}
      discordVinculado={discordVinculado}
    />
  );
}
