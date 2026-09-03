"use client";

import { useState, useTransition } from "react";
import { voteDifficultyAction } from "@/app/actions";

const ETIQUETAS = ["Regalado", "Fácil", "Media", "Difícil", "Brutal"];

/**
 * Voto de la comunidad sobre lo dura que es la campaña, junto a la nota media
 * (`CommunityRating`, que puntúa si el juego es BUENO) y a la dificultad
 * estimada por rareza (`lib/difficulty.ts`, que sale del platino). Tres
 * señales distintas a propósito: rareza mezcla duración y abandono, la nota
 * no dice nada de lo duro que es, y esta es la única que viene de gente que
 * dice "a mí esto me costó X".
 */
export function CommunityDifficulty({
  gameId,
  media,
  votos,
  miVoto,
  puedeVotar,
}: {
  gameId: string;
  media: number | null;
  votos: number;
  /** El voto que ya puso este usuario, si lo puso. */
  miVoto: number | null;
  /** Solo quien tiene el juego en su biblioteca puede votar. */
  puedeVotar: boolean;
}) {
  const [valorLocal, setValorLocal] = useState(miVoto);
  const [pending, startTransition] = useTransition();
  const [hover, setHover] = useState<number | null>(null);

  const mostrado = hover ?? valorLocal ?? Math.round(media ?? 0);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2.5">
        <span
          className="flex items-center gap-1"
          onMouseLeave={() => setHover(null)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={!puedeVotar || pending}
              aria-label={`Votar dificultad ${n} de 5: ${ETIQUETAS[n - 1]}`}
              className="transition-transform hover:scale-110 active:scale-95 disabled:cursor-default disabled:hover:scale-100"
              onMouseEnter={() => puedeVotar && setHover(n)}
              onClick={() => {
                if (!puedeVotar) return;
                setValorLocal(n);
                startTransition(() => {
                  voteDifficultyAction(gameId, n);
                });
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={n <= mostrado ? "#e2725b" : "var(--muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="13 2 13 9 20 9" />
                <path d="M4 4h9l7 7v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill={n <= mostrado ? "#e2725b" : "none"} />
              </svg>
            </button>
          ))}
        </span>

        {media != null ? (
          <>
            <span className="font-heading text-[15px] font-bold">{media.toFixed(1).replace(".", ",")}</span>
            <span className="text-[13px] text-muted">
              {votos} {votos === 1 ? "voto" : "votos"} de dificultad
            </span>
          </>
        ) : (
          <span className="text-[13px] text-muted">Nadie ha votado la dificultad todavía.</span>
        )}
      </div>

      {puedeVotar && (
        <p className="text-xs text-muted">
          {valorLocal ? `Votaste: ${ETIQUETAS[valorLocal - 1]}` : "Vota lo dura que te pareció."}
        </p>
      )}
    </div>
  );
}
