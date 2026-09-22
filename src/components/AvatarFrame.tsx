import React from "react";

/**
 * Marcos de avatar. Cada uno tiene su propio movimiento y su propia forma de
 * anillo, no solo su propio color — un "marco nuevo" que es el mismo anillo
 * estático con otro gradiente es indistinguible de una recoloración. El
 * requisito de nivel de cada uno vive en `FRAME_REQUISITOS` (lib/level.ts) y
 * se aplica de verdad en `/api/profile/update`, no solo en el texto del
 * desplegable.
 */
export function AvatarFrame({ frame, children }: { frame?: string | null, children: React.ReactNode }) {
  if (!frame || !(frame in RENDERERS)) return <>{children}</>;
  return RENDERERS[frame](children);
}

const RENDERERS: Record<string, (children: React.ReactNode) => React.ReactNode> = {
  gold: (children) => (
    <AnilloEstatico start="#FCD34D" end="#F59E0B" glow="rgba(245, 158, 11, 0.4)">
      {children}
    </AnilloEstatico>
  ),
  platinum: (children) => (
    <AnilloEstatico start="#E2E8F0" end="#94A3B8" glow="rgba(148, 163, 184, 0.4)">
      {children}
    </AnilloEstatico>
  ),
  fire: (children) => (
    <div className="relative inline-flex items-center justify-center">
      <div
        className="absolute inset-0 z-0 rounded-full"
        style={{
          boxShadow: "0 0 15px rgba(239, 68, 68, 0.6), inset 0 0 10px rgba(239, 68, 68, 0.6)",
          background: "linear-gradient(135deg, #EF4444, #F97316)",
          transform: "scale(1.15)",
          animation: "frame-flicker 1.8s ease-in-out infinite",
        }}
      />
      <Nucleo>{children}</Nucleo>
    </div>
  ),
  // Doble anillo fino con pulso de neón: nada de degradado sólido, es luz
  // parpadeando, así que el requisito de nivel es bajo — es el marco "para
  // presumir pronto".
  neon: (children) => (
    <div className="relative inline-flex items-center justify-center">
      <div
        className="absolute inset-0 z-0 rounded-full border-2"
        style={{
          borderColor: "#22d3ee",
          boxShadow: "0 0 12px #22d3ee, 0 0 24px rgba(34, 211, 238, 0.6)",
          transform: "scale(1.22)",
          animation: "frame-pulse 1.6s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-0 z-0 rounded-full border-2"
        style={{
          borderColor: "#e879f9",
          boxShadow: "0 0 10px #e879f9",
          transform: "scale(1.12)",
          animation: "frame-pulse 1.6s ease-in-out infinite 0.35s",
        }}
      />
      <Nucleo>{children}</Nucleo>
    </div>
  ),
  // Anillo punteado girando, como un radar/circuito. Nivel medio: el gancho
  // "técnico" para quien ya lleva un rato.
  circuito: (children) => (
    <div className="relative inline-flex items-center justify-center">
      <div
        className="absolute inset-0 z-0 rounded-full"
        style={{
          border: "2px dashed #34d399",
          transform: "scale(1.2)",
          animation: "frame-spin 6s linear infinite",
          boxShadow: "0 0 10px rgba(52, 211, 153, 0.35)",
        }}
      />
      <div
        className="absolute inset-0 z-0 rounded-full"
        style={{
          border: "1px solid rgba(52, 211, 153, 0.4)",
          transform: "scale(1.32)",
        }}
      />
      <Nucleo>{children}</Nucleo>
    </div>
  ),
  // Anillo de cristal: un barrido de luz diagonal cruzándolo, como el efecto
  // holográfico de las tarjetas de platino (holo-shimmer en globals.css),
  // pero en un anillo. Es el de nivel más alto — la prestige piece.
  cristal: (children) => (
    <div className="relative inline-flex items-center justify-center">
      <div
        className="absolute inset-0 z-0 rounded-full"
        style={{
          background: "linear-gradient(135deg, rgba(223,240,248,0.5), rgba(127,188,216,0.35))",
          boxShadow: "0 0 18px rgba(223, 240, 248, 0.45), inset 0 0 12px rgba(223, 240, 248, 0.3)",
          transform: "scale(1.18)",
        }}
      />
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-full"
        style={{ transform: "scale(1.18)" }}
      >
        <div
          className="h-full w-full"
          style={{
            background:
              "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.9) 48%, #dff0f8 52%, transparent 70%)",
            backgroundSize: "250% 100%",
            animation: "frame-sweep 2.8s linear infinite",
          }}
        />
      </div>
      <Nucleo>{children}</Nucleo>
    </div>
  ),
};

function AnilloEstatico({
  start,
  end,
  glow,
  children,
}: {
  start: string;
  end: string;
  glow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <div
        className="absolute inset-0 z-0 rounded-full"
        style={{
          boxShadow: `0 0 15px ${glow}, inset 0 0 10px ${glow}`,
          background: `linear-gradient(135deg, ${start}, ${end})`,
          transform: "scale(1.15)",
        }}
      />
      <Nucleo>{children}</Nucleo>
    </div>
  );
}

function Nucleo({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 rounded-full overflow-hidden border-4" style={{ borderColor: "var(--background)" }}>
      {children}
    </div>
  );
}
