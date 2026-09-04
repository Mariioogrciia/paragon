import { ImageResponse } from "next/og";
import { getGameDetail, getProfileByHandle, resolveAvatarUrl } from "@/lib/profiles";
import { dificultadDeGame, esPlatinoEquivalente } from "@/lib/stats";
import { coverGradient } from "@/lib/design";

/**
 * Imagen compartible de un platino (o un 100% de Steam, que cuenta igual —
 * ver esPlatinoEquivalente). Mismo mecanismo que /api/wrap/[handle]: Satori
 * vía `ImageResponse`, solo entiende flexbox, nada de CSS grid ni de
 * sombras/hover de la versión web. Corre en Node por lo mismo que el Wrap:
 * `getGameDetail` habla con Postgres por `postgres-js`, que no va en edge.
 *
 * No comprueba que quien la pide sea el dueño del perfil a propósito —
 * mismo criterio que el Wrap: es una imagen pensada para compartirse fuera
 * de la app, así que tiene que poder verse sin sesión (quien la reciba por
 * WhatsApp no tiene por qué haber iniciado sesión en Paragon).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string; gameId: string }> },
) {
  const { handle, gameId: gameIdRaw } = await params;
  const gameId = decodeURIComponent(gameIdRaw);

  const profile = await getProfileByHandle(handle);
  if (!profile) {
    return new Response("No existe ese perfil.", { status: 404 });
  }

  const game = await getGameDetail(profile, gameId);
  if (!game) {
    return new Response("No existe ese juego en la biblioteca.", { status: 404 });
  }

  const platinado = esPlatinoEquivalente(game);
  if (!platinado) {
    return new Response("Este juego todavía no está platinado.", { status: 400 });
  }

  const avatarUrl = resolveAvatarUrl(profile);
  const horas = game.playtimeMinutes ? game.playtimeMinutes / 60 : null;
  const dificultad = dificultadDeGame(game);
  // Steam no tiene trofeo de platino de verdad que contar (por eso
  // esPlatinoEquivalente le da el mismo mérito con el 100%) — el rótulo de
  // la tarjeta lo dice sin fingir un platino que esa plataforma no tiene.
  const hasPlatinum = (game.defined?.platinum ?? 0) > 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          fontFamily: "sans-serif",
          background: coverGradient(game.id),
        }}
      >
        {game.iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.iconUrl}
            width={1200}
            height={630}
            style={{ position: "absolute", inset: 0, objectFit: "cover", filter: "blur(2px) brightness(0.55)" }}
            alt=""
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: "linear-gradient(180deg, rgba(5,6,12,0.35) 0%, rgba(5,6,12,0.55) 55%, rgba(5,6,12,0.92) 100%)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", position: "relative", padding: "56px", height: "100%", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} width={56} height={56} style={{ borderRadius: "50%", marginRight: "18px" }} alt="" />
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: "#ffffff" }}>
                {profile.displayName ?? `@${handle}`}
              </div>
              <div style={{ display: "flex", fontSize: 15, color: "#c3cddb" }}>@{handle}</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "999px",
                marginBottom: "22px",
                background: "linear-gradient(140deg, #e2e8f0, #94a3b8)",
              }}
            >
              <div style={{ display: "flex", fontSize: 15, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#0a0d13" }}>
                {hasPlatinum ? "Platino conseguido" : "100% conseguido"}
              </div>
            </div>

            <div style={{ display: "flex", fontSize: 54, fontWeight: 700, color: "#ffffff", lineHeight: 1.05, textShadow: "0 4px 24px rgba(0,0,0,0.6)" }}>
              {game.title}
            </div>

            <div style={{ display: "flex", gap: "18px", marginTop: "34px" }}>
              {horas !== null && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    borderRadius: "18px",
                    padding: "22px",
                    background: "rgba(10, 13, 19, 0.55)",
                    border: "1px solid rgba(255,255,255,0.14)",
                  }}
                >
                  <div style={{ display: "flex", fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#8b93a7" }}>
                    Horas invertidas
                  </div>
                  <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#ffffff", marginTop: "6px" }}>
                    {horas.toFixed(0)} h
                  </div>
                </div>
              )}

              {dificultad && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    borderRadius: "18px",
                    padding: "22px",
                    background: "rgba(10, 13, 19, 0.55)",
                    border: `1px solid ${dificultad.color}66`,
                  }}
                >
                  <div style={{ display: "flex", fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#8b93a7" }}>
                    Rareza del platino
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "6px" }}>
                    <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: dificultad.color }}>
                      {dificultad.rareza.toFixed(1)}%
                    </div>
                    <div style={{ display: "flex", fontSize: 16, fontWeight: 600, color: dificultad.color }}>
                      {dificultad.etiqueta}
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  borderRadius: "18px",
                  padding: "22px",
                  background: "rgba(10, 13, 19, 0.55)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                <div style={{ display: "flex", fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#8b93a7" }}>
                  Trofeos
                </div>
                <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#ffffff", marginTop: "6px" }}>
                  {game.earnedTotal}/{game.definedTotal}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", fontSize: 15, color: "#8b93a7" }}>
            paragon.app/u/{handle}/{game.id}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
