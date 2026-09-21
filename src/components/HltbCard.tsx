"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { syncHltbAction } from "@/app/actions";

/**
 * Horas estimadas por HowLongToBeat — historia y platino/100% por separado
 * (pedido explícito: "por un lado modo historia y por otro para el
 * platino"). Distinto de `EtaPlatinoCard`: esa calcula CUÁNDO terminarás TÚ
 * según tu ritmo real (solo tiene sentido si ya has empezado); esto es
 * cuánto tarda la gente en general, de media — útil incluso antes de
 * empezar el juego.
 */
export async function HltbCard({ hltb }: { hltb?: { main?: number; mainExtra?: number; completionist?: number } }) {
  if (!hltb || (hltb.main == null && hltb.completionist == null)) return null;

  const t = await getTranslations("Biblioteca");

  return (
    <section className="rounded-[18px] p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
        {t("HltbCard.title")}
      </h2>
      <div className="flex flex-wrap gap-6">
        {hltb.main != null && (
          <div>
            <p className="font-heading text-2xl font-bold">{hltb.main}h</p>
            <p className="text-[0.6875rem] text-muted">{t("HltbCard.mainStory")}</p>
          </div>
        )}
        {hltb.completionist != null && (
          <div>
            <p className="font-heading text-2xl font-bold" style={{ color: "var(--platinum)" }}>
              {hltb.completionist}h
            </p>
            <p className="text-[0.6875rem] text-muted">{t("HltbCard.platinum100")}</p>
          </div>
        )}
      </div>
      <p className="mt-3 text-[0.625rem] text-muted">
        {t("HltbCard.note")}
      </p>
    </section>
  );
}

/**
 * Dispara la búsqueda en HLTB una sola vez cuando la ficha no tiene dato
 * todavía (`game.hltb` es `undefined` — nunca comprobado). No pinta nada:
 * si encuentra algo, `router.refresh()` vuelve a traer la ficha con el
 * dato ya puesto, sin recargar la página entera. Mismo patrón que
 * `AutoSyncJuego.tsx` para los trofeos.
 */
export function AutoSyncHltb({ gameId, title }: { gameId: string; title: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const yaLanzado = useRef(false);

  useEffect(() => {
    if (yaLanzado.current) return;
    yaLanzado.current = true;

    startTransition(async () => {
      await syncHltbAction(gameId, title);
      router.refresh();
    });
  }, [gameId, title, router]);

  return null;
}
