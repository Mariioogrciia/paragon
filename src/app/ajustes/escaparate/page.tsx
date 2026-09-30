import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { games, userGames } from "@/db/schema";
import { EditorVitrinas } from "@/components/EditorVitrinas";
import { FirmaCompartible } from "@/components/FirmaCompartible";
import { MAX_VITRINAS, estudiosCompletados, getVitrinas } from "@/lib/vitrinas";
import { getProfileByUserId } from "@/lib/profiles";

export const metadata = { title: "Vitrinas y firma · Ajustes · Paragon" };

/**
 * Vitrinas temáticas y firma/overlay: lo que enseñas fuera de tu biblioteca.
 * Estaban al final de Ajustes → General, debajo del formulario de perfil
 * entero, donde casi nadie llegaba.
 */
export default async function AjustesEscaparatePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");
  const userId = session.user.id;

  // En producción, el dominio configurado en Vercel (no la cabecera Host); en local, la cabecera.
  const cabeceras = await headers();
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? cabeceras.get("host") ?? "platinos-nine.vercel.app";
  const origen = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  const [profile, vitrinas, estudios, juegosVitrina] = await Promise.all([
    getProfileByUserId(userId),
    getVitrinas(userId).catch(() => []),
    estudiosCompletados(userId).catch(() => []),
    getDb()
      .select({ id: games.id, titulo: games.title })
      .from(userGames)
      .innerJoin(games, eq(games.id, userGames.gameId))
      .where(and(eq(userGames.userId, userId), eq(userGames.isWishlist, false)))
      .orderBy(games.title),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <EditorVitrinas
        vitrinas={vitrinas.map((v) => ({ id: v.id, titulo: v.titulo, tipo: v.tipo }))}
        estudios={estudios}
        juegos={juegosVitrina}
        maximo={MAX_VITRINAS}
      />
      {profile?.handle && <FirmaCompartible handle={profile.handle} origen={origen} />}
    </div>
  );
}
