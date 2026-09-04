"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";

interface Props {
  languages: { language: string; support: string[] }[];
}

export function GameLanguages({ languages }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (languages.length === 0) return null;

  const displayLangs = expanded ? languages : languages.slice(0, 5);
  const hasMore = languages.length > 5;

  return (
    <div className="mt-12">
      <h2 className="text-xl font-bold mb-4">Idiomas</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <tbody>
            {displayLangs.map((l) => {
              const hasAudio = l.support.includes("Audio");
              const hasSub = l.support.includes("Subtitles");
              const hasInt = l.support.includes("Interface");
              
              return (
                <tr key={l.language} className="border-b border-border/50 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-2 font-medium flex items-center gap-2">
                    {/* Fake flag placeholder just to match the visual feel if desired, though standard text is safer */}
                    <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                    {l.language}
                  </td>
                  <td className="py-3 px-2 text-center text-muted">
                    <span className="inline-flex items-center gap-1">
                      {hasAudio ? <Check size={14} className="text-foreground" /> : <X size={14} className="opacity-30" />}
                      <span className={hasAudio ? "text-foreground" : "opacity-30"}>Audio</span>
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center text-muted">
                    <span className="inline-flex items-center gap-1">
                      {hasSub ? <Check size={14} className="text-foreground" /> : <X size={14} className="opacity-30" />}
                      <span className={hasSub ? "text-foreground" : "opacity-30"}>Subtítulos</span>
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center text-muted">
                    <span className="inline-flex items-center gap-1">
                      {hasInt ? <Check size={14} className="text-foreground" /> : <X size={14} className="opacity-30" />}
                      <span className={hasInt ? "text-foreground" : "opacity-30"}>Interfaz</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button 
          onClick={() => setExpanded(!expanded)}
          className="mt-4 text-accent hover:underline text-sm font-semibold"
        >
          {expanded ? "Mostrar menos" : `Mostrar los ${languages.length} idiomas`}
        </button>
      )}
    </div>
  );
}
