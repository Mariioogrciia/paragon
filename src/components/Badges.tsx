import React from "react";
import { TrophyIcon } from "./TrophyIcon";
import { AchievementIcon } from "./AchievementIcon";

type BadgeDef = {
  id: string;
  name: string;
  description: string;
  icon: string | React.ReactNode;
  bg: string;
};

export const BADGE_DEFINITIONS: Record<string, BadgeDef> = {
  "first_blood": {
    id: "first_blood",
    name: "Primera Sangre",
    description: "Conseguiste tu primer platino",
    icon: <TrophyIcon grade="platinum" size={16} />,
    bg: "linear-gradient(135deg, #2b5f7d, #cfeaf7)",
  },
  "cazador": {
    id: "cazador",
    name: "Cazador",
    description: "Has conseguido 10 platinos",
    icon: <AchievementIcon id="cazador" size={16} />,
    bg: "linear-gradient(135deg, #1f2937, #4b5563)",
  },
  "experto": {
    id: "experto",
    name: "Experto",
    description: "Has conseguido 50 platinos",
    icon: <AchievementIcon id="experto" size={16} />,
    bg: "linear-gradient(135deg, #7f1d1d, #ef4444)",
  },
  "leyenda": {
    id: "leyenda",
    name: "Leyenda",
    description: "Has conseguido 100 platinos",
    icon: <AchievementIcon id="leyenda" size={16} />,
    bg: "linear-gradient(135deg, #78350f, #fbbf24)",
  },
  "coleccionista": {
    id: "coleccionista",
    name: "Coleccionista",
    description: "Tienes más de 100 juegos en tu biblioteca",
    icon: <AchievementIcon id="coleccionista" size={16} />,
    bg: "linear-gradient(135deg, #064e3b, #10b981)",
  },
  "madrugador": {
    id: "madrugador",
    name: "Madrugador",
    description: "Usuario pionero de Paragon",
    icon: <AchievementIcon id="madrugador" size={16} />,
    bg: "linear-gradient(135deg, #4c1d95, #8b5cf6)",
  },
  "critico": {
    id: "critico",
    name: "Crítico",
    description: "Has escrito al menos 3 reseñas",
    icon: <AchievementIcon id="critico" size={16} />,
    bg: "linear-gradient(135deg, #be123c, #f43f5e)",
  },
  "sociable": {
    id: "sociable",
    name: "Sociable",
    description: "Tienes al menos 3 amigos",
    icon: <AchievementIcon id="sociable" size={16} />,
    bg: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
  },
  "rolero": {
    id: "rolero",
    name: "Rolero",
    description: "Has jugado 5 juegos de RPG",
    icon: <AchievementIcon id="rolero" size={16} />,
    bg: "linear-gradient(135deg, #047857, #10b981)",
  }
};

export function Badges({ earnedBadges }: { earnedBadges: { badgeId: string, earnedAt: Date }[] }) {
  if (earnedBadges.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {earnedBadges.map(({ badgeId }) => {
        const badge = BADGE_DEFINITIONS[badgeId];
        if (!badge) return null;

        return (
          <div
            key={badge.id}
            className="group relative flex h-8 w-8 items-center justify-center rounded-full border border-white/10 shadow-sm cursor-help transition-transform hover:scale-110"
            style={{ background: badge.bg }}
          >
            <span className="drop-shadow-md text-sm">{badge.icon}</span>

            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg px-3 py-2 shadow-xl group-hover:block"
                 style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <p className="text-[13px] font-bold text-foreground">{badge.name}</p>
              <p className="text-[11px] text-muted mt-0.5">{badge.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
