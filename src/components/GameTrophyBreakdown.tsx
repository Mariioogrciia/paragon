import { Trophy, Award } from "lucide-react";
import { TrophyBreakdown } from "@/lib/community";
import { PLATFORM_LABEL } from "@/lib/types";

/**
 * Cuántos logros define cada versión de este juego, una fila por
 * plataforma en la que existe (ver el comentario de `getGameTrophyBreakdown`
 * en lib/community.ts). Los "puntos de nivel PSN" solo salen donde
 * significan algo de verdad — Steam no tiene un sistema de puntos por
 * logro, así que ahí no se enseña ningún número inventado.
 */
export function GameTrophyBreakdown({ breakdown }: { breakdown: TrophyBreakdown[] }) {
  if (breakdown.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[15px] font-bold">Logros por plataforma</h3>
      </div>
      <p className="mb-4 text-xs text-muted">Cuántos trofeos/logros tiene definidos cada versión de este juego.</p>
      <div className="flex flex-col gap-1 rounded-xl bg-muted/10 p-2 border border-border/50">
        {breakdown.map((b) => (
          <div key={b.platform} className="flex items-center justify-between py-2 px-3 hover:bg-white/5 rounded-lg transition-colors">
            <span className="font-semibold text-sm">{PLATFORM_LABEL[b.platform as keyof typeof PLATFORM_LABEL] ?? b.platform}</span>
            <div className="flex items-center gap-4 text-xs font-bold text-muted">
              <span className="flex items-center gap-1.5" title="Logros/trofeos definidos en esta versión">
                <Trophy size={12} className="text-foreground" />
                {b.totalTrophies}
              </span>
              {b.totalPoints > 0 && (
                <span className="flex items-center gap-1.5" title="Puntos que suman al nivel de trofeos de PSN si los consigues todos (bronce 15 · plata 30 · oro 90 · platino 300)">
                  <Award size={12} className="text-foreground" />
                  {b.totalPoints.toLocaleString()} pts nivel PSN
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
