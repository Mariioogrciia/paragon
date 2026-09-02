/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { coverGradient, monogram, relativeDate } from "@/lib/design";
import { gameProgress } from "@/lib/stats";
import type { Game } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

/**
 * Fila compacta de juego, como "Jugado recientemente" del panel: icono
 * pequeño, barra de progreso en línea y estado a la derecha. Para la
 * cuadrícula de la biblioteca completa se usa GameCard en su lugar.
 */
export function GameRow({ game, href }: { game: Game; href: string }) {
  const progress = gameProgress(game);
  const played = relativeDate(game.lastPlayedAt);

  return (
    <Link
      href={href}
      className="grid w-full items-center gap-4 border-b border-border px-4 py-3.5 last:border-0 hover:bg-surface-2/40 sm:gap-[18px] sm:px-[18px]"
      style={{ gridTemplateColumns: "52px 1fr" }}
    >
      <span
        className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-xl"
        style={{ background: coverGradient(game.id) }}
      >
        {game.iconUrl ? (
          <img src={game.iconUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-heading text-[15px] font-bold text-white">{monogram(game.title)}</span>
        )}
      </span>

      <span className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_180px_110px_70px] sm:gap-[18px]">
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold">{game.title}</span>
          <span className="mt-0.5 block text-xs text-muted">
            {game.deviceLabel}
            {played && ` · ${played}`}
          </span>
        </span>

        <span className="hidden items-center gap-3 sm:flex">
          <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${progress.percent}%`,
                background: progress.platinumEarned
                  ? "linear-gradient(90deg, #7fbcd8, #dff0f8)"
                  : "linear-gradient(90deg, #4a9eff, #9fd4ec)",
              }}
            />
          </span>
          <span className="w-9 shrink-0 text-right text-xs font-bold">{progress.percent}%</span>
        </span>

        <span className="hidden justify-self-start sm:block">
          <StatusBadge status={progress.status} />
        </span>

        <span className="hidden text-right text-xs text-muted sm:block">
          {progress.earned}/{progress.total}
        </span>
      </span>
    </Link>
  );
}
