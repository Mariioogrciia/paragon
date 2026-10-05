"use client";

import { useState } from "react";

/** Iniciales de un nombre ("Team Vitality" → "TV"), para cuando no hay imagen. */
export function iniciales(nombre: string): string {
  return (
    nombre
      .replace(/[^\p{L}\p{N} ]/gu, "")
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 3)
      .toUpperCase() || "?"
  );
}

/**
 * Escudo de equipo (o foto de jugador con `redondo`); si no hay imagen o
 * falla la carga, sus iniciales en una ficha del mismo tamaño.
 */
export function Escudo({ logo, name, size, redondo = false }: { logo: string | null; name: string; size: number; redondo?: boolean }) {
  const [fallo, setFallo] = useState(false);
  const forma = redondo ? "rounded-full" : "rounded-lg";

  if (!logo || fallo) {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size, fontSize: `${Math.max(9, size * 0.34) / 16}rem` }}
        className={`flex shrink-0 items-center justify-center border border-border bg-surface-2 font-heading font-bold text-muted ${forma}`}
      >
        {iniciales(name)}
      </span>
    );
  }
  return (
    <span
      style={{ width: size, height: size, padding: redondo ? 0 : Math.round(size * 0.12) }}
      className={`flex shrink-0 items-center justify-center overflow-hidden ${redondo ? "bg-surface-2" : "bg-white"} ${forma}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- imágenes de PandaScore en su CDN */}
      <img
        loading="lazy"
        decoding="async"
        src={logo}
        alt=""
        onError={() => setFallo(true)}
        className={redondo ? "h-full w-full object-cover object-top" : "max-h-full max-w-full object-contain"}
      />
    </span>
  );
}
