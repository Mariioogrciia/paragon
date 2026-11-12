"use client";

import { useState, useTransition } from "react";
import { cambiarRetiradoAction } from "@/app/actions/retirados";
import { ToggleChip } from "@/components/ToggleChip";

/**
 * Tus marcas en la ficha de un juego (8 nov 2026, lib/retirados.ts):
 * «Instalado» (para filtrar «A un paso del platino» por lo que tienes
 * instalado ahora), «Oculto en tu perfil» (no se ve en tu perfil público,
 * pero cuenta para ti) y, si lo tienes reservado, la fecha objetivo del
 * platino con la cuenta atrás. Los textos llegan traducidos del servidor.
 */
export function MarcasJuego({
  gameId,
  instaladoInicial,
  ocultoInicial,
  reservado,
  fechaInicial,
  cazaInicial = false,
  platinado = false,
  textos,
}: {
  gameId: string;
  instaladoInicial: boolean;
  ocultoInicial: boolean;
  reservado: boolean;
  fechaInicial: string | null;
  /** En «Mis cazas» (12 nov 2026). Con el juego ya platinado no sale el botón. */
  cazaInicial?: boolean;
  platinado?: boolean;
  textos: { caza: string; cazaActiva: string; cazaAyuda: string; cazaLlena: string; instalado: string; instaladoAyuda: string; oculto: string; ocultoTitulo: string; fecha: string; quedan: string; queda1: string; hoy: string; tarde: string; tarde1: string; quitarFecha: string };
}) {
  const [instalado, setInstalado] = useState(instaladoInicial);
  const [caza, setCaza] = useState(cazaInicial);
  const [cazaLlena, setCazaLlena] = useState(false);
  const [oculto, setOculto] = useState(ocultoInicial);
  const [fecha, setFecha] = useState(fechaInicial ?? "");
  const [, empezar] = useTransition();

  // Días hasta el final del día objetivo (negativo: ya pasó). Mismo cálculo que diasHastaObjetivo.
  const dias = fecha ? Math.ceil((new Date(`${fecha}T23:59:59Z`).getTime() - new Date().getTime()) / 86_400_000) : null;
  const cuenta =
    dias === null ? null : dias > 1 ? textos.quedan.replace("{n}", String(dias)) : dias === 1 ? textos.queda1 : dias === 0 ? textos.hoy : dias === -1 ? textos.tarde1 : textos.tarde.replace("{n}", String(-dias));

  return (
    <div className="mt-3">
    <div className="flex flex-wrap items-center gap-3">
      {!platinado && (
        <ToggleChip
          active={caza}
          size="md"
          title={textos.cazaAyuda}
          onClick={() => {
            const nueva = !caza;
            setCaza(nueva);
            setCazaLlena(false);
            empezar(async () => {
              const { ok } = await cambiarRetiradoAction("caza", gameId, nueva);
              // Llena (MAX_CAZAS): vuelve a como estaba y se explica debajo.
              if (!ok && nueva) {
                setCaza(false);
                setCazaLlena(true);
              }
            });
          }}
        >
          🎯 {caza ? textos.cazaActiva : textos.caza}
        </ToggleChip>
      )}
      <ToggleChip
        active={instalado}
        size="md"
        title={textos.instaladoAyuda}
        onClick={() => {
          setInstalado(!instalado);
          empezar(() => void cambiarRetiradoAction("instalado", gameId, !instalado));
        }}
      >
        💾 {textos.instalado}
      </ToggleChip>
      <ToggleChip
        active={oculto}
        size="md"
        title={textos.ocultoTitulo}
        onClick={() => {
          setOculto(!oculto);
          empezar(() => void cambiarRetiradoAction("oculto_perfil", gameId, !oculto));
        }}
      >
        🙈 {textos.oculto}
      </ToggleChip>
      {reservado && (
        <label className="flex items-center gap-2 text-xs font-semibold text-muted">
          🎯 {textos.fecha}
          <input
            type="date"
            value={fecha}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => {
              const v = e.target.value;
              setFecha(v);
              empezar(() => void cambiarRetiradoAction("fecha_objetivo", v || "-", Boolean(v)));
            }}
            className="rounded-lg px-2 py-1 text-xs text-foreground"
            style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
          />
          {cuenta && <span className={dias !== null && dias < 0 ? "font-bold text-[var(--danger)]" : "font-bold text-[var(--accent-text)]"}>{cuenta}</span>}
          {fecha && (
            <button
              type="button"
              onClick={() => {
                setFecha("");
                empezar(() => void cambiarRetiradoAction("fecha_objetivo", "-", false));
              }}
              className="text-muted hover:text-foreground"
              aria-label={textos.quitarFecha}
            >
              ×
            </button>
          )}
        </label>
      )}
    </div>
    {/* Qué hace cada marca (11 nov 2026, «el botón de instalado, ¿qué es?»): el
        title no se ve en el móvil, así que al marcarla se explica debajo. */}
    {(instalado || oculto || caza || cazaLlena) && (
      <div className="mt-2 space-y-0.5 text-xs text-muted">
        {caza && <p>🎯 {textos.cazaAyuda}</p>}
        {cazaLlena && <p className="font-semibold text-[var(--danger)]">🎯 {textos.cazaLlena}</p>}
        {instalado && <p>💾 {textos.instaladoAyuda}</p>}
        {oculto && <p>🙈 {textos.ocultoTitulo}</p>}
      </div>
    )}
    </div>
  );
}
