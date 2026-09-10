"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { JuegoSinEmpezar } from "@/lib/backlog";

const CLAVE = "platinos:jugar-a-ciegas";
const DOS_HORAS_MS = 2 * 60 * 60 * 1000;

interface Prueba {
  gameId: string;
  finTs: number;
}

function leerPrueba(): Prueba | null {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return null;
    const p = JSON.parse(raw) as Prueba;
    if (!p.gameId || !p.finTs) return null;
    return p;
  } catch {
    return null;
  }
}

function formatoRestante(ms: number): string {
  const totalSeg = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

/**
 * "El Salón de la Vergüenza": juegos a 0% que llevan ahí esperando, con un
 * botón para elegir uno al azar y darle una prueba de 2 horas — quitar la
 * parálisis de elegir qué jugar. El temporizador vive solo en localStorage
 * de este navegador (no en la base): es un empujón personal, no algo que
 * necesite sincronizarse entre dispositivos ni que nadie más deba ver.
 */
export function SalonDeLaVerguenza({ juegos }: { juegos: JuegoSinEmpezar[] }) {
  const [prueba, setPrueba] = useState<Prueba | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    setPrueba(leerPrueba());
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  function elegirAlAzar() {
    if (juegos.length === 0) return;
    const elegido = juegos[Math.floor(Math.random() * juegos.length)];
    const nueva: Prueba = { gameId: elegido.gameId, finTs: Date.now() + DOS_HORAS_MS };
    try {
      localStorage.setItem(CLAVE, JSON.stringify(nueva));
    } catch {}
    setPrueba(nueva);
  }

  function terminarPrueba() {
    try {
      localStorage.removeItem(CLAVE);
    } catch {}
    setPrueba(null);
  }

  if (juegos.length === 0) return null;

  const juegoElegido = prueba ? juegos.find((g) => g.gameId === prueba.gameId) : null;
  const restanteMs = prueba ? prueba.finTs - ahora : 0;
  const pruebaActiva = prueba && juegoElegido && restanteMs > 0;

  return (
    <div className="rounded-2xl p-5" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <p className="mb-4 text-sm text-muted">
        {juegos.length} {juegos.length === 1 ? "juego" : "juegos"} esperando.
      </p>

      {pruebaActiva ? (
        <div className="flex flex-wrap items-center gap-3.5 rounded-xl p-4" style={{ border: "1px solid rgb(var(--accent-rgb) / 0.3)", background: "rgb(var(--accent-rgb) / 0.06)" }}>
          {juegoElegido!.iconUrl && (
            <img src={juegoElegido!.iconUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-muted">Prueba de 2 horas</p>
            <Link href={`/juego/${juegoElegido!.gameId}`} className="block truncate text-base font-bold hover:underline" title={juegoElegido!.titulo}>
              {juegoElegido!.titulo}
            </Link>
            <p className="text-xs text-muted">Quedan {formatoRestante(restanteMs)} para decidir si sigue o vuelve al fondo del montón.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={elegirAlAzar} className="rounded-lg px-3 py-2 text-xs font-semibold text-muted transition-colors hover:text-foreground" style={{ border: "1px solid var(--border)" }}>
              Otro
            </button>
            <button onClick={terminarPrueba} className="rounded-lg px-3 py-2 text-xs font-semibold text-muted transition-colors hover:text-foreground" style={{ border: "1px solid var(--border)" }}>
              Terminar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={elegirAlAzar}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-background transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgb(var(--accent-rgb)_/_0.6)]"
          style={{ background: "var(--accent-grad)" }}
        >
          🎲 Jugar a ciegas (prueba de 2h)
        </button>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {juegos.slice(0, 12).map((g) => (
          <Link
            key={g.gameId}
            href={`/juego/${g.gameId}`}
            title={g.titulo}
            className="transition-transform hover:-translate-y-0.5"
          >
            {g.iconUrl ? (
              <img src={g.iconUrl} alt={g.titulo} className="h-11 w-11 rounded-lg object-cover" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-lg text-[0.625rem] font-bold text-muted" style={{ background: "var(--surface-2)" }}>
                {g.titulo.slice(0, 2).toUpperCase()}
              </div>
            )}
          </Link>
        ))}
        {juegos.length > 12 && (
          <div className="flex h-11 w-11 items-center justify-center rounded-lg text-xs font-bold text-muted" style={{ background: "var(--surface-2)" }}>
            +{juegos.length - 12}
          </div>
        )}
      </div>
    </div>
  );
}
