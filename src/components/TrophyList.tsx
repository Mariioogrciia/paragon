"use client";

import { useState } from "react";
import { gradeLabel, TrophyTile, TrophyTypeIcon } from "@/components/TrophyIcon";
import { colorFor, rarity, relativeDate } from "@/lib/design";
import { clasificarTrofeo } from "@/lib/trophyType";
import { trophyScore } from "@/lib/trophyScore";
import type { Platform, Trophy } from "@/lib/types";
import { TrophyGuideModal } from "./TrophyGuideModal";

/**
 * Todos los logros de un juego, en lista o en cuadrícula.
 *
 * La lista es la vista de trabajo: se lee de un vistazo qué queda y de qué
 * tipo es cada cosa. La cuadrícula es la vitrina: iconos grandes, para mirar
 * lo conseguido. Por eso la que manda por defecto sigue siendo la lista.
 */
export function TrophyList({
  trophies,
  gameTitle,
  gameId,
  platform,
  esMio,
  showcaseTrophies,
}: {
  trophies: Trophy[];
  gameTitle: string;
  gameId?: string;
  /** Para el XP de Paragon Score de cada fila (lib/trophyScore.ts) — sin
   * esto no hay forma de saber si un trofeo sin `grade` es de Steam o de
   * Xbox, que se puntúan distinto. */
  platform?: Platform;
  esMio?: boolean;
  showcaseTrophies?: { gameId: string, trophyId: string }[];
}) {
  const [view, setView] = useState<"lista" | "cuadricula">("lista");
  const [activeTrophy, setActiveTrophy] = useState<Trophy | null>(null);

  const groups = new Map<string, { name: string; trophies: Trophy[] }>();
  for (const t of trophies) {
    const gId = t.groupId || "default";
    if (!groups.has(gId)) {
      groups.set(gId, {
        name: t.groupName || (gId === "default" ? "Juego Base" : "Expansión"),
        trophies: [],
      });
    }
    groups.get(gId)!.trophies.push(t);
  }

  // Convert to array and put "default" first.
  const groupList = Array.from(groups.values()).sort((a, b) => {
    if (a.name === "Juego Base") return -1;
    if (b.name === "Juego Base") return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div
          className="inline-flex gap-1 rounded-[10px] p-1"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <ViewButton active={view === "lista"} onClick={() => setView("lista")} label="Lista">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </ViewButton>
          <ViewButton
            active={view === "cuadricula"}
            onClick={() => setView("cuadricula")}
            label="Cuadrícula"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </ViewButton>
        </div>
      </div>

      <div className="space-y-8">
        {groupList.map((group, idx) => (
          <div key={idx} className="space-y-3">
            {groupList.length > 1 && (
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted ml-2">
                {group.name}
              </h3>
            )}
            
            {view === "lista" ? (
              <ul
                className="overflow-hidden rounded-[18px]"
                style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
              >
                {group.trophies.map((t) => (
                  <FilaLista key={t.id} trophy={t} platform={platform} onClick={() => setActiveTrophy(t)} />
                ))}
              </ul>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {group.trophies.map((t) => (
                  <TarjetaCuadricula key={t.id} trophy={t} platform={platform} onClick={() => setActiveTrophy(t)} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {activeTrophy && (
        <TrophyGuideModal 
          gameTitle={gameTitle} 
          gameId={gameId}
          trophy={activeTrophy} 
          esMio={esMio}
          isPinned={showcaseTrophies?.some(t => t.gameId === gameId && t.trophyId === activeTrophy.id)}
          onClose={() => setActiveTrophy(null)} 
        />
      )}
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className="rounded-md p-1.5 transition-colors"
      style={
        active
          ? { background: "rgb(var(--accent-rgb) / 0.16)", color: "var(--accent-text)" }
          : { background: "transparent", color: "var(--muted)" }
      }
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}

function FilaLista({ trophy, platform, onClick }: { trophy: Trophy, platform?: Platform, onClick: () => void }) {
  const oculto = trophy.hidden && !trophy.earned;
  const tipo = clasificarTrofeo(trophy);
  const puntos = platform
    ? trophyScore({ platform, grade: trophy.grade, xp: trophy.xp, rarityPercent: trophy.rarityPercent })
    : null;

  return (
    <li
      onClick={onClick}
      className="grid grid-cols-[48px_1fr] items-center gap-4 border-b border-border px-4 py-3.5 last:border-0 sm:grid-cols-[48px_1fr_100px_90px] sm:gap-[18px] sm:px-[18px] cursor-pointer hover:bg-white/5 transition-colors"
      style={{ opacity: trophy.earned ? 1 : 0.42 }}
    >
      <Icono trophy={trophy} size={48} />

      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[15px] font-semibold">
          {oculto ? "Trofeo oculto" : trophy.name}
          {tipo && (
            <span className="shrink-0 text-muted">
              <TrophyTypeIcon tipo={tipo} />
            </span>
          )}
        </p>
        {!oculto && trophy.detail && (
          <p className="mt-1 text-[13px] text-muted">{trophy.detail}</p>
        )}
      </div>

      <span className="hidden sm:block">
        <span
          className="block text-[11px] font-bold uppercase tracking-[0.1em]"
          style={{ color: colorFor(trophy.grade) }}
        >
          {gradeLabel(trophy.grade)}
        </span>
        {puntos !== null && <span className="text-[10px] text-muted">{puntos} pts</span>}
      </span>
      <span className="hidden text-right text-xs text-muted sm:block">
        {trophy.earnedAt ? relativeDate(trophy.earnedAt) : "—"}
      </span>
    </li>
  );
}

function TarjetaCuadricula({ trophy, platform, onClick }: { trophy: Trophy, platform?: Platform, onClick: () => void }) {
  const oculto = trophy.hidden && !trophy.earned;
  const r = trophy.rarityPercent !== undefined ? rarity(trophy.rarityPercent) : null;
  const tipo = clasificarTrofeo(trophy);
  const puntos = platform
    ? trophyScore({ platform, grade: trophy.grade, xp: trophy.xp, rarityPercent: trophy.rarityPercent })
    : null;

  return (
    <div
      onClick={onClick}
      className="relative flex flex-col items-center rounded-[14px] p-4 text-center cursor-pointer hover:scale-[1.02] transition-transform hover:bg-white/5"
      style={{
        border: "1px solid var(--border)",
        background: "var(--surface)",
        opacity: trophy.earned ? 1 : 0.42,
      }}
    >
      {tipo && (
        <span
          className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full text-muted"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          <TrophyTypeIcon tipo={tipo} size={13} />
        </span>
      )}

      <Icono trophy={trophy} size={64} />

      <p className="mt-3 line-clamp-2 text-[13px] font-semibold">
        {oculto ? "Trofeo oculto" : trophy.name}
      </p>

      <span
        className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.1em]"
        style={{ color: colorFor(trophy.grade) }}
      >
        {gradeLabel(trophy.grade)}
      </span>
      {puntos !== null && <span className="text-[10px] text-muted">{puntos} pts</span>}

      {r && (
        <span
          className="mt-2 rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ background: r.bg, color: r.fg }}
        >
          {trophy.rarityPercent!.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

/* eslint-disable-next-line @next/next/no-img-element */
function Icono({ trophy, size }: { trophy: Trophy; size: number }) {
  if (!trophy.iconUrl) return <TrophyTile grade={trophy.grade} size={size} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={trophy.iconUrl}
      alt=""
      className="shrink-0 object-cover"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.27) }}
    />
  );
}
