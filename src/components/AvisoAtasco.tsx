"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { togglePinGameAction } from "@/app/actions";

/**
 * "Detector de Atascos": tu juego anclado lleva días sin trofeos nuevos —
 * ver `diasSinAvance()` en lib/profileStats.ts. Solo se monta cuando el
 * umbral se cumple de verdad (decidido por quien llama, ver app/page.tsx).
 *
 * A propósito NO es una alerta en tiempo real ("te has atascado AHORA") —
 * Paragon solo sabe lo que sincronizó la última vez, así que es un aviso de
 * "llevas un tiempo sin avanzar", constatando el dato, no adivinando el
 * motivo (podría ser un atasco de verdad, o simplemente que no has jugado).
 */
export function AvisoAtasco({ gameId, titulo, dias, handle }: { gameId: string; titulo: string; dias: number; handle: string }) {
  const t = useTranslations("Perfil");
  const [oculto, setOculto] = useState(false);
  const [, startTransition] = useTransition();

  if (oculto) return null;

  return (
    <section
      className="mb-8 rounded-2xl p-5"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <p className="text-sm leading-relaxed">
        {t.rich("AvisoAtasco.message", {
          dias,
          titulo,
          strong: (chunks) => <span className="font-bold">{chunks}</span>,
          link: (chunks) => (
            <Link href={`/u/${handle}/${gameId}`} className="font-bold underline hover:opacity-80">
              {chunks}
            </Link>
          ),
        })}
      </p>
      <div className="mt-3 flex flex-wrap gap-2.5">
        <Link
          href={`/u/${handle}/${gameId}/enfoque`}
          className="rounded-xl px-4 py-2 text-[0.8125rem] font-bold transition-colors hover:opacity-85"
          style={{ background: "var(--accent-grad)", color: "#061021" }}
        >
          {t("AvisoAtasco.guideLink")}
        </Link>
        <button
          type="button"
          onClick={() => {
            setOculto(true);
            startTransition(async () => {
              await togglePinGameAction(gameId);
            });
          }}
          className="rounded-xl px-4 py-2 text-[0.8125rem] font-semibold text-muted transition-colors hover:text-foreground"
          style={{ border: "1px solid var(--border)" }}
        >
          {t("AvisoAtasco.dismiss")}
        </button>
      </div>
    </section>
  );
}
