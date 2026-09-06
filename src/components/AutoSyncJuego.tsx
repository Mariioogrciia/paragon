"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refrescarJuegoAction } from "@/app/actions";

/**
 * Sincroniza este juego solo, al abrir su ficha, si hace bastante que no se
 * comprueba.
 *
 * El porqué: Paragon no se entera de un trofeo nuevo hasta que PREGUNTA a la
 * plataforma — ni PSN ni Steam ni Xbox avisan por su cuenta. Hasta ahora eso
 * pasaba una vez al día (el cron del plan Hobby de Vercel no puede más) o
 * cuando alguien se acordaba de pulsar "Sincronizar". Resultado: conseguías
 * un platino, abrías su ficha y seguía saliendo el progreso viejo.
 *
 * Quién decide QUÉ se sincroniza es el servidor, no este componente: la
 * ficha solo lo monta cuando de verdad toca (es tu propio juego, es de
 * PSN/Steam y hace más de 6h de la última comprobación — ver
 * `u/[handle]/[gameId]/page.tsx`). Aquí no hay ninguna regla duplicada que
 * se pueda desincronizar de aquella.
 *
 * Deliberadamente NO se hace en Xbox: OpenXBL da 150 peticiones/hora
 * COMPARTIDAS entre todos los usuarios de Paragon (ver lib/xbl/client.ts),
 * así que sincronizar solo al abrir una ficha se comería la cuota de todo el
 * mundo. Xbox se queda con el botón manual de siempre.
 *
 * Si falla, se calla: esto es una comodidad de fondo, no una acción que el
 * usuario haya pedido. Un error de red pintando un aviso rojo en una ficha
 * que se ve perfectamente sería peor que no hacer nada. El botón de
 * "Sincronizar" de siempre sigue ahí para el caso en que alguien quiera
 * saber si funcionó.
 */
export function AutoSyncJuego({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [nuevos, setNuevos] = useState(0);
  // React monta dos veces en desarrollo (StrictMode) y `router.refresh()`
  // vuelve a renderizar el árbol: sin esto, una misma visita podría lanzar
  // varias sincronizaciones seguidas del mismo juego.
  const yaLanzado = useRef(false);

  useEffect(() => {
    if (yaLanzado.current) return;
    yaLanzado.current = true;

    startTransition(async () => {
      const r = await refrescarJuegoAction(gameId);
      if (r.error) return;

      if (r.nuevos > 0) {
        setNuevos(r.nuevos);
        // Solo se repinta si de verdad hay algo nuevo: refrescar por nada
        // haría parpadear la ficha entera sin motivo.
        router.refresh();
      }
    });
  }, [gameId, router]);

  if (nuevos === 0) return null;

  return (
    <p
      className="mb-4 rounded-xl px-4 py-2.5 text-[13px] font-semibold"
      style={{
        background: "rgb(var(--accent-rgb) / 0.12)",
        border: "1px solid rgb(var(--accent-rgb) / 0.3)",
        color: "var(--accent-text)",
      }}
    >
      ✨ {nuevos === 1 ? "1 trofeo nuevo" : `${nuevos} trofeos nuevos`} desde la última vez
    </p>
  );
}
