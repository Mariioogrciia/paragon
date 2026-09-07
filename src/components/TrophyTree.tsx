"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import type { Trophy, Platform } from "@/lib/types";
import { TrophyPhoto } from "@/components/TrophyList";
import { colorFor } from "@/lib/design";

export function TrophyTree({
  trophies,
  platform,
  onTrophyClick,
}: {
  trophies: Trophy[];
  platform?: Platform;
  onTrophyClick: (t: Trophy) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ id: string; x1: number; y1: number; x2: number; y2: number; color: string }[]>([]);

  // Agrupamos en 4 niveles
  const levels = useMemo(() => {
    const hasGrades = trophies.some(t => t.grade);
    let l1: Trophy[] = [];
    let l2: Trophy[] = [];
    let l3: Trophy[] = [];
    let l4: Trophy[] = [];

    if (hasGrades) {
      l1 = trophies.filter(t => t.grade === "platinum");
      l2 = trophies.filter(t => t.grade === "gold");
      l3 = trophies.filter(t => t.grade === "silver");
      l4 = trophies.filter(t => t.grade === "bronze");
    } else {
      // Por rareza para juegos sin metales (Steam)
      l1 = trophies.filter(t => (t.rarityPercent ?? 0) <= 5);
      l2 = trophies.filter(t => (t.rarityPercent ?? 0) > 5 && (t.rarityPercent ?? 0) <= 20);
      l3 = trophies.filter(t => (t.rarityPercent ?? 0) > 20 && (t.rarityPercent ?? 0) <= 50);
      l4 = trophies.filter(t => (t.rarityPercent ?? 0) > 50);
    }

    // Quitamos los niveles vacíos para que no haya huecos
    return [l1, l2, l3, l4].filter(l => l.length > 0);
  }, [trophies]);

  useEffect(() => {
    function drawLines() {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newLines = [];

      for (let i = 0; i < levels.length - 1; i++) {
        const currentLevel = levels[i];
        const nextLevel = levels[i + 1];

        // Repartimos los hijos del siguiente nivel entre los padres
        const childrenPerParent = Math.ceil(nextLevel.length / currentLevel.length);

        for (let j = 0; j < currentLevel.length; j++) {
          const parent = currentLevel[j];
          const parentEl = container.querySelector(`[data-trophy-id="${parent.id}"]`);
          if (!parentEl) continue;
          
          const parentRect = parentEl.getBoundingClientRect();
          // Calculamos el centro horizontal y la parte inferior del nodo padre
          const pX = parentRect.left + parentRect.width / 2 - containerRect.left + container.scrollLeft;
          const pY = parentRect.bottom - containerRect.top + container.scrollTop;

          const startIndex = j * childrenPerParent;
          const endIndex = Math.min(startIndex + childrenPerParent, nextLevel.length);
          
          for (let k = startIndex; k < endIndex; k++) {
            const child = nextLevel[k];
            const childEl = container.querySelector(`[data-trophy-id="${child.id}"]`);
            if (!childEl) continue;

            const childRect = childEl.getBoundingClientRect();
            // Centro horizontal y parte superior del nodo hijo
            const cX = childRect.left + childRect.width / 2 - containerRect.left + container.scrollLeft;
            const cY = childRect.top - containerRect.top + container.scrollTop;

            newLines.push({
              id: `${parent.id}-${child.id}`,
              x1: pX,
              y1: pY,
              x2: cX,
              y2: cY,
              // Brilla si ambos están conseguidos
              color: (parent.earned && child.earned) ? "var(--platinum)" : "var(--border)",
            });
          }
        }
      }
      setLines(newLines);
    }

    // Pequeño delay inicial para asegurar que el DOM ha renderizado y ubicado
    const timer = setTimeout(drawLines, 100);
    
    const ro = new ResizeObserver(drawLines);
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    
    // También re-dibujar si cambia el scroll o el tamaño de la ventana
    window.addEventListener("resize", drawLines);
    
    return () => {
      clearTimeout(timer);
      ro.disconnect();
      window.removeEventListener("resize", drawLines);
    };
  }, [levels]);

  return (
    <div ref={containerRef} className="relative w-full py-10 px-4 min-h-[500px]">
      <svg 
        className="absolute inset-0 pointer-events-none z-0" 
        style={{ width: "100%", height: "100%" }}
      >
        {lines.map(line => (
          <line
            key={line.id}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={line.color}
            strokeWidth="2"
            strokeLinecap="round"
            className="transition-colors duration-500 opacity-40"
          />
        ))}
      </svg>

      <div className="flex flex-col items-center gap-20 relative z-10 w-full mx-auto pb-10">
        {levels.map((levelTrophies, i) => (
          <div key={i} className="flex flex-row flex-wrap justify-center gap-10 w-full">
            {levelTrophies.map(t => {
              const baseColor = colorFor(t.grade || "bronze");
              const isEarned = t.earned;
              const isHidden = t.hidden && !t.earned;
              
              return (
                <div 
                  key={t.id}
                  data-trophy-id={t.id}
                  className="relative group cursor-pointer transition-transform hover:scale-110 flex flex-col items-center"
                  onClick={() => onTrophyClick(t)}
                >
                  <div 
                    className="absolute inset-0 rounded-full blur-xl transition-opacity opacity-0 group-hover:opacity-60"
                    style={{ backgroundColor: baseColor, zIndex: -1 }}
                  />
                  <div className={`relative z-10 transition-all ${isEarned ? 'opacity-100 ring-2 ring-white/20 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'opacity-50 grayscale'}`}>
                    <TrophyPhoto trophy={t} size={64} />
                  </div>
                  <span className="max-w-[150px] text-center text-xs font-semibold truncate px-2 opacity-0 group-hover:opacity-100 transition-opacity text-white bg-black/60 rounded backdrop-blur-sm absolute -bottom-7 z-20 whitespace-nowrap">
                    {isHidden ? "Trofeo oculto" : t.name}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
