"use server";

import { refresh } from "next/cache";
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
    // refresh(), no revalidatePath("/esports"): eso tiraba también la caché
    // de las peticiones a PandaScore de la página, y cada estrella volvía a
    // pedir partidos y tablas — con el límite por hora agotado, "Todos" se
    // quedaba sin un solo partido. Los favoritos ya están en el estado del
    // cliente; esto solo trae de nuevo las noticias de tus equipos.
    refresh();
    return { seguido };
  } catch (error) {
    if (error instanceof Error && error.message === "LIMITE") return { error: "limite" };
    console.error("[esports] no se pudo guardar el favorito", error);
    return { error: "fallo" };
  }
}
