import { ImageResponse } from "next/og";

/** Mismo path que TrophyIcon.tsx (PSN_PLATINUM) — se copia en vez de
 * importar el componente porque ese usa `currentColor`/CSS vars, que Satori
 * no resuelve; aquí hace falta un color plano de verdad. */
export function TrofeoPlatino({ size, color }: { size: number; color: string }) {
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

/**
 * Versión vertical 1080×1920 para Stories de Instagram y TikTok (16 oct
 * 2026, ver lib/compartirPlatino.ts): la carátula grande arriba, el título,
 * las cifras y, abajo del todo y bien visible, la dirección de Paragon — es
 * lo que hace que una story compartida traiga gente nueva.
 */
export function historia(d: {
  dominio: string;
  handle: string;
  nombre: string;
  avatarUrl: string | undefined;
  titulo: string;
  coverUrl: string | null;
  rotulo: string;
  stats: { label: string; value: string; accent: string }[];
  cta: string;
  rarezaColor: string;
  PLATINO: string;
}) {
  const { PLATINO } = d;
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
          background: "linear-gradient(170deg, #0d1420 0%, #0a0d13 55%, #07090d 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: `radial-gradient(900px 700px at 50% 22%, ${d.rarezaColor}40, transparent 65%), radial-gradient(700px 500px at 50% 100%, ${PLATINO}26, transparent 60%)`,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", padding: "110px 80px 90px", height: "100%", width: "100%" }}>
          <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: 8, color: "#ffffff" }}>PARAGON</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 26px 12px 18px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${PLATINO}55`,
              }}
            >
              <TrofeoPlatino size={34} color={PLATINO} />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: "90px",
              width: "540px",
              height: "720px",
              borderRadius: "36px",
              overflow: "hidden",
              border: "4px solid rgba(255,255,255,0.2)",
              boxShadow: `0 40px 120px -20px rgba(0,0,0,0.8), 0 0 140px ${d.rarezaColor}55`,
              background: `linear-gradient(160deg, ${PLATINO}44, #131a26)`,
            }}
          >
            {d.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.coverUrl} width={540} height={720} style={{ objectFit: "cover" }} alt="" />
            )}
          </div>

          <div style={{ display: "flex", marginTop: "64px", fontSize: 30, fontWeight: 800, letterSpacing: 6, textTransform: "uppercase", color: d.rarezaColor }}>
            {d.rotulo}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              textAlign: "center",
              marginTop: "18px",
              fontSize: d.titulo.length > 28 ? 64 : 80,
              fontWeight: 800,
              lineHeight: 1.05,
              color: "#ffffff",
            }}
          >
            {d.titulo}
          </div>

          <div style={{ display: "flex", gap: "20px", width: "100%", marginTop: "56px" }}>
            {d.stats.map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: 1,
                  borderRadius: "24px",
                  padding: "26px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderTop: `4px solid ${s.accent}`,
                }}
              >
                <div style={{ display: "flex", fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#8b93a7" }}>{s.label}</div>
                <div style={{ display: "flex", fontSize: 48, fontWeight: 800, color: "#ffffff", marginTop: "8px" }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", marginTop: "auto" }}>
            {d.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.avatarUrl} width={84} height={84} style={{ borderRadius: "50%", marginRight: "22px", border: "3px solid rgba(255,255,255,0.25)" }} alt="" />
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#ffffff" }}>{d.nombre}</div>
              <div style={{ display: "flex", fontSize: 26, color: "#8b93a7" }}>@{d.handle}</div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "48px",
              padding: "22px 40px",
              borderRadius: "999px",
              background: `${PLATINO}1f`,
              border: `2px solid ${PLATINO}66`,
            }}
          >
            <div style={{ display: "flex", fontSize: 24, color: "#c9d3e3" }}>{d.cta}</div>
            <div style={{ display: "flex", fontSize: 36, fontWeight: 800, color: PLATINO, marginTop: "4px" }}>{d.dominio}</div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
}
