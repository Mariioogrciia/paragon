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
    <img
      src={`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${steamId}/logo.png`}
      alt={title}
      onError={() => setError(true)}
      className="mb-6 max-w-[320px] object-contain max-h-[140px] drop-shadow-2xl"
    />
  );
}
