import { resumenStreamer } from "@/lib/streamer";
import { insigniaSvg } from "@/lib/streamerTexto";
import { esIdioma } from "@/lib/idiomasTrofeo";

/**
 * Insignia SVG estilo shields.io para un README de GitHub, Reddit o un
 * foro: `/api/insignia/<handle>.svg?idioma=en&estilo=cuadrado`.
 *
 * Es texto, no una imagen de satori como `/api/firma`: generarla cuesta
 * casi nada de CPU (el cupo de Vercel Hobby, ver docs/HANDOFF.md), y GitHub
 * la pasa por su proxy de imágenes (camo) con la caché que digamos aquí.
 */
export async function GET(request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const url = new URL(request.url);
  const idiomaPedido = url.searchParams.get("idioma");
  const idioma = esIdioma(idiomaPedido) ? idiomaPedido : "es";
  const estilo = url.searchParams.get("estilo") === "cuadrado" ? "cuadrado" : "plano";

  const resumen = await resumenStreamer(handle.replace(/\.svg$/i, ""));
  if (!resumen) return new Response("No existe ese perfil.", { status: 404 });

  return new Response(insigniaSvg(resumen, idioma, estilo), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      // Un SVG abierto suelto es un documento: que no pueda ejecutar nada.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
