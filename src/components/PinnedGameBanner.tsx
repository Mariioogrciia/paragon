import Link from "next/link";
import type { Game } from "@/lib/types";
import { coverGradient } from "@/lib/design";

/**
 * Banner del "objetivo actual" en el perfil — el juego que su dueño ha
 * anclado (ver `togglePinGameAction`). Deliberadamente FUERA de las
 * secciones reordenables de `profileSections.ts`: es un aviso de "esto es
 * lo que estoy jugando AHORA", tiene sentido que sea siempre lo primero que
 * se ve, no algo que se pueda enterrar reordenando. Se pinta igual para el
 * dueño que para quien visita — es precisamente a la visita a quien va
 * dirigido el aviso.
 */
export function PinnedGameBanner({ game, handle }: { game: Game; handle: string }) {
  const href = `/u/${handle}/${game.id}`;
  const faltan = Math.max(0, game.definedTotal - game.earnedTotal);

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 overflow-hidden rounded-2xl p-4 transition-all hover:-translate-y-0.5"
      style={{
        border: "1px solid rgba(226, 181, 62, 0.35)",
        background: "linear-gradient(90deg, rgba(226, 181, 62, 0.1), var(--surface))",
      }}
    >
      <div
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl"
        style={{ background: coverGradient(game.id) }}
      >
        {game.iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.iconUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.08em]"
          style={{ color: "#e2b53e" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 17v5" />
            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
          </svg>
          A por este platino ahora
        </p>
        <p className="mt-0.5 truncate font-heading text-lg font-bold">{game.title}</p>
        <p className="mt-0.5 text-xs text-muted">
          {game.progressPercent}% · {faltan > 0 ? `faltan ${faltan} trofeos` : "¡a un paso!"}
        </p>
      </div>

      <div
        className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold sm:flex"
        style={{ border: "3px solid rgba(226, 181, 62, 0.4)", color: "#e2b53e" }}
      >
        {game.progressPercent}%
      </div>
    </Link>
  );
}
