import { NextResponse } from "next/server";
import { IgdbNotConfiguredError, upcomingGames } from "@/lib/igdb/client";

export async function GET() {
  try {
    const games = await upcomingGames(8);
    return NextResponse.json(
      games.map((g) => ({
        id: String(g.igdbId),
        title: g.title,
        releaseDate: g.releaseDate
          ? new Date(g.releaseDate).toLocaleDateString("es-ES", { year: "numeric", month: "short" })
          : "Por confirmar",
        platforms: g.platforms,
        cover: g.coverUrl ?? "",
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
