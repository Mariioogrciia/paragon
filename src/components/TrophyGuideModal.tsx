"use client";

import { useEffect, useState, useTransition } from "react";
import { searchTrophyGuideAction, pinTrophyAction } from "@/app/actions";
import { type Trophy } from "@/lib/types";
import { TrophyIcon } from "@/components/TrophyIcon";
import { Pin, PinOff } from "lucide-react";

/**
 * Atajos de guía escrita: en vez de "buscar en Google" desde el servidor
 * (rasparlo bloquea a la primera petición — DuckDuckGo, que es más permisivo
 * que Google, ya devuelve una página de "actividad sospechosa" en la
 * primera prueba), se construye la URL de búsqueda de verdad y se abre en
 * una pestaña nueva. Nada incrustado: la mayoría de estos sitios bloquean el
 * framing (X-Frame-Options), y aunque no lo bloquearan, reproducir su
 * contenido dentro de Paragon sin permiso no toca.
 */
const FUENTES_GUIA = [
  { label: "Google", sitio: null },
  { label: "Vandal", sitio: "vandal.elespanol.com" },
  { label: "Meristation", sitio: "as.com/meristation" },
  { label: "3DJuegos", sitio: "3djuegos.com" },
] as const;

function urlBusquedaGuia(gameTitle: string, trophyName: string, sitio: string | null) {
  const consulta = `${gameTitle} "${trophyName}" guía trofeo${sitio ? ` site:${sitio}` : ""}`;
  return `https://www.google.com/search?q=${encodeURIComponent(consulta)}`;
}

export function TrophyGuideModal({
  gameTitle,
  gameId,
  trophy,
  esMio,
  isPinned,
  onClose,
}: {
  gameTitle: string;
  gameId?: string;
  trophy: Trophy;
  esMio?: boolean;
  isPinned?: boolean;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [videoId, setVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pestaña, setPestaña] = useState<"video" | "guia">("video");

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
          
          <div className="flex items-center">
            {esMio && gameId && (
              <button 
                onClick={() => {
                  startTransition(async () => {
                    await pinTrophyAction(gameId, trophy.id);
                  });
                }}
                disabled={isPending}
                title={isPinned ? "Quitar de la vitrina" : "Fijar en tu vitrina de perfil"}
                className={`ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${isPinned ? "bg-[rgb(var(--accent-rgb))] text-black" : "hover:bg-white/10 text-muted hover:text-white"}`}
              >
                {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
              </button>
            )}
            <button 
              onClick={onClose}
              className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10 text-muted hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 border-b border-border px-6 py-2.5">
          {(
            [
              { value: "video", label: "Vídeo" },
              { value: "guia", label: "Guía escrita" },
            ] as const
          ).map((t) => (
            <button
              key={t.value}
              onClick={() => setPestaña(t.value)}
              className="rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors hover:text-foreground"
              style={
                pestaña === t.value
                  ? { background: "rgb(var(--accent-rgb) / 0.14)", color: "var(--accent-text)" }
                  : { color: "var(--muted)" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {pestaña === "video" ? (
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
        ) : (
          <div className="flex flex-col items-center gap-4 p-10 text-center">
            <p className="max-w-sm text-sm text-muted">
              Nadie de aquí escribe estas guías — se busca en internet, tú eliges dónde mirar.
              Se abre en una pestaña nueva.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {FUENTES_GUIA.map((f) => (
                <a
                  key={f.label}
                  href={urlBusquedaGuia(gameTitle, trophy.name, f.sitio)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-[10px] px-4 py-2.5 text-[13px] font-bold transition-all hover:-translate-y-0.5"
                  style={
                    f.sitio === null
                      ? { background: "var(--accent-grad)", color: "var(--background)" }
                      : { border: "1px solid var(--border)", color: "var(--foreground)" }
                  }
                >
                  Buscar en {f.label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 17 17 7M7 7h10v10" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}
        
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
