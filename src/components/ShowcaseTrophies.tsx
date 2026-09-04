"use client";

import Link from "next/link";
import { type Game, type Trophy } from "@/lib/types";
import { gradeLabel, TrophyIcon } from "./TrophyIcon";
import { colorFor, rarity } from "@/lib/design";
import { TiltCard } from "@/components/TiltCard";

export function ShowcaseTrophies({ 
  items, 
  handle 
}: { 
  items: { game: Game; trophy: Trophy }[];
  handle: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-8 mb-4">
      <h2 className="font-heading text-xl font-bold uppercase tracking-wide text-[rgb(var(--accent-rgb))] mb-4 flex items-center gap-2">
        <TrophyIcon grade="platinum" size={24} />
        Vitrina de Orgullo
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map(({ game, trophy }) => {
          const r = trophy.rarityPercent !== undefined ? rarity(trophy.rarityPercent) : null;
          
          return (
            <TiltCard 
              key={`${game.id}-${trophy.id}`} 
              href={`/u/${handle}/${game.id}`}
              className={`relative overflow-hidden rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-2xl hover:border-[rgb(var(--accent-rgb)/0.5)] group block ${trophy.grade === 'platinum' || trophy.grade === 'gold' ? 'holo-card' : ''}`}
            >
              <div className="absolute top-0 right-0 p-3 opacity-20 transition-opacity group-hover:opacity-40">
                <TrophyIcon grade={trophy.grade ?? "bronze"} size={64} />
              </div>
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colorFor(trophy.grade ?? "bronze") }}>
                    {gradeLabel(trophy.grade ?? "bronze")}
                  </span>
                  <h3 className="font-bold text-lg leading-tight mt-1 mb-1 group-hover:text-white transition-colors line-clamp-2">
                    {trophy.name}
                  </h3>
                  <p className="text-xs text-muted font-medium line-clamp-1">
                    {game.title}
                  </p>
                </div>
                
                <div className="mt-auto pt-4 flex items-center justify-between">
                  {r && (
                    <span 
                      className="inline-block rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: r.bg, color: r.fg }}
                    >
                      {r.label} · {trophy.rarityPercent!.toFixed(1)}%
                    </span>
                  )}
                  {trophy.earnedAt && (
                    <span className="text-[10px] text-muted font-medium ml-auto">
                      {new Date(trophy.earnedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </TiltCard>
          );
        })}
      </div>
    </section>
  );
}
