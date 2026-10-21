import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppearanceSettings } from "@/components/AppearanceSettings";
import { getParagonLevel } from "@/lib/paragonLevel";
import { getGamesForBackground, getProfileByUserId } from "@/lib/profiles";
import { getOrComputeAuraColor } from "@/lib/coverAura";

/** Juegos que se ofrecen para "desde tu juego": favoritos primero, luego lo último jugado. */
const MAX_JUEGOS_PALETA = 12;

export default async function AjustesAparienciaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");
  const [nivel, juegos, profile] = await Promise.all([
    getParagonLevel(session.user.id),
    getGamesForBackground(session.user.id).catch(() => []),
    getProfileByUserId(session.user.id),
  ]);

  const favoritos = profile?.favorites ?? [];
  const candidatos = [
    ...favoritos.map((id) => juegos.find((j) => j.id === id)).filter((j) => j !== undefined),
    ...juegos.filter((j) => !favoritos.includes(j.id)),
  ].slice(0, MAX_JUEGOS_PALETA);

  // El color se calcula una vez por juego en toda la vida de la app
  // (games.auraColor); los que no tienen color se quedan fuera.
  const conColor = await Promise.all(
    candidatos.map(async (j) => ({
      id: j.id,
      titulo: j.title,
      portada: j.iconUrl,
      favorito: favoritos.includes(j.id),
      color: await getOrComputeAuraColor(j.id, j.iconUrl).catch(() => null),
    })),
  );

  return (
    <AppearanceSettings
      nivel={nivel.level}
      juegosPaleta={conColor.filter((j): j is typeof j & { color: string } => j.color !== null)}
    />
  );
}
