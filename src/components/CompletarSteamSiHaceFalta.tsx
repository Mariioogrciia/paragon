import "server-only";
import { juegosSteamSinDetalle } from "@/lib/sync";
import { CompletarSteam } from "@/components/CompletarSteam";

/**
 * Pone el aviso "Sincronizando tus logros de Steam…" solo si de verdad faltan
 * (una consulta barata por visita). Va en las pantallas de tu propia cuenta:
 * Ajustes → Plataformas, el alta y tu perfil.
 */
export async function CompletarSteamSiHaceFalta({ userId }: { userId: string }) {
  const pendientes = (await juegosSteamSinDetalle(userId).catch(() => [])).length;
  if (pendientes === 0) return null;
  return <CompletarSteam pendientes={pendientes} />;
}
