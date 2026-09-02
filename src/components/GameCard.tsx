/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { coverGradient, relativeDate } from "@/lib/design";
import { gameProgress } from "@/lib/stats";
import type { Game } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

/**
 * Tarjeta de juego con carátula grande, a la manera de la biblioteca de la
 * maqueta. Si PSN no da icono (pasa con algunos juegos viejos), cae en un
 * degradado propio del juego en vez de un cuadrado gris: se sigue pudiendo
 * distinguir un juego de otro de un vistazo.
 */
export function GameCard({ game, href }: { game: Game; href: string }) {
  const progress = gameProgress(game);
  const played = relativeDate(game.lastPlayedAt);

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-[18px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <div
        className="relative flex aspect-video items-end p-3.5"
        style={{ background: coverGradient(game.id) }}
      >
        {/*
          Las carátulas llegan con proporciones distintas: las de PSN son
          cuadradas y las de Steam panorámicas. En un marco 16:9, recortarlas
          (`cover`) deja las cuadradas con un zoom brutal, y encajarlas
          (`contain`) las deja pequeñas entre bandas negras. Así que se hacen
          las dos cosas: una copia desenfocada rellena el marco y la imagen de
          verdad va encima entera. Todos los juegos quedan al mismo tamaño y
          ninguno se recorta.
        */}
        {game.iconUrl && (
          <>
            <img
              src={game.iconUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
            />
            <img
              src={game.iconUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
            />
          </>
        )}

        {/* Gradiente para asegurar legibilidad del texto sin importar la carátula */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

        <span
          className="font-heading relative text-lg font-bold leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
          style={{ textShadow: "0 2px 14px rgba(0, 0, 0, 0.8)" }}
        >
          {game.title}
        </span>

        <span className="absolute right-3 top-3" style={{ backdropFilter: "blur(6px)" }}>
          <StatusBadge status={progress.status} />
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            {game.deviceLabel}
            {played && ` · ${played}`}
          </span>
          <span>
            {progress.earned}/{progress.total}
          </span>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress.percent}%`,
              background: progress.platinumEarned
                ? "linear-gradient(90deg, #7fbcd8, #dff0f8)"
                : "linear-gradient(90deg, #4a9eff, #9fd4ec)",
            }}
          />
        </div>

        <div className="mt-2.5 flex items-center gap-2.5">
          <span className="font-heading text-[15px] font-bold" style={{ color: "#cfe4ff" }}>
            {progress.percent}%
          </span>
          {game.rating != null && (
            <span className="flex items-center gap-0.5 ml-auto mr-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg
                  key={s}
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill={s <= game.rating! ? "#f59e0b" : "none"}
                  stroke={s <= game.rating! ? "#f59e0b" : "#8794a8"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
            </span>
          )}
          <span className={`flex items-center gap-1.5 text-muted ${game.rating != null ? "" : "ml-auto"}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M7 4h10v5a5 5 0 0 1-10 0V4Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path d="M12 14v3m-3.5 3h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.06em]">
              {progress.earned} trofeos
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
