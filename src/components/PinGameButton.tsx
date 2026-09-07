"use client";

import { useState, useTransition } from "react";
import { togglePinGameAction } from "@/app/actions";

/**
 * Botón de "anclar como objetivo actual" — solo se enseña en tu propia
 * biblioteca (`esMio`, ver LibraryGrid.tsx), nunca en la de quien visitas:
 * la mutación real ya está protegida en el servidor (`togglePinGameAction`
 * solo toca filas de `userGames.userId = quien ha iniciado sesión`), pero no
 * tiene sentido ofrecerle a un visitante un botón que solo puede mover SU
 * propio anclado, no el del perfil que está mirando.
 *
 * Optimista y sin esperar respuesta para pintarse (mismo patrón que
 * `RatingStars`): al venir de una lista, `pinned` puede referirse a
 * cualquier juego de la tarjeta — si el usuario ancla uno nuevo, el
 * anterior se desancla en el servidor pero esta tarjeta concreta no se
 * entera hasta que la página se revalida (`revalidatePath` en la acción),
 * así que puede quedar "pinneada" en pantalla un instante de más. Preferible
 * a bloquear el click esperando una respuesta de red.
 */
export function PinGameButton({ gameId, pinned: pinnedInicial }: { gameId: string; pinned: boolean }) {
  const [pinned, setPinned] = useState(pinnedInicial);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      title={pinned ? "Quitar como objetivo actual" : "Anclar como objetivo actual — se verá en tu perfil"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setPinned((p) => !p);
        startTransition(async () => {
          const r = await togglePinGameAction(gameId);
          setPinned(r.pinned);
        });
      }}
      className="flex h-7 w-7 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 focus:outline-none"
      style={{
        background: pinned ? "rgba(226, 181, 62, 0.85)" : "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(6px)",
        border: pinned ? "1px solid rgba(226, 181, 62, 0.9)" : "1px solid rgba(255,255,255,0.15)",
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill={pinned ? "#0b0d10" : "none"}
        stroke={pinned ? "#0b0d10" : "white"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 17v5" />
        <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
      </svg>
    </button>
  );
}
