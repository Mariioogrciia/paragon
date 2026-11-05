import { artesPorIgdb } from "@/lib/igdb/client";

/**
 * Capas de fondo de la cabecera del perfil (PerfilJugador.tsx).
 *
 * - "banner": un banner subido, tal cual (con el parallax de siempre).
 * - "caratula": la carátula de trofeos (320-512 px) estirada a 1240x320,
 *   que solo aguanta difuminada y oscurecida.
 * - "arte": el arte promocional de IGDB a 1080p, nítido, solo oscurecido.
 */
export function CapaFondo({ url, modo }: { url: string; modo: "banner" | "caratula" | "arte" }) {
  return (
    <div
      className={`absolute inset-0 bg-cover bg-center bg-no-repeat ${modo === "banner" ? "perfil-banner-parallax" : ""} ${modo === "arte" ? "perfil-fondo-aparece" : ""}`}
      style={{
        backgroundImage: `url(${url})`,
        ...(modo === "arte"
          ? { filter: "brightness(0.7) saturate(1.1)", backgroundPosition: "center 30%" }
          : modo === "caratula"
            ? {
                // Reportado: "no aprecio el juego, está demasiado difuminado"
                // — con 40px de blur y al 50% de opacidad la carátula se volvía
                // irreconocible. Menos blur y más opacidad: se distingue el juego.
                filter: "blur(14px) brightness(0.55)",
                opacity: 0.75,
                transform: "scale(1.08)",
              }
            : {}),
      }}
    />
  );
}

/**
 * "Se ve demasiado difuminado y de mala calidad" (5 nov 2026): si el juego
 * está en IGDB se pinta su arte a 1080p en vez de la carátula. Va dentro de
 * un <Suspense> con la carátula de respaldo: la primera versión lo esperaba
 * antes de pintar la página y el perfil tardaba hasta 2,5 s más en abrir
 * (IGDB está en EE. UU. y la función en Fráncfort). Ahora la página sale ya
 * y el arte entra en cuanto llega; sin IGDB o si tarda, se queda la carátula.
 */
export async function ArteDeFondo({ igdbId, caratula }: { igdbId: number; caratula: string }) {
  const arte = await Promise.race([
    artesPorIgdb([igdbId])
      .then((m) => m.get(igdbId) ?? null)
      .catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), 4000)),
  ]);
  return <CapaFondo url={arte ?? caratula} modo={arte ? "arte" : "caratula"} />;
}
