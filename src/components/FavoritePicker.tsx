"use client";

import { useState } from "react";
import { setFavoritesAction } from "@/app/actions";
import { Game } from "@/lib/types";
import { TiltCard } from "./TiltCard";
import { coverGradient } from "@/lib/design";

export function FavoritePicker({ allGames, currentFavorites }: { allGames: Game[], currentFavorites: string[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(currentFavorites || []);
  const [search, setSearch] = useState("");

  const filteredGames = allGames.filter(g => 
    g.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleGame = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(x => x !== id));
    } else if (selected.length < 4) {
      setSelected([...selected, id]);
    }
  };

  const handleSave = async () => {
    await setFavoritesAction(selected);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 text-xs font-semibold rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
      >
        Editar favoritos
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden border shadow-2xl bg-card rounded-2xl border-border">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold">Selecciona tus favoritos ({selected.length}/4)</h2>
          <button onClick={() => setIsOpen(false)} className="text-muted hover:text-foreground">✕</button>
        </div>
        
        <div className="p-4 bg-muted/10">
          <input 
            type="text" 
            placeholder="Buscar juego..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border rounded-xl bg-background border-border"
          />
        </div>

        <div className="p-4 h-[400px] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {filteredGames.map(game => (
              <div 
                key={game.id} 
                onClick={() => toggleGame(game.id)}
                className={`relative aspect-[3/4] cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${selected.includes(game.id) ? "border-accent shadow-[0_0_15px_rgba(74,158,255,0.4)]" : "border-transparent opacity-80 hover:opacity-100"}`}
                style={{ background: coverGradient(game.id) }}
              >
                {game.iconUrl && (
                  <div 
                    className="absolute inset-0 bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${game.iconUrl})`, margin: '10% 10% 30% 10%' }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 text-xs font-bold text-white leading-tight drop-shadow-md">
                  {game.title}
                </div>
                {selected.includes(game.id) && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center text-white font-bold text-xs">
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-3">
          <button onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-semibold text-muted hover:text-foreground">
            Cancelar
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-bold rounded-xl bg-accent text-white shadow-lg">
            Guardar favoritos
          </button>
        </div>
      </div>
    </div>
  );
}
