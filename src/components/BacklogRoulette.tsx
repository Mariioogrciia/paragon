"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { backlogFallbackAction } from "@/app/actions";
import { gameProgress } from "@/lib/stats";
import type { Game } from "@/lib/types";

/**
 * "¿A qué juego hoy?" — contra la parálisis por análisis de un backlog de
 * cientos de juegos. Elige al azar entre lo que está sin empezar o
 * abandonado hace tiempo; si eso está vacío (biblioteca corta, o todo ya
 * empezado), cae en recomendaciones por género favorito — mismo dato que
 * `/descubrir/recomendaciones`, no una búsqueda nueva a IGDB por juego
 * suelto.
 */

interface Candidato {
  title: string;
  iconUrl?: string;
  href: string;
  percent?: number;
}

const MENSAJES = [
  (t: string) => `Hoy toca sufrir: ${t}.`,
  (t: string) => `${t}. Sin excusas esta vez.`,
  (t: string) => `El destino ha hablado: ${t}.`,
  (t: string) => `${t} lleva demasiado tiempo esperando.`,
  (t: string) => `Nada de scrollear más: ${t}.`,
  (t: string) => `¿${t}? Podría ser peor.`,
];

function candidatosPropios(games: Game[], handle: string): Candidato[] {
  return games
    .filter((g) => !g.isWishlist)
    .filter((g) => {
      const { status } = gameProgress(g);
      return status === "sin-empezar" || status === "abandonado" || g.progressPercent < 15;
    })
    .map((g) => ({ title: g.title, iconUrl: g.iconUrl, href: `/u/${handle}/${g.id}`, percent: g.progressPercent }));
}

export function BacklogRoulette({ games, handle }: { games: Game[]; handle: string }) {
  const [abierto, setAbierto] = useState(false);
  const [girando, setGirando] = useState(false);
  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [vitrina, setVitrina] = useState<Candidato[]>([]);
  const [indiceVitrina, setIndiceVitrina] = useState(0);
  const [origen, setOrigen] = useState<"biblioteca" | "recomendado" | null>(null);

  async function jugar() {
    setAbierto(true);
    setGirando(true);
    setCandidato(null);

    let pool = candidatosPropios(games, handle);
    let deDonde: "biblioteca" | "recomendado" = "biblioteca";

    if (pool.length === 0) {
      const recomendados = await backlogFallbackAction();
      pool = recomendados.map((r) => ({ title: r.title, iconUrl: r.iconUrl, href: `/juego/${r.igdbId}` }));
      deDonde = "recomendado";
    }

    if (pool.length === 0) {
      setGirando(false);
      setCandidato(null);
      setOrigen(null);
      return;
    }

    const elegido = pool[Math.floor(Math.random() * pool.length)];

    // Tira de 16 portadas al azar (repitiendo el pool si hace falta) para el
    // efecto de tragaperras, terminando siempre en la elegida de verdad.
    const tira = Array.from({ length: 16 }, () => pool[Math.floor(Math.random() * pool.length)]);
    tira.push(elegido);
    setVitrina(tira);
    setIndiceVitrina(0);
    setOrigen(deDonde);

    let i = 0;
    const paso = () => {
      i++;
      setIndiceVitrina(i);
      if (i < tira.length - 1) {
        setTimeout(paso, 70 + i * 12); // se va frenando, como una tragaperras de verdad
      } else {
        setCandidato(elegido);
        setMensaje(MENSAJES[Math.floor(Math.random() * MENSAJES.length)](elegido.title));
        setGirando(false);
      }
    };
    setTimeout(paso, 70);
  }

  return (
    <>
      <button
        onClick={jugar}
        className="flex shrink-0 items-center gap-2 rounded-[9px] px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb)/0.4)]"
        style={{ background: "var(--accent-grad)" }}
      >
        🎲 ¿A qué juego hoy?
      </button>

      <AnimatePresence>
        {abierto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => !girando && setAbierto(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl p-6 text-center"
              style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
            >
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted">
                {girando ? "Girando…" : "La ruleta ha decidido"}
              </p>

              <div className="mx-auto mb-4 h-44 w-32 overflow-hidden rounded-xl bg-surface-2" style={{ border: "1px solid var(--border)" }}>
                {girando ? (
                  vitrina[indiceVitrina]?.iconUrl ? (
                    <img src={vitrina[indiceVitrina].iconUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl">🎮</div>
                  )
                ) : candidato?.iconUrl ? (
                  <img src={candidato.iconUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl">🎮</div>
                )}
              </div>

              {!girando && candidato && (
                <>
                  <p className="font-heading text-lg font-bold">{candidato.title}</p>
                  <p className="mt-2 text-sm text-muted">{mensaje}</p>
                  {origen === "recomendado" && (
                    <p className="mt-2 text-[11px] text-muted">
                      Tu backlog está limpio — esto es una recomendación por tus géneros favoritos, todavía no lo tienes.
                    </p>
                  )}
                  <div className="mt-5 flex justify-center gap-2.5">
                    <button
                      onClick={jugar}
                      className="rounded-lg px-4 py-2 text-xs font-bold text-muted transition-colors hover:text-foreground"
                      style={{ border: "1px solid var(--border)" }}
                    >
                      Otra vez
                    </button>
                    <Link
                      href={candidato.href}
                      className="rounded-lg px-4 py-2 text-xs font-bold text-background transition-all hover:-translate-y-0.5"
                      style={{ background: "var(--accent-grad)" }}
                    >
                      Vamos allá
                    </Link>
                  </div>
                </>
              )}

              {!girando && !candidato && (
                <p className="text-sm text-muted">
                  No hay nada que sugerir todavía — tu biblioteca está vacía o no hay recomendaciones para tus géneros.
                </p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
