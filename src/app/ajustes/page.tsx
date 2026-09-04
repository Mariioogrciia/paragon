import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
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

  const [nivel, badges, profile] = await Promise.all([
    getParagonLevel(session.user.id),
    getUserBadges(session.user.id),
    getProfileByUserId(session.user.id),
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
    />
  );
}
