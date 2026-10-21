import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPinnedGameId, getProfileByUserId } from "@/lib/profiles";

/**
 * Destino fijo del atajo PWA "Continuar juego anclado" (app/manifest.ts) —
 * los shortcuts de un manifest solo pueden apuntar a una URL estática, no
 * a "el juego anclado de quien sea que abra esto", así que esta ruta hace
 * de intermediaria: resuelve el juego anclado de quien haya iniciado
 * sesión en ESTE momento y redirige a su Modo Enfoque de verdad
 * (`/u/[handle]/[gameId]/enfoque`). No pinta nada por sí misma.
 */
export default async function AtajoEnfoquePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");

  const profile = await getProfileByUserId(session.user.id);
  if (!profile) redirect("/entrar");

  const gameId = await getPinnedGameId(session.user.id);
  // Sin nada anclado: a la biblioteca, no a un error — desde ahí se ancla
  // el primero (icono de chincheta en la ficha de cualquier juego).
  if (!gameId) redirect(`/u/${profile.handle}/biblioteca`);

  redirect(`/u/${profile.handle}/${gameId}/enfoque`);
}
