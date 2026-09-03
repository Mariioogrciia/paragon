"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refrescarJuegoAction } from "@/app/actions";
import { TrophyGuideModal } from "@/components/TrophyGuideModal";
import { TrophyTile } from "@/components/TrophyIcon";
import { rarity } from "@/lib/design";
import type { Trophy } from "@/lib/types";

/**
 * Modo enfoque: el móvil como segunda pantalla mientras se juega en la tele.
 *
 * Tres decisiones que definen la pantalla:
 *
 * 1. Es una capa fija sobre todo (`fixed inset-0`), no una página dentro del
 *    marco de la app. Tapa cabecera, navegación y pie: si asoma cualquiera de
 *    los tres, ya no es modo enfoque.
 * 2. Negro puro y no `var(--background)`: se mira de reojo, a un metro, con la
 *    habitación a oscuras, y encima ahorra batería en pantallas OLED.
 * 3. Nada de temas ni acentos aquí. Los colores son los de los metales de los
 *    trofeos, que es la única información que importa a esa distancia.
 */

/** Alto mínimo de cualquier cosa pulsable: es un móvil y se usa sin mirar. */
const BOTON = "min-h-[64px] rounded-2xl text-lg font-bold transition-transform hover:scale-[1.02] active:scale-[0.97]";

export function FocusMode({
  gameId,
  titulo,
  trofeos,
  earned,
  total,
  volverA,
}: {
  gameId: string;
  titulo: string;
  /** Ya vienen ordenados por cercanía desde el servidor (ver nextSteps). */
  trofeos: Trophy[];
  earned: number;
  total: number;
  volverA: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // El trofeo cuya guía se está viendo. El modal se pinta DENTRO de la capa
  // del modo enfoque a propósito: la capa crea contexto de apilado, así que
  // ahí dentro el modal sale por encima; colgado fuera se quedaría detrás.
  const [guia, setGuia] = useState<Trophy | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  // La capa tapa la app, pero la app sigue debajo: sin esto se puede arrastrar
  // la página de fondo con el dedo y asoman cabecera y pie por detrás, que es
  // justo lo que este modo promete que no pasa.
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);

  // Mantener la pantalla encendida. Si el navegador no lo soporta (o lo niega),
  // el modo sigue funcionando: es una comodidad, no un requisito.
  useEffect(() => {
    let cancelado = false;

    async function pedir() {
      try {
        if (!("wakeLock" in navigator)) return;
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelado) {
          await sentinel.release();
          return;
        }
        wakeLock.current = sentinel;
      } catch {
        // Denegado o no disponible: seguimos igual.
      }
    }

    pedir();

    // Al volver de segundo plano el navegador suelta el bloqueo, así que se
    // vuelve a pedir; si no, la pantalla se apaga a la segunda vez que miras.
    function alVolver() {
      if (document.visibilityState === "visible") pedir();
    }

    document.addEventListener("visibilitychange", alVolver);

    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", alVolver);
      wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
    };
  }, []);

  function comprobar() {
    setAviso(null);
    setError(null);

    startTransition(async () => {
      const r = await refrescarJuegoAction(gameId);

      if (r.error) {
        setError(r.error);
        return;
      }

      setAviso(
        r.nuevos > 0
          ? `¡${r.nuevos} ${r.nuevos === 1 ? "trofeo nuevo" : "trofeos nuevos"}!`
          : "Nada nuevo todavía",
      );
      router.refresh();
    });
  }

  const porcentaje = total > 0 ? Math.round((earned / total) * 100) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Modo enfoque: ${titulo}`}
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-black text-white"
    >
      {/* Ancho de móvil por defecto; en pantalla grande se abre para que quepan
          los tres trofeos en fila y no quede una columna estrecha perdida en
          medio de un monitor. */}
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-5 pb-6 pt-6 lg:max-w-[1100px] lg:px-8">
        <header className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
              Modo enfoque
            </p>
            <h1 className="font-heading mt-1 truncate text-2xl font-bold uppercase leading-tight">
              {titulo}
            </h1>
          </div>
          <a
            href={volverA}
            aria-label="Salir del modo enfoque"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-white/50 transition-transform hover:scale-105 hover:text-white active:scale-95"
            style={{ border: "1px solid rgba(255,255,255,0.16)" }}
          >
            ✕
          </a>
        </header>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-white/80"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <span className="font-heading text-lg font-bold tabular-nums">
            {earned}/{total}
          </span>
        </div>

        {trofeos.length === 0 ? (
          <p className="mt-16 text-center text-lg text-white/50">
            No queda ningún trofeo pendiente aquí. Está hecho.
          </p>
        ) : (
          // En móvil, una columna: se lee de un vistazo con el mando en la
          // mano. En pantalla grande, los tres a la vez y sin scroll.
          <ol className="mt-6 flex-1 space-y-3 lg:grid lg:grid-cols-3 lg:items-start lg:gap-3 lg:space-y-0">
            {trofeos.map((t, i) => {
              const r = t.rarityPercent !== undefined ? rarity(t.rarityPercent) : null;

              return (
                <li
                  key={t.id}
                  className="rounded-2xl p-4"
                  style={{
                    // Al primero se le da más peso: es el que hay que mirar.
                    background: i === 0 ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.04)",
                    border: `1px solid rgba(255,255,255,${i === 0 ? 0.18 : 0.08})`,
                  }}
                >
                  <div className="flex items-start gap-3.5">
                    <TrophyTile grade={t.grade} size={i === 0 ? 52 : 44} />

                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-bold leading-tight ${i === 0 ? "text-xl" : "text-[17px]"}`}
                      >
                        {t.name}
                      </p>
                      {t.detail && (
                        <p className="mt-1.5 text-[15px] leading-snug text-white/60">
                          {t.detail}
                        </p>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {r && (
                          <span
                            className="rounded-full px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.06em]"
                            style={{ background: r.bg, color: r.fg }}
                          >
                            {r.label} · {t.rarityPercent!.toFixed(1)}%
                          </span>
                        )}
                        {t.progress && t.progress.current > 0 && (
                          <span className="text-[13px] font-bold tabular-nums text-white/70">
                            {t.progress.current}/{t.progress.target}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* La guía en vídeo es lo que convierte esto en segunda
                      pantalla de verdad: el juego en la tele y el cómo se hace
                      en la mano. */}
                  <button
                    onClick={() => setGuia(t)}
                    className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white/80 transition-transform hover:scale-[1.01] hover:text-white active:scale-[0.98]"
                    style={{ border: "1px solid rgba(255,255,255,0.16)" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Ver guía
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        <div className="sticky bottom-0 mt-6 space-y-2.5 bg-black pt-3">
          {aviso && (
            <p className="text-center text-lg font-bold" aria-live="polite">
              {aviso}
            </p>
          )}
          {error && (
            <p className="text-center text-[15px] text-red-400" aria-live="polite">
              {error}
            </p>
          )}

          <div className="space-y-2.5 sm:flex sm:gap-3 sm:space-y-0">
            <button
              onClick={comprobar}
              disabled={pendiente}
              className={`${BOTON} w-full bg-white text-black disabled:opacity-60 sm:flex-1`}
            >
              {pendiente ? "Comprobando…" : "¿Ya lo tengo?"}
            </button>

            <a
              href={volverA}
              className={`${BOTON} flex w-full items-center justify-center text-white/70 hover:text-white sm:w-40`}
              style={{ border: "1px solid rgba(255,255,255,0.16)" }}
            >
              Salir
            </a>
          </div>
        </div>
      </div>

      {guia && (
        <TrophyGuideModal
          gameTitle={titulo}
          trophy={guia}
          onClose={() => setGuia(null)}
        />
      )}
    </div>
  );
}
