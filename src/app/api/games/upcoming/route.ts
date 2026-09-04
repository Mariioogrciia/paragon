import { NextResponse } from "next/server";
import { IgdbNotConfiguredError, upcomingGames, releaseLabelEs } from "@/lib/igdb/client";

export async function GET() {
  try {
    const games = await upcomingGames(8);

    return NextResponse.json(
      games.map((g) => ({
        id: String(g.igdbId),
        title: g.title,
        cover: g.coverUrl ?? "",
        /** ISO en crudo: el contador de días lo hace el cliente, y solo si es exacta. */
        releaseDate: g.releaseDate ?? null,
        releasePrecision: g.releasePrecision,
        releaseLabel: releaseLabelEs(g.releaseDate, g.releasePrecision),
        platforms: g.platforms,
        genres: g.genres.slice(0, 3),
        developer: g.developer ?? null,
        publisher: g.publisher ?? null,
        // Los resúmenes de IGDB vienen en inglés: es el dato que hay, y es
        // preferible enseñarlo tal cual a traducirlo a ojo.
        summary: g.summary ?? null,
        rating: g.rating != null ? Math.round(g.rating) : null,
        /** Clasificación por edades PEGI ("3", "7", "12", "16", "18"), si IGDB la tiene. */
        pegi: g.pegi ?? null,
        igdbId: g.igdbId,
      })),
    );
  } catch (error) {
    // Sin credenciales de IGDB (aún no configuradas) el bloque de
    // "Próximos lanzamientos" simplemente no aparece, en vez de reventar la
    // portada: UpcomingGames.tsx ya trata una lista vacía como "no mostrar".
    if (!(error instanceof IgdbNotConfiguredError)) {
      console.error("[upcoming-games]", error);
    }
    return NextResponse.json([]);
  }
}
