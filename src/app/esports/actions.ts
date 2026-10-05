"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { alternarFavorito, type EquipoFavorito } from "@/lib/esportsFavoritos";

/** Seguir / dejar de seguir un equipo. `seguido` es el estado final. */
export async function alternarFavoritoAction(
  equipo: EquipoFavorito,
): Promise<{ seguido: boolean } | { error: "login" | "limite" | "fallo" }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "login" };

  // Lo que llega del cliente se recorta: es texto ajeno (PandaScore) de vuelta.
  const limpio: EquipoFavorito = {
    teamId: Math.trunc(Number(equipo.teamId)),
    nombre: String(equipo.nombre ?? "").slice(0, 120),
    acronimo: equipo.acronimo ? String(equipo.acronimo).slice(0, 20) : null,
    logo: equipo.logo && /^https:\/\//.test(equipo.logo) ? String(equipo.logo).slice(0, 500) : null,
    juego: equipo.juego ? String(equipo.juego).slice(0, 60) : null,
  };
  if (!Number.isFinite(limpio.teamId) || limpio.teamId <= 0 || !limpio.nombre) return { error: "fallo" };

  try {
    const seguido = await alternarFavorito(session.user.id, limpio);
    revalidatePath("/esports");
    return { seguido };
  } catch (error) {
    if (error instanceof Error && error.message === "LIMITE") return { error: "limite" };
    console.error("[esports] no se pudo guardar el favorito", error);
    return { error: "fallo" };
  }
}
