import { ImageResponse } from "next/og";
import { getLibrary, getProfileByHandle } from "@/lib/profiles";
import { resumenHistorico, juegosDelAnio } from "@/lib/history";
import { coverGradient } from "@/lib/design";
import { generoTop, juegoDestacado } from "@/components/ParagonWrap";

/**
 * Imagen compartible del Paragon Wrap (`/u/[handle]`).
 *
 * Reproduce, con Satori (lo que hay detrás de `ImageResponse`), las mismas
 * tres tarjetas que pinta `ParagonWrap` — mismos datos, misma cuenta, para
 * que la imagen que alguien comparte diga lo mismo que ve en la pantalla.
 * Satori solo entiende flexbox: nada de CSS grid ni de las sombras/hover de
 * la versión web.
 *
 * Corre en Node (no en el runtime edge) porque `getLibrary` habla con
 * Postgres a través de `postgres-js`, que no funciona en edge.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;

  const profile = await getProfileByHandle(handle);
  if (!profile) {
    return new Response("No existe ese perfil.", { status: 404 });
  }

  const { player, games } = await getLibrary(profile);
  const resumen = await resumenHistorico(profile.userId);
  const juegosEsteAnio = await juegosDelAnio(profile.userId);

  const topGenre = generoTop(games);
  const topGame = juegoDestacado(games);
  const anio = new Date().getFullYear();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "56px",
          background: "linear-gradient(160deg, #0d0a1a, #05060c 60%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: "40px" }}>
          {player.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.avatarUrl}
              width={72}
              height={72}
              style={{ borderRadius: "50%", marginRight: "22px" }}
              alt=""
            />
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#ffffff" }}>
              {player.name}
            </div>
            <div style={{ display: "flex", fontSize: 18, color: "#8b93a7" }}>
              @{handle} · Paragon Wrap {anio}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "row", gap: "20px", flex: 1 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              borderRadius: "20px",
              padding: "28px",
              background: "linear-gradient(140deg, #3b1d6e, #1c1040 70%, #120a26)",
              border: "1px solid rgba(167, 139, 250, 0.35)",
            }}
          >
            <div style={{ display: "flex", fontSize: 15, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#c4b5fd" }}>
              Género más jugado
            </div>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#ffffff", marginTop: "10px" }}>
              {topGenre.name}
            </div>
            <div style={{ display: "flex", fontSize: 16, color: "rgba(233, 226, 255, 0.8)", marginTop: "10px" }}>
              {topGenre.count === 0
                ? "Todavía no hay géneros en el catálogo"
                : `${topGenre.count} títulos de este género`}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              position: "relative",
              borderRadius: "20px",
              padding: "28px",
              overflow: "hidden",
              background: topGame ? coverGradient(topGame.game.id) : "#131a26",
              border: "1px solid rgba(125, 179, 255, 0.35)",
            }}
          >
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex" }} />
            <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
              <div style={{ display: "flex", fontSize: 15, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#a8ccff" }}>
                Juego más exprimido
              </div>
              <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#ffffff", marginTop: "10px" }}>
                {topGame?.game.title ?? "Ninguno"}
              </div>
              <div style={{ display: "flex", fontSize: 16, fontWeight: 500, color: "rgba(219, 234, 254, 0.9)", marginTop: "10px" }}>
                {topGame && topGame.horasTotal > 0
                  ? `${topGame.horasTotal.toFixed(1)} horas jugadas`
                  : `${topGame?.game.earnedTotal ?? 0} trofeos conseguidos`}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              borderRadius: "20px",
              padding: "28px",
              background: "linear-gradient(140deg, #5a3410, #3a1f08 70%, #241305)",
              border: "1px solid rgba(251, 191, 36, 0.35)",
            }}
          >
            <div style={{ display: "flex", fontSize: 15, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#fcd34d" }}>
              Resumen del año
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginTop: "10px" }}>
              <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: "#ffffff" }}>{resumen.esteAnio}</div>
              <div style={{ display: "flex", fontSize: 16, color: "rgba(254, 240, 199, 0.8)", marginBottom: "8px" }}>trofeos</div>
            </div>
            <div style={{ display: "flex", fontSize: 16, color: "rgba(254, 240, 199, 0.8)", marginTop: "10px" }}>
              {juegosEsteAnio === 0
                ? "Aún no hay trofeos con fecha de este año"
                : `Repartidos en ${juegosEsteAnio} ${juegosEsteAnio === 1 ? "juego" : "juegos"}`}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: "36px", fontSize: 15, color: "#4b5468" }}>
          paragon.app/u/{handle}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
