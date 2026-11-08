"use client";

import { useState, useTransition } from "react";
import { cambiarRetiradoAction } from "@/app/actions/retirados";

/** Nombre bonito de lo que guarda la plataforma en `deviceLabel`. */
export function nombreConsola(d: string): string {
  const nombres: Record<string, string> = { PSVITA: "PS Vita", PSPC: "PC (PlayStation)", "XBOX360": "Xbox 360", "XBOX 360": "Xbox 360", "XBOX ONE": "Xbox One", XBOXONE: "Xbox One", "XBOX SERIES": "Xbox Series" };
  return nombres[d] ?? d;
}

/**
 * Ajustes → Ocultar → «Lo que ya no tienes» (8 nov 2026, lib/retirados.ts):
 * las consolas de tu biblioteca con una casilla, y los juegos que ocultaste
 * uno a uno para poder volver a mostrarlos. Se guarda al tocar.
 */
export function RetiradosForm({
  consolas,
  juegos,
  textos,
}: {
  consolas: { dispositivo: string; juegos: number; retirado: boolean }[];
  juegos: { id: string; titulo: string }[];
  textos: { consolas: string; juegos: string; volverAMostrar: string; ningunJuego: string; nJuego: string; nJuegos: string };
}) {
  const [retiradas, setRetiradas] = useState(() => new Set(consolas.filter((c) => c.retirado).map((c) => c.dispositivo)));
  const [ocultos, setOcultos] = useState(juegos);
  const [, empezar] = useTransition();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-sm font-semibold">{textos.consolas}</p>
        <div className="flex flex-wrap gap-2">
          {consolas.map((c) => {
            const fuera = retiradas.has(c.dispositivo);
            return (
              <label
                key={c.dispositivo}
                className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors"
                style={{ border: "1px solid var(--border)", background: fuera ? "var(--surface-2)" : "var(--surface)", opacity: fuera ? 0.6 : 1 }}
              >
                <input
                  type="checkbox"
                  checked={!fuera}
                  onChange={() => {
                    const nuevo = new Set(retiradas);
                    if (fuera) nuevo.delete(c.dispositivo);
                    else nuevo.add(c.dispositivo);
                    setRetiradas(nuevo);
                    empezar(() => void cambiarRetiradoAction("dispositivo", c.dispositivo, !fuera));
                  }}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span className={fuera ? "line-through" : "font-semibold"}>{nombreConsola(c.dispositivo)}</span>
                <span className="text-xs text-muted">{(c.juegos === 1 ? textos.nJuego : textos.nJuegos).replace("{n}", String(c.juegos))}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">{textos.juegos}</p>
        {ocultos.length === 0 ? (
          <p className="text-sm text-muted">{textos.ningunJuego}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {ocultos.map((j) => (
              <li key={j.id} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                <span className="min-w-0 flex-1 truncate">{j.titulo}</span>
                <button
                  type="button"
                  onClick={() => {
                    setOcultos((l) => l.filter((x) => x.id !== j.id));
                    empezar(() => void cambiarRetiradoAction("juego", j.id, false));
                  }}
                  className="text-xs font-bold text-accent hover:underline"
                >
                  {textos.volverAMostrar}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
