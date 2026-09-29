import { EditorVitrinas } from "@/components/EditorVitrinas";
import { MAX_VITRINAS, estudiosCompletados, getVitrinas } from "@/lib/vitrinas";
import { headers } from "next/headers";
import { FirmaCompartible } from "@/components/FirmaCompartible";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { accounts, games, userGames, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ProfileForm } from "@/components/forms/ProfileForm";
import { getParagonLevel } from "@/lib/paragonLevel";
import { getGamesForBackground, getProfileByUserId, getUserBadges } from "@/lib/profiles";

/** Los `?error=` que devuelve /api/profile/update. */
const ERRORES_PERFIL: Record<string, string> = {
  contenido_ofensivo:
    "No se ha guardado nada — algún campo (usuario, nombre, título o estado) contiene lenguaje ofensivo. Cámbialo e inténtalo de nuevo.",
  handle_invalido:
    "No se ha guardado nada — el nombre de usuario debe tener entre 3 y 20 caracteres: solo minúsculas, números y guion bajo.",
  handle_cogido: "No se ha guardado nada — ese nombre de usuario ya está cogido.",
  datos_invalidos:
    "No se ha guardado nada — la imagen, el banner, el color o la zona horaria no tienen un formato válido.",
  update_failed: "No se ha podido guardar. Inténtalo de nuevo en un momento.",
  demasiados_intentos: "Has guardado muchas veces seguidas. Espera un minuto y vuelve a intentarlo.",
};

export default async function AjustesGeneralPage(props: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const { error } = await props.searchParams;
  // Origen absoluto para los códigos de la firma (se pegan fuera de Paragon).
  // En producción, el dominio configurado en Vercel (no la cabecera Host de
  // la petición); en local, lo que diga la cabecera.
  const cabeceras = await headers();
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? cabeceras.get("host") ?? "platinos-nine.vercel.app";
  const origen = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  const db = getDb();
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!dbUser) redirect("/entrar");

  // Vitrinas del perfil (lib/vitrinas.ts): si fallara, Ajustes se enseña igual.
  const [vitrinas, estudios, juegosVitrina] = await Promise.all([
    getVitrinas(session.user.id).catch(() => []),
    estudiosCompletados(session.user.id).catch(() => []),
    db
      .select({ id: games.id, titulo: games.title })
      .from(userGames)
      .innerJoin(games, eq(games.id, userGames.gameId))
      .where(and(eq(userGames.userId, session.user.id), eq(userGames.isWishlist, false)))
      .orderBy(games.title),
  ]);

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
      {error && ERRORES_PERFIL[error] && (
        <p
          className="mb-4 rounded-lg px-4 py-3 text-sm font-semibold"
          style={{ background: "rgb(239 68 68 / 0.1)", border: "1px solid rgb(239 68 68 / 0.3)", color: "#f87171" }}
        >
          {ERRORES_PERFIL[error]}
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
      {dbUser.handle && <div className="mt-8"><FirmaCompartible handle={dbUser.handle} origen={origen} /></div>}
      <div className="mt-8">
        <EditorVitrinas
          vitrinas={vitrinas.map((v) => ({ id: v.id, titulo: v.titulo, tipo: v.tipo }))}
          estudios={estudios}
          juegos={juegosVitrina}
          maximo={MAX_VITRINAS}
        />
      </div>
    </>
  );
}
