"use client";

import { useState, useTransition } from "react";
import { actualizarAdquisicionAction } from "@/app/actions";
import { ToggleChip } from "@/components/ToggleChip";

const FORMATOS: { valor: string; label: string }[] = [
  { valor: "fisico", label: "Físico" },
  { valor: "digital", label: "Digital" },
  { valor: "ps_plus", label: "PS Plus" },
  { valor: "game_pass", label: "Game Pass" },
  { valor: "prestado", label: "Prestado" },
  { valor: "gratis", label: "Gratis" },
];

const LABEL_FORMATO = Object.fromEntries(FORMATOS.map((f) => [f.valor, f.label]));

function horasDe(playtimeMinutes: number | undefined): number | null {
  if (!playtimeMinutes || playtimeMinutes <= 0) return null;
  return playtimeMinutes / 60;
}

/**
 * De dónde tienes el juego y cuánto pagaste — solo lo dice el propio
 * usuario, ninguna plataforma lo expone. A partir de eso, y de las horas
 * jugadas que sí son reales (`playtimeMinutes`), se calcula el €/hora: la
 * cifra es tuya y de tu propio criterio (un juego en PS Plus vale 0€ pagado
 * aunque tenga precio de lista, a propósito), Paragon solo hace la
 * división.
 */
export function AcquisitionEditor({
  gameId,
  format,
  price,
  playtimeMinutes,
}: {
  gameId: string;
  format: string | undefined;
  price: number | undefined;
  playtimeMinutes: number | undefined;
}) {
  const [editando, setEditando] = useState(false);
  const [formatoSel, setFormatoSel] = useState(format ?? "");
  const [precioSel, setPrecioSel] = useState(price != null ? String(price) : "");
  const [isPending, startTransition] = useTransition();
  const [guardado, setGuardado] = useState({ format, price });

  const horas = horasDe(playtimeMinutes);
  const costeHora = guardado.price != null && horas ? guardado.price / horas : null;

  function guardar() {
    const nuevoPrecio = precioSel.trim() === "" ? null : Number(precioSel);
    const nuevoFormato = formatoSel === "" ? null : formatoSel;
    startTransition(async () => {
      const res = await actualizarAdquisicionAction(gameId, nuevoFormato, nuevoPrecio);
      if (!res.error) {
        setGuardado({ format: nuevoFormato ?? undefined, price: nuevoPrecio ?? undefined });
        setEditando(false);
      }
    });
  }

  if (!editando) {
    return (
      <button
        onClick={() => setEditando(true)}
        className="flex w-full items-center justify-between gap-3 rounded-xl p-3.5 text-left transition-colors hover:bg-surface-2"
        style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <span className="text-sm text-muted">
          {guardado.format || guardado.price != null ? (
            <>
              {guardado.format && <span className="font-semibold text-foreground">{LABEL_FORMATO[guardado.format]}</span>}
              {guardado.format && guardado.price != null && " · "}
              {guardado.price != null && <span className="font-semibold text-foreground">{guardado.price.toFixed(2)}€</span>}
              {costeHora != null && <span> · {costeHora.toFixed(2)}€/h</span>}
            </>
          ) : (
            "¿De dónde tienes este juego, y cuánto pagaste?"
          )}
        </span>
        <span className="shrink-0 text-xs font-semibold text-accent">Editar</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl p-4" style={{ border: "1px solid rgb(var(--accent-rgb) / 0.3)", background: "var(--surface)" }}>
      <div className="flex flex-wrap gap-1.5">
        {FORMATOS.map((f) => (
          <ToggleChip key={f.valor} active={formatoSel === f.valor} size="md" onClick={() => setFormatoSel(formatoSel === f.valor ? "" : f.valor)}>
            {f.label}
          </ToggleChip>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-muted">Pagaste:</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={precioSel}
          onChange={(e) => setPrecioSel(e.target.value)}
          placeholder="0.00"
          className="w-24 rounded-lg px-2.5 py-1.5 text-sm font-semibold outline-none"
          style={{ border: "1px solid var(--border)", background: "var(--background)" }}
        />
        <span className="text-sm text-muted">€</span>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={() => setEditando(false)} disabled={isPending} className="px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground">
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={isPending}
          className="rounded-lg px-4 py-1.5 text-xs font-bold text-background disabled:opacity-50"
          style={{ background: "var(--accent-grad)" }}
        >
          {isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
