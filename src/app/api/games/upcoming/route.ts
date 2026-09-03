import { NextResponse } from "next/server";
import {
  IgdbNotConfiguredError,
  upcomingGames,
  type ReleasePrecision,
} from "@/lib/igdb/client";

/**
 * Etiqueta de fecha, contando solo lo que IGDB sabe de verdad.
 *
 * Un juego anunciado "para 2028" llega con timestamp del 31 de diciembre de
 * relleno (ver `precisionOf` en el cliente). Pintarlo como "31 dic 2028"
 * sería inventarse el día, así que cada precisión tiene su formato.
 */
function etiquetaFecha(iso: string | undefined, precision: ReleasePrecision): string {
  if (!iso || precision === "tbd") return "Fecha por confirmar";

  const fecha = new Date(iso);

  switch (precision) {
    case "day":
      return fecha.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
    case "month":
      return fecha.toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
    case "quarter": {
      const trimestre = Math.floor(fecha.getUTCMonth() / 3) + 1;
      return `${trimestre}.º trimestre de ${fecha.getUTCFullYear()}`;
    }
    case "year":
      return `Durante ${fecha.getUTCFullYear()}`;
  }
}

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
        releaseLabel: etiquetaFecha(g.releaseDate, g.releasePrecision),
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
