"use client";

import { useEffect, useState } from "react";

interface UpcomingGame {
  id: string;
  title: string;
  releaseDate: string;
  platforms: string[];
  cover: string;
}

export function UpcomingGames() {
  const [games, setGames] = useState<UpcomingGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/games/upcoming")
      .then((res) => res.json())
      .then((data) => {
        setGames(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="animate-pulse h-32 bg-surface-2/50 rounded-xl" />;
  }

  if (games.length === 0) return null;

  return (
    <div className="rounded-[18px] border border-border bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold uppercase tracking-wide">
          Próximos lanzamientos
        </h2>
        <span className="text-xs font-semibold uppercase text-accent bg-accent/10 px-2 py-1 rounded-md">
          Tendencias
        </span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {games.map((game) => (
          <div key={game.id} className="group relative overflow-hidden rounded-xl border border-white/5 bg-surface-2 transition-transform hover:-translate-y-1 hover:shadow-lg">
            <div className="aspect-[3/4] w-full overflow-hidden">
              <img 
                src={game.cover} 
                alt={game.title} 
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3">
              <h3 className="text-sm font-bold leading-tight text-white line-clamp-2 drop-shadow-md">
                {game.title}
              </h3>
              <p className="mt-1 text-xs font-semibold text-accent-2 drop-shadow-md">
                {game.releaseDate}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {game.platforms.map(p => (
                  <span key={p} className="px-1.5 py-0.5 rounded-sm bg-white/20 backdrop-blur-sm text-[9px] font-bold uppercase text-white">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
