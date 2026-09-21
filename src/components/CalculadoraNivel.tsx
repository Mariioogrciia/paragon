"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { calcularObjetivoNivel } from "@/lib/calculadoraNivel";

/**
 * "Quiero llegar al nivel X" — calculadora inversa sobre tu XP actual real.
 * Todo el cálculo es puro (lib/calculadoraNivel.ts), corre aquí mismo sin
 * ida y vuelta al servidor.
 */
export function CalculadoraNivel({ nivelActual, xpActual }: { nivelActual: number; xpActual: number }) {
  const t = useTranslations("Analitica.calculadoraNivel");
  const [objetivo, setObjetivo] = useState(String(nivelActual + 10));
  const nivelObjetivo = Number(objetivo);
  const valido = Number.isFinite(nivelObjetivo) && nivelObjetivo > 0;

  const resultado = useMemo(
    () => (valido ? calcularObjetivoNivel(xpActual, nivelObjetivo) : null),
    [valido, xpActual, nivelObjetivo],
  );

  return (
    <div className="rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <h3 className="mb-1 font-heading text-lg font-bold uppercase tracking-wide">{t("titulo")}</h3>
      <p className="mb-4 text-sm text-muted">{t("vasPorElNivel", { nivel: nivelActual })}</p>

      <div className="mb-4 flex items-center gap-2.5">
        <span className="text-sm text-muted">{t("quieroLlegar")}</span>
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
        <p className="text-sm text-muted">{t("nivelInvalido")}</p>
      ) : resultado!.yaConseguido ? (
        <p className="text-sm font-semibold text-good">{t("yaConseguido")}</p>
      ) : (
        <div>
          <p className="mb-3 text-sm">
            {t.rich("teFaltan", { xp: resultado!.xpFaltante.toLocaleString("es-ES"), strong: (chunks) => <span className="font-heading text-xl font-bold text-accent-text">{chunks}</span> })}
          </p>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-muted">
            {t("orientativo")}
          </p>
          <ul className="text-xs text-muted">
            {resultado!.equivalencias.map((e) => (
              <li key={e.label}>{t("equivalencia", { cantidad: e.cantidad.toLocaleString("es-ES"), label: e.label })}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
