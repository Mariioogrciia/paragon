import React from "react";

export function AvatarFrame({ frame, children }: { frame?: string | null, children: React.ReactNode }) {
  if (!frame) return <>{children}</>;

  const frameColors: Record<string, { start: string, end: string, glow: string }> = {
    gold: { start: "#FCD34D", end: "#F59E0B", glow: "rgba(245, 158, 11, 0.4)" },
    platinum: { start: "#E2E8F0", end: "#94A3B8", glow: "rgba(148, 163, 184, 0.4)" },
    fire: { start: "#EF4444", end: "#F97316", glow: "rgba(239, 68, 68, 0.6)" },
  };

  const colors = frameColors[frame] || frameColors.gold;

  return (
    <div className="relative inline-flex items-center justify-center">
      <div 
        className="absolute inset-0 rounded-full z-0"
        style={{
          boxShadow: `0 0 15px ${colors.glow}, inset 0 0 10px ${colors.glow}`,
          background: `linear-gradient(135deg, ${colors.start}, ${colors.end})`,
          transform: 'scale(1.15)',
        }}
      />
      <div className="relative z-10 rounded-full overflow-hidden border-4" style={{ borderColor: 'var(--background)' }}>
        {children}
      </div>
    </div>
  );
}
