/* eslint-disable @next/next/no-img-element -- Satori (ImageResponse) solo entiende <img>; next/image no existe ahí */
import { ImageResponse } from "next/og";
import { getLibrary, getProfileByHandle } from "@/lib/profiles";
import { resumenHistorico, juegosDelAnio } from "@/lib/history";
import { urlAbsolutaParaOg } from "@/lib/design";
import { juegoDestacado } from "@/components/ParagonWrap";
import { wrapAnual } from "@/lib/wrapAnual";
import { mejorMesDe } from "@/components/wrap/GraficasWrap";

/**
 * Imagen compartible del Paragon Wrap (`/u/[handle]`).
 *
 * Reproduce, con Satori (lo que hay detrás de `ImageResponse`), el Wrap del
 * perfil — mismos datos (lib/wrapAnual.ts), misma cuenta, para que la imagen
 * que alguien comparte diga lo mismo que ve en la pantalla. Rediseñada el 21
 * oct 2026 a juego con el perfil: el número del año, el mes a mes, los
 * metales y el top 3 con sus carátulas.
 * Satori solo entiende flexbox: nada de CSS grid ni de las sombras/hover de
 * la versión web.
 *
 * Corre en Node (no en el runtime edge) porque `getLibrary` habla con
 * Postgres a través de `postgres-js`, que no funciona en edge.
 */
const METAL = { platinum: "#9fd4ec", gold: "#e2b53e", silver: "#b9c2cc", bronze: "#c07b4a", otros: "#7d8bb5" } as const;
const MESES = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/**
 * Una carátula como data URL, o null. Satori revienta la imagen ENTERA si
 * una URL falla al cargar, y las carátulas vienen de CDNs ajenos: se bajan
 * antes (3 s como mucho, solo PNG/JPEG, que es lo que entiende Satori) y la
 * que falla se queda en el degradado.
 */
async function caratulaSegura(url: string | null): Promise<string | null> {
  const absoluta = urlAbsolutaParaOg(url ?? undefined);
  if (!absoluta) return null;
  try {
    const res = await fetch(absoluta, { signal: AbortSignal.timeout(3000) });
    const tipo = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(png|jpe?g)/.test(tipo)) return null;
    const datos = Buffer.from(await res.arrayBuffer());
    if (datos.length > 1_500_000) return null;
    return `data:${tipo.split(";")[0]};base64,${datos.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const dominio = new URL(request.url).host;
  const { handle } = await params;

  const profile = await getProfileByHandle(handle);
  if (!profile) {
    return new Response("No existe ese perfil.", { status: 404 });
  }

  const [{ player, games }, resumen, juegosEsteAnio, anual] = await Promise.all([
    getLibrary(profile),
    resumenHistorico(profile.userId),
    juegosDelAnio(profile.userId),
    wrapAnual(profile.userId),
  ]);
  const avatarUrl = await caratulaSegura(player.avatarUrl ?? null);
  const topGame = juegoDestacado(games);
  const top3 = anual.topJuegos.slice(0, 3);
  const portadas = await Promise.all(top3.map((j) => caratulaSegura(j.iconUrl)));
  const maxMes = Math.max(1, ...anual.porMes.map((m) => m.total));
  const mejor = mejorMesDe(anual.porMes);
  const totalMetales = Object.values(anual.porMetal).reduce((a, b) => a + b, 0);
  const metales = (["platinum", "gold", "silver", "bronze", "otros"] as const).filter((k) => anual.porMetal[k] > 0);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "52px 56px",
          background: "radial-gradient(900px 420px at 0% 0%, rgba(159,212,236,0.16), transparent 70%), linear-gradient(160deg, #141a24, #0b0f16)",
          fontFamily: "sans-serif",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {avatarUrl && (
            <img src={avatarUrl} width={60} height={60} style={{ borderRadius: "50%", marginRight: "18px" }} alt="" />
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>{player.name}</div>
            <div style={{ display: "flex", fontSize: 17, color: "#8b93a7" }}>@{handle} · Paragon Wrap {anual.anio}</div>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, marginTop: "30px", gap: "40px" }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1.35 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "14px" }}>
              <div style={{ display: "flex", fontSize: 96, fontWeight: 700, lineHeight: 1 }}>{resumen.esteAnio}</div>
              <div style={{ display: "flex", fontSize: 20, color: "rgba(255,255,255,0.7)", marginBottom: "10px" }}>
                {juegosEsteAnio === 0 ? "trofeos este año" : `trofeos en ${juegosEsteAnio} ${juegosEsteAnio === 1 ? "juego" : "juegos"}`}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "150px", marginTop: "26px" }}>
              {anual.porMes.map((m) => (
                <div key={m.mes} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", flex: 1, height: "100%" }}>
                  <div
                    style={{
                      display: "flex",
                      width: "26px",
                      height: `${m.total === 0 ? 0 : Math.max(4, (m.total / maxMes) * 100)}%`,
                      borderRadius: "5px 5px 0 0",
                      background: mejor && m.mes === mejor.mes ? "#9fd4ec" : "rgba(159,212,236,0.38)",
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
              {MESES.map((letra, i) => (
                <div key={i} style={{ display: "flex", flex: 1, justifyContent: "center", fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{letra}</div>
              ))}
            </div>

            {totalMetales > 0 && (
              <div style={{ display: "flex", flexDirection: "column", marginTop: "24px" }}>
                <div style={{ display: "flex", height: "12px", gap: "3px" }}>
                  {metales.map((k) => (
                    <div key={k} style={{ display: "flex", flexGrow: anual.porMetal[k], background: METAL[k], borderRadius: "3px" }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: "22px", marginTop: "10px", fontSize: 17, color: "rgba(255,255,255,0.85)" }}>
                  {metales.map((k) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <div style={{ display: "flex", width: "11px", height: "11px", borderRadius: "50%", background: METAL[k] }} />
                      {anual.porMetal[k]}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: 15, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.55)" }}>
              {top3.length > 0 ? "TUS JUEGOS DEL AÑO" : "JUEGO MÁS EXPRIMIDO"}
            </div>
            {top3.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "18px" }}>
                {top3.map((j, i) => (
                  <div key={j.gameId} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ display: "flex", width: "22px", fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>{i + 1}</div>
                    {portadas[i] ? (
                      <img src={portadas[i]!} width={84} height={84} style={{ borderRadius: "14px", objectFit: "cover" }} alt="" />
                    ) : (
                      <div style={{ display: "flex", width: "84px", height: "84px", borderRadius: "14px", background: "linear-gradient(135deg, #2a3446, #151b26)" }} />
                    )}
                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                      <div style={{ display: "flex", fontSize: 22, fontWeight: 700 }}>{j.titulo.length > 26 ? `${j.titulo.slice(0, 25)}…` : j.titulo}</div>
                      <div style={{ display: "flex", fontSize: 17, color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>{j.trofeos} trofeos</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", marginTop: "18px" }}>
                <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>{topGame?.game.title ?? "Ninguno"}</div>
                <div style={{ display: "flex", fontSize: 18, color: "rgba(255,255,255,0.7)", marginTop: "8px" }}>
                  {topGame && topGame.horasTotal > 0 ? `${topGame.horasTotal.toFixed(1)} horas jugadas` : `${topGame?.game.earnedTotal ?? 0} trofeos conseguidos`}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", marginTop: "20px", fontSize: 15, color: "#4b5468" }}>
          {dominio}/u/{handle}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      // Generar la imagen es lo más caro en CPU de toda la web: que la sirva la CDN un día (21 oct 2026).
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
    },
  );
}
