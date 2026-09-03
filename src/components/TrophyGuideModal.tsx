"use client";

import { useEffect, useState } from "react";
import { searchTrophyGuideAction } from "@/app/actions";
import { type Trophy } from "@/lib/types";
import { TrophyIcon } from "@/components/TrophyIcon";

export function TrophyGuideModal({
  gameTitle,
  trophy,
  onClose,
}: {
  gameTitle: string;
  trophy: Trophy;
  onClose: () => void;
}) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only search if we don't have a video id yet
    searchTrophyGuideAction(gameTitle, trophy.name).then((id) => {
      setVideoId(id);
      setLoading(false);
    });
  }, [gameTitle, trophy.name]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div 
        className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-[24px] shadow-2xl"
        style={{ background: "var(--background)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between border-b border-border p-4 px-6">
          <div className="min-w-0">
            <h2 className="truncate font-heading text-[18px] font-bold text-foreground">
              Guía de trofeo: {trophy.name}
            </h2>
            <p className="truncate text-[13px] text-muted">
              {gameTitle}
            </p>
          </div>
          
          <button 
            onClick={onClose}
            className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="relative aspect-video w-full bg-black">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent" />
              <p className="text-sm">Buscando la mejor guía en YouTube...</p>
            </div>
          ) : videoId ? (
            <iframe
              className="absolute inset-0 h-full w-full border-0"
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted p-8 text-center">
              <p className="text-lg mb-2">No se encontró vídeo</p>
              <p className="text-sm">No pudimos encontrar una guía en YouTube para este trofeo de manera automática.</p>
            </div>
          )}
        </div>
        
        <div className="p-4 px-6 text-[13px] text-muted flex justify-between items-end">
          <p className="max-w-[80%]">{trophy.detail || "Trofeo sin descripción adicional."}</p>
          {trophy.earnedAt && (
            <p className="flex items-center gap-1.5 font-semibold text-accent-text bg-accent-text/10 px-2 py-1 rounded-md text-[11px] uppercase tracking-wider">
              <TrophyIcon grade={trophy.grade ?? "bronze"} size={14} />
              Conseguido el {new Date(trophy.earnedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
