"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncHltbAction } from "@/app/actions";

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
