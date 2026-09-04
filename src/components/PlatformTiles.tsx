import { PlayStationIcon, SteamIcon, XboxIcon, NintendoIcon, EpicGamesIcon } from "@/lib/platformIcons";

/**
 * Fila de accesos rápidos por plataforma en /descubrir. "Todo" ancla al
 * grupo multiplataforma de la propia portada; PlayStation y Steam llevan a
 * su página propia (`/descubrir/[plataforma]`, ver lib/platformHub.ts). Xbox,
 * Nintendo y Epic salen sin enlace, con el mismo aviso de "en fase de
 * desarrollo" que ya usa /ajustes/plataformas — no tienen biblioteca
 * sincronizable todavía, así que una página propia no tendría datos reales
 * que enseñar.
 */

interface Tile {
  label: string;
  href?: string;
  bg: string;
  fg: string;
  icon: React.ReactNode;
  disabledNote?: string;
}

const TILES: Tile[] = [
  {
    label: "Todo",
    href: "#multiplataforma",
    bg: "var(--surface-2)",
    fg: "var(--foreground)",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  { label: "PlayStation", href: "/descubrir/playstation", bg: "#0f3d8a", fg: "#ffffff", icon: <PlayStationIcon size={22} /> },
  {
    label: "Xbox",
    bg: "#0e7a0d",
    fg: "#ffffff",
    disabledNote: "Xbox se puede vincular, pero Descubrir aún no tiene una sección propia para su catálogo (en fase de desarrollo).",
    icon: <XboxIcon size={22} />,
  },
  { label: "Steam", href: "/descubrir/steam", bg: "#1b2838", fg: "#ffffff", icon: <SteamIcon size={22} /> },
  {
    label: "Nintendo",
    bg: "#b3121a",
    fg: "#ffffff",
    disabledNote: "Los juegos de Switch se registran a mano en tu biblioteca — Descubrir aún no tiene una sección propia para ellos (en fase de desarrollo).",
    icon: <NintendoIcon size={22} />,
  },
  {
    label: "Epic Games",
    bg: "#2a2a2a",
    fg: "#ffffff",
    disabledNote: "Epic Games se puede vincular, pero Descubrir aún no tiene una sección propia para su catálogo (en fase de desarrollo).",
    icon: <EpicGamesIcon size={22} />,
  },
];

export function PlatformTiles() {
  return (
    <div className="mb-8 grid grid-cols-3 gap-2 sm:grid-cols-6">
      {TILES.map((t) =>
        t.href ? (
          <a
            key={t.label}
            href={t.href}
            className="flex flex-col items-center justify-center gap-2 rounded-xl px-3 py-4 text-center transition-all"
            style={{ background: t.bg, color: t.fg }}
          >
            {t.icon}
            <span className="text-xs font-bold uppercase tracking-wide">{t.label}</span>
          </a>
        ) : (
          <span
            key={t.label}
            title={t.disabledNote}
            className="flex cursor-not-allowed flex-col items-center justify-center gap-2 rounded-xl px-3 py-4 text-center opacity-50"
            style={{ background: t.bg, color: t.fg }}
          >
            {t.icon}
            <span className="text-xs font-bold uppercase tracking-wide">{t.label}</span>
          </span>
        ),
      )}
    </div>
  );
}
