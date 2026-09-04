"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  videos: { videoId: string; name: string }[];
}

export function GameVideos({ videos }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (videos.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Vídeos</h2>
        {videos.length > 2 && (
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-border text-muted hover:bg-white/10 hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scroll("right")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-border text-muted hover:bg-white/10 hover:text-white transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {videos.map((v) => (
          <div key={v.videoId} className="w-[300px] lg:w-[400px] shrink-0 snap-start overflow-hidden rounded-xl border border-border">
            <div className="aspect-video relative group">
              <img
                src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`}
                alt={v.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                <a
                  href={`https://www.youtube.com/watch?v=${v.videoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 transition-colors"
                >
                  <div className="ml-1 w-0 h-0 border-y-8 border-y-transparent border-l-[12px] border-l-white" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
