"use client";

import { useState } from "react";
import { gradeLabel, TrophyTile } from "@/components/TrophyIcon";
import { colorFor, rarity, relativeDate } from "@/lib/design";
import type { Trophy } from "@/lib/types";
import { TrophyGuideModal } from "./TrophyGuideModal";

/**
 * Todos los logros de un juego, en lista o en cuadrícula.
 *
 * La lista es la vista de trabajo: se lee de un vistazo qué queda y de qué
 * tipo es cada cosa. La cuadrícula es la vitrina: iconos grandes, para mirar
 * lo conseguido. Por eso la que manda por defecto sigue siendo la lista.
 */
export function TrophyList({ trophies, gameTitle }: { trophies: Trophy[], gameTitle: string }) {
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
                  <FilaLista key={t.id} trophy={t} onClick={() => setActiveTrophy(t)} />
                ))}
              </ul>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {group.trophies.map((t) => (
                  <TarjetaCuadricula key={t.id} trophy={t} onClick={() => setActiveTrophy(t)} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {activeTrophy && (
        <TrophyGuideModal 
          gameTitle={gameTitle} 
          trophy={activeTrophy} 
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

function FilaLista({ trophy, onClick }: { trophy: Trophy, onClick: () => void }) {
  const oculto = trophy.hidden && !trophy.earned;

  return (
    <li
      onClick={onClick}
      className="grid grid-cols-[48px_1fr] items-center gap-4 border-b border-border px-4 py-3.5 last:border-0 sm:grid-cols-[48px_1fr_100px_90px] sm:gap-[18px] sm:px-[18px] cursor-pointer hover:bg-white/5 transition-colors"
      style={{ opacity: trophy.earned ? 1 : 0.42 }}
    >
      <Icono trophy={trophy} size={48} />

      <div className="min-w-0">
        <p className="text-[15px] font-semibold">{oculto ? "Trofeo oculto" : trophy.name}</p>
        {!oculto && trophy.detail && (
          <p className="mt-1 text-[13px] text-muted">{trophy.detail}</p>
        )}
      </div>

      <span
        className="hidden text-[11px] font-bold uppercase tracking-[0.1em] sm:block"
        style={{ color: colorFor(trophy.grade) }}
      >
        {gradeLabel(trophy.grade)}
      </span>
      <span className="hidden text-right text-xs text-muted sm:block">
        {trophy.earnedAt ? relativeDate(trophy.earnedAt) : "—"}
      </span>
    </li>
  );
}

function TarjetaCuadricula({ trophy, onClick }: { trophy: Trophy, onClick: () => void }) {
  const oculto = trophy.hidden && !trophy.earned;
  const r = trophy.rarityPercent !== undefined ? rarity(trophy.rarityPercent) : null;

  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center rounded-[14px] p-4 text-center cursor-pointer hover:scale-[1.02] transition-transform hover:bg-white/5"
      style={{
        border: "1px solid var(--border)",
        background: "var(--surface)",
        opacity: trophy.earned ? 1 : 0.42,
      }}
    >
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
