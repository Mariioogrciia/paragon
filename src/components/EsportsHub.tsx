"use client";

import { useState } from "react";
import { SiTwitch } from "@icons-pack/react-simple-icons";
import { useTranslations, useLocale } from "next-intl";
import type { EsportsMatch } from "@/lib/pandascore";

const LOCALE_TAGS: Record<string, string> = { es: "es-ES", en: "en-US", de: "de-DE", fr: "fr-FR" };

export function EsportsHub({
  live,
  upcoming,
  past,
}: {
  live: EsportsMatch[];
  upcoming: EsportsMatch[];
  past: EsportsMatch[];
}) {
  const t = useTranslations("Descubrir.EsportsHub");
  const locale = useLocale();
  const localeTag = LOCALE_TAGS[locale] ?? "es-ES";
  const [filter, setFilter] = useState<string>("Todos");

  // Sacamos los juegos únicos para los botones de filtro
  const allGames = Array.from(new Set([...live, ...upcoming, ...past].map(m => m.game))).sort();

  const filteredLive = filter === "Todos" ? live : live.filter(m => m.game === filter);
  const filteredUpcoming = filter === "Todos" ? upcoming : upcoming.filter(m => m.game === filter);
  const filteredPast = filter === "Todos" ? past : past.filter(m => m.game === filter);

  // Fallback logo if empty
  const getLogo = (logo: string) => logo || "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";

  return (
    <div className="flex flex-col gap-8">
      
      {/* Filtros por Juego */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <span className="text-sm font-bold text-muted mr-2 shrink-0">{t("filtrarPor")}</span>
        <button
          onClick={() => setFilter("Todos")}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors ${filter === "Todos" ? "text-background" : "bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-2"}`}
          style={filter === "Todos" ? { background: "var(--accent-grad)" } : {}}
        >
          {t("todos")}
        </button>
        {allGames.map(game => (
          <button 
            key={game} 
            onClick={() => setFilter(game)} 
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors ${filter === game ? "text-background" : "bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-2"}`}
            style={filter === game ? { background: "var(--accent-grad)" } : {}}
          >
            {game}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Columna Principal (Directo y Próximos) */}
        <div className="flex-1 flex flex-col gap-8">
          
          {/* EN DIRECTO */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  {filteredLive.length > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${filteredLive.length > 0 ? "bg-red-500" : "bg-muted/50"}`}></span>
                </span>
                <h3 className="font-heading font-bold text-xl uppercase tracking-wide">{t("enDirecto")} {filteredLive.length > 0 ? `(${filteredLive.length})` : ""}</h3>
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              {filteredLive.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-xl border-border bg-surface text-muted text-sm font-medium">
                  {t("sinPartidosDirecto", { juego: filter === "Todos" ? t("ningunJuego") : filter })}
                </div>
              ) : (
                filteredLive.map((match) => (
                  <div key={match.id} className="rounded-2xl border border-border bg-surface p-6 shadow-lg overflow-hidden relative group transition-all hover:border-[rgb(var(--accent-rgb)/0.5)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr] items-center gap-6">
                      
                      {/* Left: Info */}
                      <div className="flex flex-col items-center sm:items-start justify-center w-full">
                        <span className="text-[0.6875rem] font-bold text-muted uppercase tracking-wider mb-1 text-center sm:text-left line-clamp-2">{match.game} • {match.league}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-2 border border-border inline-block">{match.format}</span>
                      </div>
                      
                      {/* Center: Teams & Score */}
                      <div className="flex items-center justify-center gap-4 sm:gap-6 min-w-[280px]">
                        <div className="flex flex-col items-center gap-2 w-[80px]">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center p-2 border border-border shadow-sm">
                            <img src={getLogo(match.team1.logo)} alt={match.team1.name} className="max-w-full max-h-full object-contain" />
                          </div>
                          <span className="font-bold text-xs sm:text-sm text-center line-clamp-1 w-full">{match.team1.name}</span>
                        </div>
                        
                        <div className="flex flex-col items-center px-2">
                          <div className="text-2xl sm:text-3xl font-heading font-black tracking-widest text-foreground whitespace-nowrap">
                            {match.team1.score} - {match.team2.score}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-center gap-2 w-[80px]">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center p-2 border border-border shadow-sm">
                            <img src={getLogo(match.team2.logo)} alt={match.team2.name} className="max-w-full max-h-full object-contain" />
                          </div>
                          <span className="font-bold text-xs sm:text-sm text-center line-clamp-1 w-full">{match.team2.name}</span>
                        </div>
                      </div>
                      
                      {/* Right: Twitch */}
                      <div className="mt-4 sm:mt-0 flex flex-col items-center sm:items-end justify-center w-full">
                        {match.streamUrl ? (
                          <a 
                            href={match.streamUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-[#9146FF] hover:bg-[#a970ff] text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow hover:-translate-y-0.5 w-[140px] justify-center"
                          >
                            <SiTwitch size={16} />
                            {t("twitch")}
                          </a>
                        ) : (
                          <span className="text-xs text-muted font-medium bg-surface-2 px-3 py-1.5 rounded-lg border border-border inline-block">{t("sinStream")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* PRÓXIMOS PARTIDOS */}
          <section>
            <div className="mb-4">
              <h3 className="font-heading font-bold text-xl uppercase tracking-wide">{t("proximosPartidos")}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredUpcoming.length === 0 ? (
                <div className="col-span-1 sm:col-span-2 p-6 text-center border border-dashed rounded-xl border-border bg-surface text-muted text-sm">
                  {t("sinPartidosProgramados")}
                </div>
              ) : (
                filteredUpcoming.map((match) => {
                  const d = new Date(match.date);
                  const isToday = d.toDateString() === new Date().toDateString();
                  const isTomorrow = d.toDateString() === new Date(Date.now() + 86400000).toDateString();

                  let dateString = d.toLocaleDateString(localeTag, { day: "numeric", month: "short" });
                  if (isToday) dateString = t("hoy");
                  if (isTomorrow) dateString = t("manana");

                  return (
                    <div key={match.id} className="rounded-xl border border-border bg-surface p-4 flex flex-col hover:bg-surface-2 transition-colors cursor-default">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[0.625rem] font-bold text-muted uppercase tracking-wider bg-surface-2 px-2 py-1 rounded border border-border">{match.game} • {match.league}</span>
                        <span className="text-xs font-semibold text-[rgb(var(--accent-rgb))] bg-[rgb(var(--accent-rgb)/0.1)] px-2 py-1 rounded-md">
                          {dateString} - {d.toLocaleTimeString(localeTag, { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-bold text-sm">
                        <div className="flex items-center gap-2 w-[40%]">
                          <img src={getLogo(match.team1.logo)} alt="" className="w-5 h-5 object-contain bg-white rounded-sm" />
                          <span className="truncate">{match.team1.name}</span>
                        </div>
                        <span className="text-muted/50 text-xs w-[10%] text-center">{t("vs")}</span>
                        <div className="flex items-center justify-end gap-2 w-[40%] text-right">
                          <span className="truncate">{match.team2.name}</span>
                          <img src={getLogo(match.team2.logo)} alt="" className="w-5 h-5 object-contain bg-white rounded-sm" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Columna Secundaria (Resultados) */}
        <div className="w-full lg:w-[340px] shrink-0">
          <section className="h-full flex flex-col">
            <div className="mb-4">
              <h3 className="font-heading font-bold text-xl uppercase tracking-wide">{t("ultimosResultados")}</h3>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 flex-1 shadow-sm">
              {filteredPast.length === 0 ? (
                <div className="p-4 text-center text-muted text-sm">
                  {t("sinResultadosRecientes")}
                </div>
              ) : (
                filteredPast.map((res) => {
                  const winner1 = res.team1.score > res.team2.score;
                  const winner2 = res.team2.score > res.team1.score;
                  return (
                    <div key={res.id} className="flex flex-col p-3 rounded-xl hover:bg-surface-2 transition-colors border border-transparent hover:border-border cursor-default bg-background/50">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[0.625rem] font-bold text-muted uppercase tracking-wider">{res.game} • {res.league}</span>
                        <span className="text-[0.625rem] font-semibold text-muted bg-surface px-1.5 py-0.5 rounded border border-border">{new Date(res.date).toLocaleDateString(localeTag, { day: "numeric", month: "short" })}</span>
                      </div>
                      <div className="flex flex-col gap-2 text-sm font-bold">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <img src={getLogo(res.team1.logo)} alt="" className="w-4 h-4 object-contain bg-white rounded-sm opacity-90" />
                            <span className={winner1 ? "text-foreground" : "text-muted"}>{res.team1.name}</span>
                          </div>
                          <span className={winner1 ? "text-foreground" : "text-muted"}>{res.team1.score}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <img src={getLogo(res.team2.logo)} alt="" className="w-4 h-4 object-contain bg-white rounded-sm opacity-90" />
                            <span className={winner2 ? "text-foreground" : "text-muted"}>{res.team2.name}</span>
                          </div>
                          <span className={winner2 ? "text-foreground" : "text-muted"}>{res.team2.score}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
