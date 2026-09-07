"use client";

import { useState } from "react";
import { gradeLabel, TrophyTile, TrophyTypeIcon } from "@/components/TrophyIcon";
import { colorFor, rarity, relativeDate } from "@/lib/design";
import { clasificarTrofeo } from "@/lib/trophyType";
import { trophyScore } from "@/lib/trophyScore";
import type { Platform, Trophy, TrophyGrade } from "@/lib/types";
import { TrophyGuideModal } from "./TrophyGuideModal";
import { TrophyTree } from "./TrophyTree";

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
  const [view, setView] = useState<"lista" | "cuadricula" | "arbol">("lista");
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
          <ViewButton active={view === "arbol"} onClick={() => setView("arbol")} label="Árbol">
            <circle cx="12" cy="5" r="2" />
            <circle cx="5" cy="19" r="2" />
            <circle cx="19" cy="19" r="2" />
            <line x1="12" y1="7" x2="12" y2="12" />
            <line x1="12" y1="12" x2="5" y2="17" />
            <line x1="12" y1="12" x2="19" y2="17" />
          </ViewButton>
        </div>
      </div>

      {view === "arbol" ? (
        <div className="rounded-[20px] bg-[#0a0d14] border border-[#1f2937] shadow-lg mb-8 overflow-hidden">
          <TrophyTree trophies={trophies} platform={platform} onTrophyClick={setActiveTrophy} />
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(groups.values()).map((g) => (
            <div key={g.name} className="space-y-3">
              {groups.size > 1 && (
                <h3 className="px-4 text-xs font-bold uppercase tracking-[0.15em] text-muted sm:px-0">
                  {g.name}
                </h3>
              )}
              {view === "lista" ? (
                <div className="divide-y divide-border rounded-xl border border-border bg-surface-2 px-3 sm:px-4">
                  {g.trophies.map((t) => (
                    <FilaLista key={t.id} trophy={t} platform={platform} onClick={() => setActiveTrophy(t)} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2 sm:gap-3">
                  {g.trophies.map((t) => (
                    <TarjetaCuadricula key={t.id} trophy={t} platform={platform} onClick={() => setActiveTrophy(t)} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
      <TrophyPhoto trophy={trophy} size={48} />

      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[0.9375rem] font-semibold">
          {oculto ? "Trofeo oculto" : trophy.name}
          {tipo && (
            <span className="flex items-center justify-center text-muted">
              <TrophyTypeIcon tipo={tipo} />
            </span>
          )}
          {trophy.isMissable && (
            <span
              className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.03em]"
              style={{ background: "rgba(226, 181, 62, 0.14)", color: "#e2b53e", border: "1px solid rgba(226, 181, 62, 0.3)" }}
              title="Se puede quedar sin conseguir para siempre si no se hace en el momento adecuado"
            >
              {/* Un tick, no un triángulo de aviso: no es un peligro, es un
                  aviso de "atento, esto tiene ventana" — mismo lenguaje que
                  una casilla marcada. */}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Perdible
            </span>
          )}
        </p>
        {!oculto && trophy.detail && (
          <p className="mt-1 text-[0.8125rem] text-muted">{trophy.detail}</p>
        )}
      </div>

      <span className="hidden sm:block">
        <span
          className="block text-[0.6875rem] font-bold uppercase tracking-[0.1em]"
          style={{ color: colorFor(trophy.grade) }}
        >
          {gradeLabel(trophy.grade)}
        </span>
        {puntos !== null && <span className="text-[0.625rem] text-muted">{puntos} pts</span>}
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
      {trophy.isMissable && (
        <span
          className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.03em]"
          style={{ background: "rgba(226, 181, 62, 0.14)", color: "#e2b53e", border: "1px solid rgba(226, 181, 62, 0.3)" }}
          title="Se puede quedar sin conseguir para siempre si no se hace en el momento adecuado"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Perdible
        </span>
      )}

      <TrophyPhoto trophy={trophy} size={64} />

      <p className="mt-3 line-clamp-2 text-[0.8125rem] font-semibold">
        {oculto ? "Trofeo oculto" : trophy.name}
      </p>

      <span
        className="mt-1.5 text-[0.625rem] font-bold uppercase tracking-[0.1em]"
        style={{ color: colorFor(trophy.grade) }}
      >
        {gradeLabel(trophy.grade)}
      </span>
      {puntos !== null && <span className="text-[0.625rem] text-muted">{puntos} pts</span>}

      {r && (
        <span
          className="mt-2 rounded-full px-2 py-0.5 text-[0.625rem] font-bold"
          style={{ background: r.bg, color: r.fg }}
        >
          {trophy.rarityPercent!.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

/**
 * La foto real del logro (la que da PSN/Steam) siempre que exista — el
 * cuadrado de color por metal (`TrophyTile`) es el respaldo para cuando de
 * verdad no hay icono, no la primera opción. Exportada porque también la
 * necesitan `u/[handle]/[gameId]/page.tsx` ("Próximos pasos") y
 * `RecentTrophies.tsx` ("Últimos trofeos" del perfil): las dos enseñaban el
 * cuadrado de color a secas incluso cuando el trofeo sí tenía foto.
 *
 * El tipo acepta cualquier objeto con `iconUrl`/`grade` (no exige un
 * `Trophy` completo con id/nombre/earned...) porque `ultimosTrofeos()`
 * (lib/history.ts) no trae la fila entera de un `Trophy`, solo lo que hace
 * falta para pintarlo.
 */
export function TrophyPhoto({
  trophy,
  size,
}: {
  trophy: { iconUrl?: string | null; grade?: TrophyGrade | null };
  size: number;
}) {
  if (!trophy.iconUrl) return <TrophyTile grade={trophy.grade ?? undefined} size={size} />;

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
