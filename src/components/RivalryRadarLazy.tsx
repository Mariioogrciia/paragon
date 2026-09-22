"use client";

import dynamic from "next/dynamic";

// recharts es una librería pesada para algo que solo aparece en la página
// de comparación entre dos jugadores, más abajo del scroll inicial — se
// carga aparte del bundle principal en vez de ir en cada visita a
// /comparar/[handle]. El propio componente RivalryRadar ya es "use client";
// este wrapper solo decide CUÁNDO se descarga su JS.
export const RivalryRadarLazy = dynamic(
  () => import("./RivalryRadar").then((m) => m.RivalryRadar),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full animate-pulse rounded-2xl border border-border bg-surface/50" />
    ),
  }
);
