"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { nivelRango, puedeCambiarRango, puedeExpulsar, type Rango } from "@/lib/clanRangos";
import { cambiarRangoAction, expulsarAction } from "../actions";

/**
 * Menú de un miembro para quien tiene rango sobre él (lib/clanRangos.ts):
 * ascender/degradar, pasar el liderazgo y expulsar. Solo salen las opciones
 * que tu rango permite; el servidor lo vuelve a comprobar.
 */
export function GestionMiembro({
  clanId,
  miembroId,
  nombre,
  rangoMiembro,
  miRango,
}: {
  clanId: string;
  miembroId: string;
  nombre: string;
  rangoMiembro: string;
  miRango: string;
}) {
  const t = useTranslations("Perfil.ClanPage");
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [pendiente, startTransition] = useTransition();
  const caja = useRef<HTMLDivElement>(null);

  // Se cierra al pulsar fuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const rangos: Rango[] = (["owner", "colider", "veterano", "member"] as Rango[]).filter((r) => puedeCambiarRango(miRango, rangoMiembro, r));
  const expulsable = puedeExpulsar(miRango, rangoMiembro);
  if (rangos.length === 0 && !expulsable) return null;

  const ejecutar = (accion: () => Promise<{ error?: string }>, confirmacion?: string) => {
    if (confirmacion && !confirm(confirmacion)) return;
    setError("");
    startTransition(async () => {
      const r = await accion();
      if (r.error) setError(r.error);
      else setAbierto(false);
    });
  };

  const etiqueta = (r: Rango) =>
    r === "owner" ? t("hacerLider") : nivelRango(r) > nivelRango(rangoMiembro) ? t("ascenderA", { rango: t(`rango_${r}`) }) : t("degradarA", { rango: t(`rango_${r}`) });

  return (
    <div className="relative" ref={caja}>
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-label={t("gestionar", { nombre })}
        className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {abierto && (
        <div className="absolute right-0 top-10 z-20 w-56 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-xl">
          {rangos.map((r) => (
            <button
              key={r}
              type="button"
              disabled={pendiente}
              onClick={() =>
                ejecutar(
                  () => cambiarRangoAction(clanId, miembroId, r),
                  r === "owner" ? t("confirmarLider", { nombre }) : undefined,
                )
              }
              className="block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-2 disabled:opacity-50"
            >
              {etiqueta(r)}
            </button>
          ))}
          {expulsable && (
            <button
              type="button"
              disabled={pendiente}
              onClick={() => ejecutar(() => expulsarAction(clanId, miembroId), t("confirmarExpulsar", { nombre }))}
              className="block w-full border-t border-border px-4 py-2.5 text-left text-sm text-[var(--danger)] transition-colors hover:bg-surface-2 disabled:opacity-50"
            >
              {t("expulsar")}
            </button>
          )}
          {error && <p className="px-4 py-2 text-xs text-[var(--danger)]">{error}</p>}
        </div>
      )}
    </div>
  );
}

