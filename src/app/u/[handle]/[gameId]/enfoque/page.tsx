import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { FocusMode } from "@/components/FocusMode";
import { getGameDetail, getProfileByHandle } from "@/lib/profiles";
import { gameProgress, nextSteps } from "@/lib/stats";

export const metadata = { title: "Modo enfoque · Paragon" };

/**
 * Va en su propio export, no dentro de `metadata`: Next avisa de que ahí ya no
 * se lee. Se usa con el móvil en la mano mientras juegas, así que se fija la
 * escala para que no haga zoom al tocar los botones grandes.
 */
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

/** Cuántos trofeos se enseñan. Tres caben en pantalla de móvil sin scroll. */
const CUANTOS = 3;

export default async function EnfoquePage({
  params,
}: {
  params: Promise<{ handle: string; gameId: string }>;
}) {
  const { handle, gameId } = await params;

  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  // El modo enfoque es para jugar tú: pulsa "¿ya lo tengo?", que sincroniza
  // contra la plataforma, así que no tiene sentido (ni permiso) sobre el
  // perfil de otro.
  const session = await auth();
  if (session?.user?.id !== profile.userId) redirect(`/u/${handle}/${gameId}`);

  const game = await getGameDetail(profile, gameId);
  if (!game) notFound();

  const progreso = gameProgress(game);

  return (
    <FocusMode
      gameId={game.id}
      titulo={game.title}
      trofeos={nextSteps(game.trophies, CUANTOS)}
      earned={progreso.earned}
      total={progreso.total}
      volverA={`/u/${handle}/${gameId}`}
    />
  );
}
