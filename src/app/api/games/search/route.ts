import { NextResponse } from "next/server";
import { IgdbNotConfiguredError, searchGames } from "@/lib/igdb/client";
import { ipDe, limitar } from "@/lib/rateLimit";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);
  // Público y cada búsqueda gasta cuota de IGDB: límite por IP.
  if (!(await limitar("busquedaJuegos", ipDe(request.headers)))) {
    return NextResponse.json({ error: "Demasiadas búsquedas seguidas. Espera un momento." }, { status: 429 });
  }

  try {
    const results = await searchGames(q, 12);
    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof IgdbNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("[games-search]", error);
    return NextResponse.json({ error: "Búsqueda no disponible ahora mismo." }, { status: 502 });
  }
}
