import { ImageResponse } from "next/og";
import { getGlobalGame } from "@/lib/community";
import { urlAbsolutaParaOg } from "@/lib/design";

/**
 * Tarjeta social de una ficha de juego.
 *
 * Las fichas de juego son, con 364 juegos en el catalogo, la mayor
 * superficie publica de Paragon — y hasta ahora compartir una daba la
 * tarjeta generica de la app, sin decir siquiera de que juego se trataba.
 * La pagina ya tenia `generateMetadata` con el titulo; le faltaba la imagen.
 *
 * Misma tecnica que las otras tres imagenes de la app (Satori via
 * `ImageResponse`, en Node porque `postgres-js` no va en edge) y solo
 * flexbox: Satori no entiende grid.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Ficha de juego en Paragon";

const PLATINO = "#9fd4ec";
const FONDO = "#0a0d13";
const TENUE = "#8b93a7";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGlobalGame(decodeURIComponent(id));

  if (!game) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: FONDO,
            color: "#fff",
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: 8,
          }}
        >
          PARAGON
        </div>
      ),
      size,
    );
  }

  const caratula = urlAbsolutaParaOg(game.iconUrl);
  const empresa = game.developer ?? game.publisher;
  // Como mucho tres: con mas, la fila se sale por la derecha (Satori no
  // recorta ni ajusta como el navegador).
  const generos = (game.genres ?? []).slice(0, 3);

  return new ImageResponse(
    (
      <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 56,
        padding: 64,
        background: FONDO,
        backgroundImage: "radial-gradient(circle at 15% 0%, rgba(159,212,236,0.16), transparent 60%)",
        fontFamily: "sans-serif",
      }}
    >
      {caratula ? (
        <div
          style={{
            display: "flex",
            width: 420,
            height: 420,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 24,
            overflow: "hidden",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          {/* `contain`, no `cover`: las caratulas de Steam son apaisadas
              (banner) y las de PSN cuadradas. Recortando, las de Steam salian
              partidas por la mitad. */}
          <img src={caratula} width={420} height={420} style={{ objectFit: "contain" }} />
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            width: 420,
            height: 420,
            borderRadius: 24,
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
            fontSize: 120,
            fontWeight: 700,
            color: PLATINO,
          }}
        >
          {game.title.slice(0, 1).toUpperCase()}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", flex: 1, alignSelf: "stretch", justifyContent: "space-between", paddingTop: 12, paddingBottom: 12 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: PLATINO,
          }}
        >
          {game.hasPlatinum ? "Tiene platino" : "Ficha de juego"}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 18,
            // Un titulo largo con letra fija se sale de la tarjeta; se baja
            // el cuerpo a partir de cierto largo en vez de recortar el nombre.
            fontSize: game.title.length > 34 ? 56 : 72,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.08,
          }}
        >
          {game.title}
        </div>

        {empresa && (
          <div style={{ display: "flex", marginTop: 20, fontSize: 28, color: TENUE }}>{empresa}</div>
        )}

        {generos.length > 0 && (
          <div style={{ display: "flex", marginTop: 28, gap: 12 }}>
            {generos.map((g) => (
              <div
                key={g}
                style={{
                  display: "flex",
                  borderRadius: 999,
                  padding: "10px 22px",
                  fontSize: 22,
                  color: "#dfe6f0",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {g}
              </div>
            ))}
          </div>
        )}

        </div>

        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: TENUE,
          }}
        >
          Paragon
        </div>
      </div>
    </div>
    ),
    size,
  );
}
