"use client";

import { useState } from "react";

interface Props {
  title: string;
  steamId?: string | null;
}

export function GameHeaderLogo({ title, steamId }: Props) {
  const [error, setError] = useState(false);

  if (!steamId || error) {
    return (
      <h1 className="mb-6 font-heading text-4xl font-bold uppercase leading-none tracking-[-0.01em] lg:text-[52px]">
        {title}
      </h1>
    );
  }

  return (
    <>
      {/* El logo de Steam ya es el título visualmente, pero es una imagen:
          sin esto la página se quedaba sin ningún <h1> real cuando el logo
          cargaba bien (confirmado en /juego/[id] en vivo) — un lector de
          pantalla navega por encabezados y no encontraba nada marcando de
          qué juego trata la ficha. */}
      <h1 className="sr-only">{title}</h1>
      <img
        src={`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${steamId}/logo.png`}
        alt={title}
        onError={() => setError(true)}
        className="mb-6 max-w-[320px] object-contain max-h-[140px] drop-shadow-2xl"
      />
    </>
  );
}
