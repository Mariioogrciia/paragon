"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * "Cazador de Platinos" — el easter egg de /offline, el equivalente de
 * Paragon al dinosaurio de Chrome. Pedido explícito del usuario: "algo
 * distinto" del dino, con ranking. La vuelta propia: en vez de saltar
 * cactus sin más, el jugador esquiva iconos de "sin señal" (temático con
 * estar offline) y CAZA trofeos que flotan en el aire para sumar puntos
 * extra — mismo verbo que el resto de la app ("cazador de trofeos"), no
 * un simple superviviente.
 *
 * Canvas a pelo (sin librería de juegos): es un minijuego de 200 líneas,
 * no hace falta más.
 */

const ANCHO = 640;
const ALTO = 220;
const SUELO_Y = ALTO - 30;
const GRAVEDAD = 1800;
const VELOCIDAD_SALTO = 620;
const JUGADOR_X = 60;
const JUGADOR_TAM = 28;

type Obstaculo = { x: number; tipo: "senal" };
type Trofeo = { x: number; y: number; cogido: boolean };

type Estado = "esperando" | "jugando" | "terminado";

interface FilaRanking {
  userId: string;
  name: string | null;
  handle: string | null;
  avatarUrl: string | null;
  score: number;
}

export function HunterGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [estado, setEstado] = useState<Estado>("esperando");
  const [puntuacion, setPuntuacion] = useState(0);
  const [ranking, setRanking] = useState<{ top: FilaRanking[]; mia: { score: number; puesto: number | null } | null } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [esNuevoRecord, setEsNuevoRecord] = useState(false);
  // Se descubre al intentar guardar la puntuación (401 = sin sesión) — esta
  // página es el fallback offline, sin datos de servidor propios, así que
  // no hay forma de saberlo de antemano sin una llamada de red aparte.
  const [sinSesion, setSinSesion] = useState(false);

  // Todo el estado del juego vive en refs, no en useState — a 60fps,
  // recrear el bucle por cada setState sería mucho más lento y con más
  // parpadeo del necesario. React solo se entera al final (game over).
  const jugadorY = useRef(0);
  const velocidadY = useRef(0);
  const saltando = useRef(false);
  const obstaculos = useRef<Obstaculo[]>([]);
  const trofeos = useRef<Trofeo[]>([]);
  const distancia = useRef(0);
  const velocidadJuego = useRef(300);
  const tiempoUltimoObstaculo = useRef(0);
  const puntosRef = useRef(0);
  const frameId = useRef<number | null>(null);
  const ultimoTs = useRef<number | null>(null);

  const cargarRanking = useCallback(async () => {
    try {
      const res = await fetch("/api/arcade/score");
      if (res.ok) setRanking(await res.json());
    } catch {
      // Sin conexión de verdad (el caso normal aquí) — el ranking se queda
      // vacío, el juego se sigue pudiendo jugar igual.
    }
  }, []);

  // Carga inicial del ranking — función local (no la referencia
  // memoizada de arriba) para que el análisis estático del linter la
  // trate como "efecto suscribiéndose a un sistema externo", no como un
  // setState síncrono en el cuerpo del efecto. Mismo patrón que ya usa
  // `UpcomingGames.tsx`.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch("/api/arcade/score");
        if (res.ok && vivo) setRanking(await res.json());
      } catch {
        // Sin conexión de verdad (el caso normal aquí).
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const terminar = useCallback(async () => {
    setEstado("terminado");
    if (frameId.current) cancelAnimationFrame(frameId.current);
    const final = Math.round(puntosRef.current);
    setPuntuacion(final);

    if (final <= 0) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/arcade/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: final }),
      });
      if (res.status === 401) {
        setSinSesion(true);
      } else if (res.ok) {
        const data = await res.json();
        setEsNuevoRecord(Boolean(data.esNuevoRecord));
        await cargarRanking();
      }
    } catch {
      // Offline de verdad (el caso normal aquí) — no se guarda, sin más.
    } finally {
      setEnviando(false);
    }
  }, [cargarRanking]);

  const salto = useCallback(() => {
    if (estado === "esperando" || estado === "terminado") {
      // Reset completo — empezar es lo mismo que saltar, mismo gesto que
      // el dino de Chrome.
      jugadorY.current = 0;
      velocidadY.current = 0;
      saltando.current = false;
      obstaculos.current = [];
      trofeos.current = [];
      distancia.current = 0;
      velocidadJuego.current = 300;
      tiempoUltimoObstaculo.current = 0;
      puntosRef.current = 0;
      setPuntuacion(0);
      setEsNuevoRecord(false);
      setEstado("jugando");
      return;
    }
    if (!saltando.current) {
      saltando.current = true;
      velocidadY.current = -VELOCIDAD_SALTO;
    }
  }, [estado]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        salto();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [salto]);

  useEffect(() => {
    if (estado !== "jugando") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ultimoTs.current = null;

    const loop = (ts: number) => {
      const dt = ultimoTs.current ? Math.min((ts - ultimoTs.current) / 1000, 0.05) : 0;
      ultimoTs.current = ts;

      // Física del salto.
      if (saltando.current) {
        velocidadY.current += GRAVEDAD * dt;
        jugadorY.current += velocidadY.current * dt;
        if (jugadorY.current >= 0) {
          jugadorY.current = 0;
          velocidadY.current = 0;
          saltando.current = false;
        }
      }

      // Dificultad progresiva — suave, no un muro a los 10s.
      velocidadJuego.current = Math.min(300 + distancia.current * 0.012, 620);
      distancia.current += velocidadJuego.current * dt;
      puntosRef.current = distancia.current * 0.1;

      // Obstáculos: hueco entre spawns cada vez más corto, con un mínimo.
      tiempoUltimoObstaculo.current += dt;
      const huecoNecesario = Math.max(0.9, 1.8 - distancia.current / 4000);
      if (tiempoUltimoObstaculo.current > huecoNecesario) {
        tiempoUltimoObstaculo.current = 0;
        obstaculos.current.push({ x: ANCHO + 20, tipo: "senal" });
        // Trofeo flotante ocasional, a la altura justa de un salto.
        if (Math.random() < 0.5) {
          trofeos.current.push({ x: ANCHO + 90, y: SUELO_Y - 70, cogido: false });
        }
      }

      for (const o of obstaculos.current) o.x -= velocidadJuego.current * dt;
      obstaculos.current = obstaculos.current.filter((o) => o.x > -30);
      for (const t of trofeos.current) t.x -= velocidadJuego.current * dt;
      trofeos.current = trofeos.current.filter((t) => t.x > -30);

      // Colisiones — cajas simples, de sobra para este tamaño de sprite.
      const jugadorTop = SUELO_Y - JUGADOR_TAM + jugadorY.current;
      for (const o of obstaculos.current) {
        const golpea = o.x < JUGADOR_X + JUGADOR_TAM - 6 && o.x + 20 > JUGADOR_X + 6 && jugadorTop + JUGADOR_TAM > SUELO_Y - 26;
        if (golpea) {
          terminar();
          return;
        }
      }
      for (const t of trofeos.current) {
        if (t.cogido) continue;
        const dx = t.x - (JUGADOR_X + JUGADOR_TAM / 2);
        const dy = t.y - (jugadorTop + JUGADOR_TAM / 2);
        if (Math.hypot(dx, dy) < 26) {
          t.cogido = true;
          puntosRef.current += 25;
        }
      }

      // --- Dibujo ---
      ctx.clearRect(0, 0, ANCHO, ALTO);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(0, SUELO_Y, ANCHO, 2);

      // Jugador: rombo facetado, mismo lenguaje visual que ParagonMark en
      // la app — no un dinosaurio genérico, un trofeo propio de Paragon.
      const px = JUGADOR_X + JUGADOR_TAM / 2;
      const py = jugadorTop + JUGADOR_TAM / 2;
      ctx.save();
      ctx.translate(px, py);
      ctx.fillStyle = "#1687ff";
      ctx.beginPath();
      ctx.moveTo(0, -JUGADOR_TAM / 2);
      ctx.lineTo(JUGADOR_TAM / 2, -2);
      ctx.lineTo(0, JUGADOR_TAM / 2);
      ctx.lineTo(-JUGADOR_TAM / 2, -2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Obstáculos: icono de "sin señal" — tres barras rotas, en rojo.
      ctx.fillStyle = "#ff6b6b";
      for (const o of obstaculos.current) {
        for (let i = 0; i < 3; i++) {
          const h = 8 + i * 8;
          ctx.fillRect(o.x + i * 7, SUELO_Y - h, 5, h);
        }
      }

      // Trofeos flotantes: círculo dorado, apagado si ya cogido.
      for (const t of trofeos.current) {
        ctx.beginPath();
        ctx.fillStyle = t.cogido ? "rgba(226,181,62,0.15)" : "#e2b53e";
        ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      setPuntuacion(Math.round(puntosRef.current));
      frameId.current = requestAnimationFrame(loop);
    };

    frameId.current = requestAnimationFrame(loop);
    return () => {
      if (frameId.current) cancelAnimationFrame(frameId.current);
    };
  }, [estado, terminar]);

  return (
    <div className="mt-10 w-full max-w-[640px]">
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
        onClick={salto}
        role="button"
        tabIndex={0}
        aria-label="Cazador de Platinos — pulsa para saltar"
      >
        <canvas ref={canvasRef} width={ANCHO} height={ALTO} className="block w-full" style={{ imageRendering: "pixelated" }} />

        {estado !== "jugando" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 px-4 text-center backdrop-blur-sm">
            {estado === "esperando" ? (
              <>
                <p className="font-heading text-lg font-bold uppercase">Cazador de Platinos</p>
                <p className="max-w-xs text-sm text-muted">
                  Espacio o toca para saltar. Esquiva las señales rotas, coge los trofeos dorados.
                </p>
                <span className="mt-2 rounded-full px-4 py-2 text-xs font-bold uppercase" style={{ background: "var(--accent-grad)", color: "#061021" }}>
                  Jugar
                </span>
              </>
            ) : (
              <>
                <p className="font-heading text-2xl font-bold">{puntuacion} pts</p>
                {esNuevoRecord && <p className="text-xs font-bold text-accent">¡Nuevo récord personal!</p>}
                {sinSesion && <p className="text-xs text-muted">Entra en Paragon para guardar tu puntuación en el ranking.</p>}
                {enviando && <p className="text-xs text-muted">Guardando…</p>}
                <span className="mt-2 rounded-full px-4 py-2 text-xs font-bold uppercase" style={{ background: "var(--accent-grad)", color: "#061021" }}>
                  Otra vez
                </span>
              </>
            )}
          </div>
        )}

        {estado === "jugando" && (
          <div className="absolute right-3 top-3 font-heading text-sm font-bold text-foreground/80">{puntuacion}</div>
        )}
      </div>

      {ranking && ranking.top.length > 0 && (
        <div className="mt-4 rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <p className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted">Ranking — Cazador de Platinos</p>
          <div className="space-y-1.5">
            {ranking.top.slice(0, 5).map((fila, i) => (
              <div key={fila.userId} className="flex items-center justify-between text-sm">
                <span className="text-muted">
                  {i + 1}. {fila.name ?? fila.handle ?? "Jugador"}
                </span>
                <span className="font-bold text-foreground">{fila.score}</span>
              </div>
            ))}
          </div>
          {ranking.mia && (
            <p className="mt-2 text-xs text-muted">
              Tu mejor puntuación: {ranking.mia.score}{ranking.mia.puesto ? ` · puesto #${ranking.mia.puesto}` : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
