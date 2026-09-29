import { ImageResponse } from "next/og";
import { getLibrary, getProfileByHandle } from "@/lib/profiles";
import { getParagonLevel } from "@/lib/paragonLevel";
import { ultimosTrofeos } from "@/lib/history";
import { summarise } from "@/lib/stats";
import { urlAbsolutaParaOg } from "@/lib/design";

const COLOR_GRADO: Record<string, string> = {
  platinum: "#9fd4ec",
  gold: "#e2b53e",
  silver: "#b9c2cc",
  bronze: "#c07b4a",
};

/**
 * Firma para foros, redes o la bio de Twitch (`/api/firma/<handle>`): una
 * imagen de 600×150 con avatar, nivel, platinos, trofeos y los últimos
 * trofeos, que se actualiza sola — como las firmas de PSNProfiles. Se
 * enlaza tal cual desde cualquier sitio que admita imágenes externas.
 *
 * Caché de una hora en la CDN: una firma se pinta en cada visita a cada
 * post donde esté puesta, y regenerarla cada vez sería la forma más cara de
 * no cambiar nada.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle: bruto } = await params;
  const handle = bruto.replace(/\.png$/i, "").toLowerCase();

  const profile = await getProfileByHandle(handle);
  if (!profile) return new Response("No existe ese perfil.", { status: 404 });

  const [{ player, games }, nivel, recientes] = await Promise.all([
    getLibrary(profile),
    getParagonLevel(profile.userId),
    ultimosTrofeos(profile.userId, 3),
  ]);
  const resumen = summarise(games);
  const avatar = urlAbsolutaParaOg(player.avatarUrl);

  const dato = (valor: number | string, etiqueta: string, color = "#e6edf5") => (
    <div style={{ display: "flex", flexDirection: "column", marginRight: 18 }}>
      <span style={{ fontSize: 26, fontWeight: 700, color }}>{valor}</span>
      <span style={{ fontSize: 11, color: "#8a98ab", letterSpacing: 1 }}>{etiqueta}</span>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 22px",
          background: "linear-gradient(120deg, #101a2b 0%, #0a0f18 60%, #141029 100%)",
          border: "1px solid #243042",
          borderRadius: 14,
          fontFamily: "sans-serif",
          color: "#e6edf5",
        }}
      >
        {avatar ? (
          <img src={avatar} alt="" width={86} height={86} style={{ borderRadius: 43, border: "3px solid #7fbcd8", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 86, height: 86, borderRadius: 43, background: "#1c2638", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 700 }}>
            {(player.name || handle).slice(0, 1).toUpperCase()}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", marginLeft: 18, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{ fontSize: 24, fontWeight: 700 }}>{player.name || handle}</span>
            <span style={{ fontSize: 14, color: "#7fbcd8", marginLeft: 10, fontWeight: 700 }}>NV. {nivel.level}</span>
          </div>
          <span style={{ fontSize: 13, color: "#8a98ab", marginBottom: 10 }}>@{handle} · Paragon</span>
          <div style={{ display: "flex" }}>
            {dato(resumen.platinos, "PLATINOS", COLOR_GRADO.platinum)}
            {dato(resumen.trofeos.toLocaleString("es-ES"), "TROFEOS")}
            {dato(resumen.juegos, "JUEGOS")}
            {dato(`${resumen.completadoMedio}%`, "COMPLETADO")}
          </div>
        </div>

        <div style={{ display: "flex", alignSelf: "flex-start", marginTop: 20 }}>
          {recientes.map((t) => {
            const icono = urlAbsolutaParaOg(t.iconUrl ?? t.gameIconUrl ?? undefined);
            return icono ? (
              <img
                key={`${t.gameId}-${t.trophyId}`}
                src={icono}
                alt=""
                width={44}
                height={44}
                style={{ borderRadius: 8, marginLeft: 6, border: `2px solid ${COLOR_GRADO[t.grade ?? ""] ?? "#243042"}`, objectFit: "cover" }}
              />
            ) : null;
          })}
        </div>
      </div>
    ),
    {
      width: 600,
      height: 150,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" },
    },
  );
}
