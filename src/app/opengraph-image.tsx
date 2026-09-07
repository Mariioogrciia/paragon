import { ImageResponse } from "next/og";

/**
 * Tarjeta social por defecto: la que sale al compartir cualquier página que
 * no tenga la suya propia (portada, /descubrir, /noticias, /ligas...).
 *
 * Deliberadamente sobria y sin datos: es la cara de la app, no de nadie en
 * concreto. Los perfiles tienen la suya en `u/[handle]/opengraph-image.tsx`,
 * con cifras reales.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Paragon — trofeos y logros multiplataforma";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0d13",
          backgroundImage: "radial-gradient(circle at 50% 0%, rgba(159,212,236,0.22), transparent 65%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 108,
            fontWeight: 700,
            letterSpacing: 12,
            color: "#ffffff",
          }}
        >
          PARAGON
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 34, color: "#9fd4ec" }}>
          Trofeos y logros multiplataforma, en un solo sitio
        </div>
        <div style={{ display: "flex", marginTop: 14, fontSize: 24, color: "#8b93a7" }}>
          PlayStation · Steam · Xbox
        </div>
      </div>
    ),
    size,
  );
}
