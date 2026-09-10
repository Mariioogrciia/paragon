"use client";

import { useState, useTransition } from "react";
import { toggleReservarHitoAction } from "@/app/actions";

/**
 * "Reservar para el hito #X" — Cerrojo de Hitos (lib/milestones.ts). Mismo
 * patrón optimista que `PinGameButton`: se pinta al momento, sin esperar la
 * respuesta del servidor.
 */
export function ReservarHitoButton({ gameId, numero, reservadoInicial }: { gameId: string; numero: number; reservadoInicial: boolean }) {
  const [reservado, setReservado] = useState(reservadoInicial);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        setReservado((r) => !r);
        startTransition(async () => {
          const r = await toggleReservarHitoAction(gameId);
          setReservado(r.reservado);
        });
      }}
      title={reservado ? "Quitar la reserva de este hito" : `Reservar este juego para tu platino #${numero}`}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-80"
      style={
        reservado
          ? { background: "rgba(226, 181, 62, 0.16)", border: "1px solid rgba(226, 181, 62, 0.4)", color: "#e2b53e" }
          : { background: "var(--surface-2)", border: "1px solid transparent", color: "var(--muted)" }
      }
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={reservado ? "#e2b53e" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
      </svg>
      {reservado ? `Reservado para el #${numero}` : `Reservar para el #${numero}`}
    </button>
  );
}
