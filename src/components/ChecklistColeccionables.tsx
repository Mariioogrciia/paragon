"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { cargarColeccionablesAction, guardarColeccionablesAction } from "@/app/actions/coleccionables";

/**
 * Lista de coleccionables de un trofeo con casillas (lib/coleccionables.ts).
 * Va dentro del contador manual de la guía del trofeo: marcar una casilla
 * mueve ese contador. Los nombres se pegan de una guía (uno por línea) o se
 * toman de la lista que ya pegó otra persona; sin nombres, casillas
 * numeradas.
 */
export function ChecklistColeccionables({
  gameId,
  trophyId,
  total,
  onCambio,
}: {
  gameId: string;
  trophyId: string;
  /** El objetivo del contador: cuántas casillas hay si no hay nombres. */
  total: number;
  onCambio: (marcados: number, total: number) => void;
}) {
  const t = useTranslations("Biblioteca.coleccionables");
  const [nombres, setNombres] = useState<string[]>([]);
  const [marcados, setMarcados] = useState<number[]>([]);
  const [comunidad, setComunidad] = useState<string[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pegando, setPegando] = useState(false);
  const [texto, setTexto] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [guardando, empezar] = useTransition();

  useEffect(() => {
    let vivo = true;
    cargarColeccionablesAction(gameId, trophyId).then((r) => {
      if (!vivo) return;
      if (r.propia) {
        setNombres(r.propia.nombres);
        setMarcados(r.propia.marcados);
      }
      setComunidad(r.comunidad);
      setCargando(false);
    });
    return () => {
      vivo = false;
    };
  }, [gameId, trophyId]);

  const casillas = nombres.length > 0 ? nombres.length : total;

  function guardar(datos: { nombres?: string[]; textoPegado?: string; marcados: number[] }) {
    empezar(async () => {
      const r = await guardarColeccionablesAction(gameId, trophyId, { ...datos, total });
      if (r.ok) {
        setNombres(r.lista.nombres);
        setMarcados(r.lista.marcados);
        onCambio(r.lista.marcados.length, r.lista.total);
        setPegando(false);
        setTexto("");
      }
    });
  }

  function alternar(i: number) {
    const nuevo = marcados.includes(i) ? marcados.filter((m) => m !== i) : [...marcados, i].sort((a, b) => a - b);
    setMarcados(nuevo);
    onCambio(nuevo.length, casillas);
    guardar({ nombres, marcados: nuevo });
  }

  if (cargando) return <p className="px-6 pb-4 text-xs text-muted">{t("cargando")}</p>;

  const indices = Array.from({ length: casillas }, (_, i) => i).filter((i) => !soloPendientes || !marcados.includes(i));

  return (
    <div className="border-t border-border px-6 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="button" onClick={() => setPegando((v) => !v)} className="text-xs font-semibold text-accent hover:underline">
          {nombres.length > 0 ? t("cambiarLista") : t("pegarLista")}
        </button>
        {comunidad && nombres.length === 0 && (
          <button type="button" disabled={guardando} onClick={() => guardar({ nombres: comunidad, marcados: [] })} className="text-xs font-semibold text-accent hover:underline disabled:opacity-50">
            {t("usarComunidad", { count: comunidad.length })}
          </button>
        )}
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--accent)]" />
          {t("soloPendientes")}
        </label>
      </div>

      {pegando && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (texto.trim()) guardar({ textoPegado: texto, marcados: [] });
          }}
          className="mb-4"
        >
          <p className="mb-2 text-xs text-muted">{t("ayudaPegar")}</p>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={6}
            placeholder={t("placeholder")}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
          />
          <button type="submit" disabled={guardando || !texto.trim()} className="mt-2 rounded-lg px-3 py-1.5 text-xs font-bold text-background disabled:opacity-50" style={{ background: "var(--accent-grad)" }}>
            {t("guardarLista")}
          </button>
        </form>
      )}

      {indices.length === 0 ? (
        <p className="text-sm font-semibold text-good">{t("todosHechos")}</p>
      ) : (
        <ul className={nombres.length > 0 ? "grid gap-1.5 sm:grid-cols-2" : "grid grid-cols-5 gap-1.5 sm:grid-cols-8"}>
          {indices.map((i) => {
            const hecho = marcados.includes(i);
            return (
              <li key={i}>
                <label
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[0.8125rem] transition-colors hover:bg-surface-2"
                  style={{ border: "1px solid var(--border)", background: hecho ? "rgb(var(--accent-rgb) / 0.10)" : undefined }}
                >
                  <input type="checkbox" checked={hecho} onChange={() => alternar(i)} className="h-4 w-4 shrink-0 accent-[var(--accent)]" />
                  <span className={`min-w-0 truncate ${hecho ? "text-muted line-through" : ""}`}>{nombres[i] ?? `#${i + 1}`}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
