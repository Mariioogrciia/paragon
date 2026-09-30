"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { TrophyPhoto } from "@/components/TrophyList";
import type { TrophyGrade } from "@/lib/types";

interface Trofeo {
  nombre: string;
  juego: string;
  icono: string | null;
  grado: string | null;
}

const GRADOS: TrophyGrade[] = ["platinum", "gold", "silver", "bronze"];

/**
 * La firma de la plataforma: el aviso de "trofeo desbloqueado" de la consola,
 * pero para cualquier plataforma. Sale abajo al terminar una sincronización
 * que trae trofeos nuevos (como mucho 3, más un "+N"), y se va solo.
 */
export function TrofeoDesbloqueadoAviso({ trofeos, nuevos }: { trofeos: Trofeo[]; nuevos: number }) {
  const t = useTranslations("Onboarding.trofeoDesbloqueado");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setVisible(false), 7000);
    return () => clearTimeout(id);
  }, []);

  if (!visible || trofeos.length === 0) return null;
  const resto = nuevos - trofeos.length;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      {trofeos.map((tr, i) => {
        const grado = GRADOS.includes(tr.grado as TrophyGrade) ? (tr.grado as TrophyGrade) : undefined;
        return (
          <div
            key={`${tr.juego}-${tr.nombre}-${i}`}
            className="trofeo-aviso pointer-events-auto flex w-full max-w-sm items-center gap-3.5 rounded-2xl border p-3 pr-2"
            style={{ animationDelay: `${i * 140}ms` }}
          >
            <span className="trofeo-aviso-icono shrink-0">
              <TrophyPhoto trophy={{ iconUrl: tr.icono, grade: grado }} size={48} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.6875rem] font-bold text-[var(--accent-text)]">{t("titulo")}</span>
              <span className="block truncate font-heading text-[0.9375rem] font-bold">{tr.nombre}</span>
              <span className="block truncate text-xs text-muted">{tr.juego}</span>
            </span>
            {i === 0 && (
              <button
                type="button"
                onClick={() => setVisible(false)}
                aria-label={t("cerrar")}
                className="self-start rounded-lg p-1.5 text-muted transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
              >
                <X size={15} />
              </button>
            )}
          </div>
        );
      })}
      {resto > 0 && (
        <span className="trofeo-aviso pointer-events-auto rounded-full border px-3 py-1 text-xs font-semibold text-muted" style={{ animationDelay: `${trofeos.length * 140}ms` }}>
          {t("mas", { n: resto })}
        </span>
      )}
    </div>
  );
}
