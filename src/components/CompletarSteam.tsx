"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * "Sincronizando tus logros de Steam…" (5 oct 2026). Al vincular Steam solo se
 * traían los logros de los 40 juegos más recientes y el resto "al abrir cada
 * ficha", así que justo después de vincular casi toda la biblioteca salía sin
 * logros. Esto termina el trabajo en cuanto se entra: llama a
 * /api/steam/completar (un lote de ~24 juegos cada vez) hasta que no queda
 * ninguno, enseñando el avance, y recarga la página al acabar.
 *
 * Solo se monta si hay juegos pendientes (ver CompletarSteamSiHaceFalta), y
 * para sola si un lote no consigue ninguno (juegos que Steam no deja leer).
 */
export function CompletarSteam({ pendientes }: { pendientes: number }) {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const [quedan, setQuedan] = useState(pendientes);
  const [estado, setEstado] = useState<"trabajando" | "fin" | "error">("trabajando");
  const arrancado = useRef(false);

  useEffect(() => {
    if (arrancado.current) return;
    arrancado.current = true;
    let cancelado = false;

    (async () => {
      let restantes = pendientes;
      let hechosTotales = 0;
      while (!cancelado && restantes > 0) {
        let r: Response;
        try {
          r = await fetch("/api/steam/completar", { method: "POST" });
        } catch {
          if (!cancelado) setEstado("error");
          return;
        }
        if (!r.ok) {
          if (!cancelado) setEstado("error");
          return;
        }
        const datos = (await r.json()) as { hechos: number; restantes: number };
        hechosTotales += datos.hechos;
        restantes = datos.restantes;
        if (!cancelado) setQuedan(restantes);
        // Un lote sin ningún juego: no hay nada más que se pueda traer ahora.
        if (datos.hechos === 0) break;
      }
      if (cancelado) return;
      setEstado("fin");
      if (hechosTotales > 0) router.refresh();
    })();

    return () => {
      cancelado = true;
    };
  }, [pendientes, router]);

  if (estado === "fin") return null;

  const hechos = Math.max(0, pendientes - quedan);
  const porcentaje = pendientes > 0 ? Math.round((hechos / pendientes) * 100) : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 rounded-[14px] px-[18px] py-4"
      style={{ border: "1px solid var(--accent-line)", background: "var(--accent-soft)" }}
    >
      {estado === "error" ? (
        <p className="text-[0.8125rem] leading-relaxed" style={{ color: "var(--accent-text)" }}>
          {t("completarSteam.error")}
        </p>
      ) : (
        <>
          <p className="text-[0.8125rem] font-semibold" style={{ color: "var(--accent-text)" }}>
            {t("completarSteam.titulo", { hechos, total: pendientes })}
          </p>
          <p className="mt-1 text-xs text-muted">{t("completarSteam.descripcion")}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${porcentaje}%`, background: "var(--accent-grad-h)" }} />
          </div>
        </>
      )}
    </div>
  );
}
