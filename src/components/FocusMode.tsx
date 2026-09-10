"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refrescarJuegoAction, saveGameNotesAction } from "@/app/actions";
import { TrophyGuideModal } from "@/components/TrophyGuideModal";
import { TrophyPhoto } from "@/components/TrophyList";
import { rarity } from "@/lib/design";
import type { Trophy } from "@/lib/types";
import type { Prevision } from "@/lib/history";

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
  notasIniciales,
  oraculo,
}: {
  gameId: string;
  titulo: string;
  /** Ya vienen ordenados por cercanía desde el servidor (ver nextSteps). */
  trofeos: Trophy[];
  earned: number;
  total: number;
  volverA: string;
  /** Tu nota privada de siempre (`userGames.notes`) — para que el scratchpad no empiece en blanco si ya tenías algo apuntado desde la web. */
  notasIniciales?: string | null;
  /** "Oráculo de Platino" — a tu ritmo real, cuándo terminarías esto (ver lib/history.ts). `null` sin ritmo reciente con el que proyectar nada. */
  oraculo?: Prevision | null;
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

  // Scratchpad OLED: para apuntar una clave/combinación sin salir del modo
  // enfoque (salir apaga el WakeLock de arriba y rompe el "segunda
  // pantalla"). Autoguardado con debounce en vez de un botón "Guardar" — a
  // oscuras, con el mando en una mano y el móvil en la otra, un botón que
  // hay que acertar a pulsar es fricción de más.
  const [notaAbierta, setNotaAbierta] = useState(false);
  const [nota, setNota] = useState(notasIniciales ?? "");
  const notaGuardadaEn = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notaGuardando, setNotaGuardando] = useState(false);

  function cambiarNota(valor: string) {
    setNota(valor);
    if (notaGuardadaEn.current) clearTimeout(notaGuardadaEn.current);
    notaGuardadaEn.current = setTimeout(() => {
      setNotaGuardando(true);
      saveGameNotesAction(gameId, valor).finally(() => setNotaGuardando(false));
    }, 800);
  }

  // Al cerrar el bloc (o al desmontar, si alguien sale del modo enfoque con
  // el debounce todavía pendiente) se fuerza el guardado inmediato — sin
  // esto, cerrar rápido después de escribir podía perder los últimos
  // caracteres si el debounce de 800ms no había llegado a saltar.
  function cerrarNota() {
    if (notaGuardadaEn.current) {
      clearTimeout(notaGuardadaEn.current);
      notaGuardadaEn.current = null;
      setNotaGuardando(true);
      saveGameNotesAction(gameId, nota).finally(() => setNotaGuardando(false));
    }
    setNotaAbierta(false);
  }

  useEffect(() => {
    return () => {
      if (notaGuardadaEn.current) clearTimeout(notaGuardadaEn.current);
    };
  }, []);

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
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-white/40">
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

        {/* Oráculo de Platino: una línea suelta, no una tarjeta — el Modo
            Enfoque es deliberadamente austero, esto es un dato extra, no
            un bloque que compita por atención con los trofeos de abajo. */}
        {oraculo && (
          <p className="mt-2 text-[0.8125rem] text-white/50">
            A tu ritmo, lo terminas sobre el{" "}
            <span className="font-semibold text-white/80">
              {new Date(oraculo.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
            </span>{" "}
            ({oraculo.semanas} {oraculo.semanas === 1 ? "semana" : "semanas"} a tu ritmo de los últimos 90 días).
          </p>
        )}

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
                    <TrophyPhoto trophy={t} size={i === 0 ? 52 : 44} />

                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-bold leading-tight ${i === 0 ? "text-xl" : "text-[1.0625rem]"}`}
                      >
                        {t.name}
                      </p>
                      {t.detail && (
                        <p className="mt-1.5 text-[0.9375rem] leading-snug text-white/60">
                          {t.detail}
                        </p>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {r && (
                          <span
                            className="rounded-full px-2.5 py-1 text-[0.75rem] font-bold uppercase tracking-[0.06em]"
                            style={{ background: r.bg, color: r.fg }}
                          >
                            {r.label} · {t.rarityPercent!.toFixed(1)}%
                          </span>
                        )}
                        {t.progress && t.progress.current > 0 && (
                          <span className="text-[0.8125rem] font-bold tabular-nums text-white/70">
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
                    className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl text-[0.9375rem] font-bold text-white/80 transition-transform hover:scale-[1.01] hover:text-white active:scale-[0.98]"
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
            <p className="text-center text-[0.9375rem] text-red-400" aria-live="polite">
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

      {/* Botón discreto del scratchpad — esquina inferior, encima de todo
          (z-index más alto que el resto de la capa) pero pequeño: no debe
          competir con "¿Ya lo tengo?", que es la acción de verdad. */}
      <button
        type="button"
        onClick={() => setNotaAbierta(true)}
        aria-label="Apuntar una nota rápida"
        // El footer con "¿Ya lo tengo?"/"Salir" (BOTON = min-h-64px cada
        // uno) va en columna en móvil (dos botones apilados, ~150px+) y en
        // fila a partir de `sm:` (una sola altura, ~76px) — el offset de
        // abajo tiene que despejar cada caso, si no el botón del bloc de
        // notas queda tapado detrás de "Salir".
        className="fixed bottom-44 right-5 z-[110] flex h-12 w-12 items-center justify-center rounded-full text-white/70 shadow-lg transition-transform hover:scale-105 hover:text-white active:scale-95 sm:bottom-24"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        {nota && <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[rgb(159,212,236)]" />}
      </button>

      {notaAbierta && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nota privada"
          className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/80 sm:items-center sm:justify-center"
          onClick={cerrarNota}
        >
          <div
            className="w-full rounded-t-2xl bg-black p-5 sm:max-w-md sm:rounded-2xl"
            style={{ border: "1px solid rgba(255,255,255,0.16)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-white/40">
                Nota privada — solo la ves tú
              </p>
              <span className="text-[0.6875rem] text-white/40">{notaGuardando ? "Guardando…" : nota ? "Guardado" : ""}</span>
            </div>
            <textarea
              value={nota}
              onChange={(e) => cambiarNota(e.target.value)}
              maxLength={500}
              autoFocus
              placeholder="Ej: código de la taquilla de la sala de espera: DCM"
              className="h-32 w-full resize-none rounded-xl bg-white/5 p-3 text-base text-white outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.16)" }}
            />
            <button
              type="button"
              onClick={cerrarNota}
              className={`${BOTON} mt-3 w-full bg-white text-black`}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
