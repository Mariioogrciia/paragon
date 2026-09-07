"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ponerseAlDiaAction } from "@/app/actions";
import { PLATFORM_LABEL, type Platform } from "@/lib/types";

/**
 * Panel de "qué le falta a mi biblioteca por sincronizar".
 *
 * Antes esto no se veía por ningún sitio: la biblioteca sabe cuántos
 * trofeos tiene cada juego, pero el detalle (qué trofeo y cuándo) llega
 * juego a juego, y podían pasar días con decenas de juegos a medias sin que
 * la app lo dijera. El "Historial de sincronización" de más abajo cuenta lo
 * que YA pasó; esto cuenta lo que FALTA, que es lo accionable.
 */

interface Fila {
  plataforma: Platform;
  total: number;
  sinDetalle: number;
  caducados: number;
}

export function SaludSincronizacion({ filas }: { filas: Fila[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendiente, setPendiente] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // Xbox no entra en la puesta al día a mano: OpenXBL da 150 peticiones/hora
  // compartidas entre TODOS los usuarios de Paragon.
  const refrescables = filas.filter((f) => f.plataforma === "psn" || f.plataforma === "steam");
  const pendientes = refrescables.reduce((n, f) => n + f.sinDetalle + f.caducados, 0);

  function ponerseAlDia() {
    setPendiente(true);
    setAviso(null);

    startTransition(async () => {
      const r = await ponerseAlDiaAction();
      setPendiente(false);

      if (r.error) {
        setAviso(r.error);
        return;
      }

      setAviso(
        r.hechos === 0
          ? "No se ha podido refrescar ninguno esta vez."
          : `${r.hechos} ${r.hechos === 1 ? "juego actualizado" : "juegos actualizados"}.` +
            (r.restantes > 0 ? ` Quedan ${r.restantes}: puedes darle otra vez.` : " Ya está todo al día."),
      );
      router.refresh();
    });
  }

  return (
    <div>
      <div className="space-y-2">
        {filas.map((f) => {
          const alDia = f.sinDetalle === 0 && f.caducados === 0;
          return (
            <div
              key={f.plataforma}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-xs"
            >
              <span className="font-semibold">{PLATFORM_LABEL[f.plataforma] ?? f.plataforma}</span>
              <span className="text-muted">
                {f.total} juegos ·{" "}
                {alDia ? (
                  <span style={{ color: "var(--accent-text)" }}>al día</span>
                ) : (
                  <>
                    {f.sinDetalle > 0 && <>{f.sinDetalle} sin detalle</>}
                    {f.sinDetalle > 0 && f.caducados > 0 && " · "}
                    {f.caducados > 0 && <>{f.caducados} sin refrescar</>}
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {pendientes > 0 && (
        <button
          type="button"
          onClick={ponerseAlDia}
          disabled={pendiente}
          className="mt-3.5 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          style={{
            background: "rgb(var(--accent-rgb) / 0.12)",
            border: "1px solid rgb(var(--accent-rgb) / 0.3)",
            color: "var(--accent-text)",
          }}
        >
          {pendiente ? "Poniendo al día…" : "Ponerse al día"}
        </button>
      )}

      {aviso && <p className="mt-2.5 text-[13px] text-muted">{aviso}</p>}

      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        &laquo;Sin detalle&raquo; son juegos de los que sabemos el total de trofeos pero no
        cuáles ni cuándo — hasta que se piden, no cuentan en el histórico ni en
        las rachas. La puesta al día va por tandas: si quedan más, se puede
        repetir. Xbox no entra a propósito, porque su API va con un cupo por
        hora compartido entre todos los usuarios de Paragon.
      </p>
    </div>
  );
}
