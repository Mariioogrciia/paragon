import { ImageResponse } from "next/og";
import { getGameDetail, getProfileByHandle, resolveAvatarUrl } from "@/lib/profiles";
import { dificultadDeGame, esPlatinoEquivalente } from "@/lib/stats";
import { urlAbsolutaParaOg } from "@/lib/design";

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
 *
 * Rediseñada el 5 de septiembre de 2026 — la primera versión (carátula de
 * fondo a toda página + tres cajas grises iguales) salía plana, "de
 * formulario", sin nada que dijera "esto es un hito". Esta pone la
 * carátula como una pieza física (con marco y sombra, no de fondo), un
 * distintivo de platino grande de verdad (el mismo path SVG de
 * TrophyIcon.tsx, no un emoji ni una foto) con su propio resplandor, y el
 * color de la rareza empapando el resto de la tarjeta (glow, borde,
 * cifra) — cuanto más raro el platino, más "encendida" se ve la imagen.
 */

/** Mismo path que TrophyIcon.tsx (PSN_PLATINUM) — se copia en vez de
 * importar el componente porque ese usa `currentColor`/CSS vars, que Satori
 * no resuelve; aquí hace falta un color plano de verdad. */
function TrofeoPlatino({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        fill={color}
        d="M12 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zm0 9.5a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"
      />
      <path
        fill={color}
        d="M13.5 13.3c1.7.4 3 2 3 3.9v1.8h-9v-1.8c0-1.9 1.3-3.5 3-3.9v-1.3c-2-.4-3.5-2.2-3.5-4.4v-.6h2v.6c0 1.2.9 2.2 2 2.5v1.9h2v-1.9c1.1-.3 2-1.3 2-2.5v-.6h2v.6c0 2.2-1.5 4-3.5 4.4v1.3z"
      />
    </svg>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        borderRadius: "16px",
        padding: "18px 22px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderTop: `3px solid ${accent}`,
      }}
    >
      <div style={{ display: "flex", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#8b93a7" }}>
        {label}
      </div>
      <div style={{ display: "flex", fontSize: 32, fontWeight: 800, color: "#ffffff", marginTop: "6px" }}>
        {value}
      </div>
    </div>
  );
}

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

  const avatarUrl = urlAbsolutaParaOg(resolveAvatarUrl(profile));
  const horas = game.playtimeMinutes ? game.playtimeMinutes / 60 : null;
  const dificultad = dificultadDeGame(game);
  // Steam no tiene trofeo de platino de verdad que contar (por eso
  // esPlatinoEquivalente le da el mismo mérito con el 100%) — el rótulo de
  // la tarjeta lo dice sin fingir un platino que esa plataforma no tiene.
  const hasPlatinum = (game.defined?.platinum ?? 0) > 0;

  // Azul-plata de siempre para "platino" (mismo #9fd4ec que ya usa
  // ParagonWrap/TrophyIcon) — la rareza real solo tiñe el resplandor y las
  // cifras, nunca sustituye al color de marca del metal.
  const PLATINO = "#9fd4ec";
  const rarezaColor = dificultad?.color ?? PLATINO;

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
          background: "linear-gradient(155deg, #0d1420 0%, #0a0d13 55%, #07090d 100%)",
        }}
      >
        {/* Resplandor detrás de todo, teñido por lo raro que es el platino:
            cuanto más bajo el % (más raro), más se nota. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: `radial-gradient(760px 480px at 82% 8%, ${rarezaColor}3d, transparent 60%), radial-gradient(600px 400px at 0% 100%, ${PLATINO}22, transparent 55%)`,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", position: "relative", padding: "52px 56px", height: "100%", width: "100%", justifyContent: "space-between" }}>
          {/* Cabecera: jugador a la izquierda, distintivo de platino a la derecha */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  width={52}
                  height={52}
                  style={{ borderRadius: "50%", marginRight: "16px", border: "2px solid rgba(255,255,255,0.2)" }}
                  alt=""
                />
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: "#ffffff" }}>
                  {profile.displayName ?? `@${handle}`}
                </div>
                <div style={{ display: "flex", fontSize: 14, color: "#8b93a7" }}>@{handle}</div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 22px 10px 16px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${PLATINO}55`,
                boxShadow: `0 0 40px ${PLATINO}33`,
              }}
            >
              <TrofeoPlatino size={26} color={PLATINO} />
              <div style={{ display: "flex", fontSize: 16, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: PLATINO }}>
                {hasPlatinum ? "Platino" : "100%"}
              </div>
            </div>
          </div>

          {/* Cuerpo: carátula como pieza física + título */}
          <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
            <div
              style={{
                display: "flex",
                width: "176px",
                height: "234px",
                borderRadius: "20px",
                overflow: "hidden",
                border: "3px solid rgba(255,255,255,0.18)",
                boxShadow: `0 24px 60px -12px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,0,0,0.4)`,
                background: `linear-gradient(160deg, ${PLATINO}44, #131a26)`,
                flexShrink: 0,
              }}
            >
              {game.iconUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={game.iconUrl} width={176} height={234} style={{ objectFit: "cover" }} alt="" />
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", fontSize: 15, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: rarezaColor }}>
                {hasPlatinum ? "Platino conseguido" : "100% conseguido"}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 52,
                  fontWeight: 800,
                  color: "#ffffff",
                  lineHeight: 1.05,
                  marginTop: "10px",
                  textShadow: "0 4px 30px rgba(0,0,0,0.5)",
                }}
              >
                {game.title}
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          <div style={{ display: "flex", gap: "16px" }}>
            {horas !== null && <Stat label="Horas invertidas" value={`${horas.toFixed(0)} h`} accent={PLATINO} />}
            {dificultad && (
              <Stat
                label="Rareza del platino"
                value={`${dificultad.rareza.toFixed(1)}% · ${dificultad.etiqueta}`}
                accent={rarezaColor}
              />
            )}
            <Stat label="Trofeos" value={`${game.earnedTotal}/${game.definedTotal}`} accent={PLATINO} />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontSize: 14, fontWeight: 700, letterSpacing: 1, color: "#5a6577" }}>PARAGON</div>
            <div style={{ display: "flex", fontSize: 14, color: "#5a6577" }}>
              paragon.app/u/{handle}/{game.id}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
