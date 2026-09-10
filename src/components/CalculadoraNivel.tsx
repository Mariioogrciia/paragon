"use client";

import { useMemo, useState } from "react";
import { calcularObjetivoNivel } from "@/lib/calculadoraNivel";

/**
 * "Quiero llegar al nivel X" — calculadora inversa sobre tu XP actual real.
 * Todo el cálculo es puro (lib/calculadoraNivel.ts), corre aquí mismo sin
 * ida y vuelta al servidor.
 */
export function CalculadoraNivel({ nivelActual, xpActual }: { nivelActual: number; xpActual: number }) {
  const [objetivo, setObjetivo] = useState(String(nivelActual + 10));
  const nivelObjetivo = Number(objetivo);
  const valido = Number.isFinite(nivelObjetivo) && nivelObjetivo > 0;

  const resultado = useMemo(
    () => (valido ? calcularObjetivoNivel(xpActual, nivelObjetivo) : null),
    [valido, xpActual, nivelObjetivo],
  );

  return (
    <div className="rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <h3 className="mb-1 font-heading text-lg font-bold uppercase tracking-wide">¿Cuánto me falta para el nivel...?</h3>
      <p className="mb-4 text-sm text-muted">Ahora mismo vas por el nivel {nivelActual}.</p>

      <div className="mb-4 flex items-center gap-2.5">
        <span className="text-sm text-muted">Quiero llegar al nivel</span>
        <input
          type="number"
          min={1}
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value)}
          className="w-20 rounded-lg px-2.5 py-1.5 text-sm font-bold outline-none"
          style={{ border: "1px solid var(--border)", background: "var(--background)" }}
        />
      </div>

      {!valido ? (
        <p className="text-sm text-muted">Pon un nivel válido.</p>
      ) : resultado!.yaConseguido ? (
        <p className="text-sm font-semibold text-good">Ya lo tienes — vas por delante de ese nivel.</p>
      ) : (
        <div>
          <p className="mb-3 text-sm">
            Te faltan <span className="font-heading text-xl font-bold text-accent-text">{resultado!.xpFaltante.toLocaleString("es-ES")} XP</span>.
          </p>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-muted">
            Orientativo, no una lista de la compra — nadie saca solo un tipo de trofeo:
          </p>
          <ul className="text-xs text-muted">
            {resultado!.equivalencias.map((e) => (
              <li key={e.label}>≈ {e.cantidad.toLocaleString("es-ES")} {e.label}, si fueran todos de eso</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
