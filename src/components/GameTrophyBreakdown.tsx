import { Trophy, Award } from "lucide-react";
import { TrophyBreakdown } from "@/lib/community";

interface Props {
  breakdown: TrophyBreakdown[];
}

export function GameTrophyBreakdown({ breakdown }: Props) {
  if (breakdown.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-bold">Logros</h3>
        <span className="text-xs text-muted">Todos</span>
      </div>
      <div className="flex flex-col gap-1 rounded-xl bg-muted/10 p-2 border border-border/50">
        {breakdown.map((b) => (
          <div key={b.platform} className="flex items-center justify-between py-2 px-3 hover:bg-white/5 rounded-lg transition-colors">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <span className="w-4 h-4 rounded-full bg-accent inline-block" /> {/* Placeholder icon */}
              {b.platform}
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-muted">
              <div className="flex items-center gap-1.5">
                <Trophy size={12} className="text-foreground" />
                <span>{b.totalTrophies}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award size={12} className="text-foreground" />
                <span>{b.totalPoints.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
