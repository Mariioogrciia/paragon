"use client";

import type { ReactNode } from "react";
import { BANNER_PRESETS, bannerPresetKey, bannerPresetValue, type BannerPresetKey } from "@/lib/bannerPresets";

/**
 * Componentes de los banners de plataforma (arte SVG + selector). Las claves
 * y el (de)codificado del valor guardado viven en lib/bannerPresets.ts, sin
 * "use client", porque también los llama el Server Component del perfil
 * público — ver el porqué ahí.
 */

/** El arte en sí, en SVG: mismo componente para la miniatura del selector y
 * para el banner real del perfil — solo cambia el tamaño del contenedor. */
export function PlatformBanner({ preset, className }: { preset: BannerPresetKey; className?: string }) {
  const Art = ARTE[preset];
  return (
    <div className={className}>
      <Art />
    </div>
  );
}

/** Cada arte trae su propio `id` de patrón/gradiente namespaced con la clave
 * del preset: se pintan varios a la vez en el selector, y unos ids
 * compartidos entre SVGs distintos en la misma página se pisarían. */
const ARTE: Record<BannerPresetKey, () => ReactNode> = {
  ps5: () => (
    <svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <linearGradient id="ps5-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#050b1a" />
          <stop offset="100%" stopColor="#0f2a52" />
        </linearGradient>
      </defs>
      <rect width="400" height="150" fill="url(#ps5-bg)" />
      <path d="M-20 130 Q 120 40 220 110 T 460 60" stroke="#3fa9ff" strokeWidth="3" fill="none" opacity="0.7" />
      <path d="M-20 150 Q 140 70 260 140 T 460 90" stroke="#e8f4ff" strokeWidth="2" fill="none" opacity="0.4" />
      <path d="M-20 90 Q 100 10 240 70 T 460 30" stroke="#3fa9ff" strokeWidth="1.5" fill="none" opacity="0.3" />
      <circle cx="360" cy="35" r="16" fill="none" stroke="#e8f4ff" strokeWidth="1.5" opacity="0.5" />
    </svg>
  ),
  xbox: () => (
    <svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <linearGradient id="xbox-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#07130a" />
          <stop offset="100%" stopColor="#0e3a1c" />
        </linearGradient>
      </defs>
      <rect width="400" height="150" fill="url(#xbox-bg)" />
      {Array.from({ length: 6 }).map((_, i) => (
        <polygon
          key={i}
          points="20,0 40,12 40,36 20,48 0,36 0,12"
          transform={`translate(${20 + i * 62}, ${(i % 2 === 0 ? 20 : 70)}) scale(1.8)`}
          fill="none"
          stroke="#3ddc64"
          strokeWidth="1.2"
          opacity={0.35 + (i % 3) * 0.12}
        />
      ))}
    </svg>
  ),
  steam: () => (
    <svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <linearGradient id="steam-bg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0a0e17" />
          <stop offset="100%" stopColor="#152238" />
        </linearGradient>
        <pattern id="steam-grid" width="34" height="34" patternUnits="userSpaceOnUse">
          <path d="M0 17 H34 M17 0 V34" stroke="#2a9fd6" strokeWidth="0.6" opacity="0.25" />
        </pattern>
      </defs>
      <rect width="400" height="150" fill="url(#steam-bg)" />
      <rect width="400" height="150" fill="url(#steam-grid)" />
      <circle cx="330" cy="40" r="46" fill="none" stroke="#66c0f4" strokeWidth="1.5" opacity="0.5" />
      <circle cx="330" cy="40" r="8" fill="#66c0f4" opacity="0.7" />
    </svg>
  ),
  switch: () => (
    <svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <linearGradient id="switch-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#161616" />
          <stop offset="100%" stopColor="#2a2a2a" />
        </linearGradient>
      </defs>
      <rect width="400" height="150" fill="url(#switch-bg)" />
      <polygon points="0,0 170,0 90,150 0,150" fill="#e60012" opacity="0.85" />
      <polygon points="400,0 230,0 310,150 400,150" fill="#0ab9e6" opacity="0.85" />
      <polygon points="170,0 230,0 150,150 90,150" fill="#f5f5f5" opacity="0.08" />
    </svg>
  ),
  retro: () => (
    <svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <linearGradient id="retro-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a0b2e" />
          <stop offset="100%" stopColor="#3a1259" />
        </linearGradient>
        <pattern id="retro-scan" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="2" fill="black" opacity="0.15" />
        </pattern>
      </defs>
      <rect width="400" height="150" fill="url(#retro-bg)" />
      <circle cx="200" cy="80" r="60" fill="#ff2d95" opacity="0.25" />
      <circle cx="200" cy="80" r="36" fill="#ffd23f" opacity="0.2" />
      <rect width="400" height="150" fill="url(#retro-scan)" />
    </svg>
  ),
  paragon: () => (
    <svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <linearGradient id="paragon-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#050912" />
          <stop offset="100%" stopColor="rgb(var(--accent-rgb) / 0.35)" />
        </linearGradient>
      </defs>
      <rect width="400" height="150" fill="url(#paragon-bg)" />
      {/* facetas, como el corte de una gema/trofeo */}
      <polygon points="200,15 260,75 200,135 140,75" fill="none" stroke="rgb(var(--accent-rgb))" strokeWidth="1.5" opacity="0.55" />
      <polygon points="200,45 230,75 200,105 170,75" fill="rgb(var(--accent-rgb))" opacity="0.25" />
      <line x1="140" y1="75" x2="260" y2="75" stroke="rgb(var(--accent-rgb))" strokeWidth="1" opacity="0.35" />
      <line x1="200" y1="15" x2="200" y2="135" stroke="rgb(var(--accent-rgb))" strokeWidth="1" opacity="0.35" />
    </svg>
  ),
};

/** Selector de banner de plataforma para /ajustes. */
export function BannerPresetPicker({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
}) {
  const activo = bannerPresetKey(value);

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
      {BANNER_PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(bannerPresetValue(p.key))}
          aria-pressed={activo === p.key}
          className="group flex flex-col gap-1.5"
        >
          <span
            className="block h-14 overflow-hidden rounded-lg border-2 transition-transform group-hover:scale-105"
            style={{ borderColor: activo === p.key ? "var(--accent)" : "var(--border)" }}
          >
            <PlatformBanner preset={p.key} className="h-full w-full" />
          </span>
          <span className="text-center text-[11px] font-semibold text-muted group-hover:text-foreground">
            {p.label}
          </span>
        </button>
      ))}
    </div>
  );
}
