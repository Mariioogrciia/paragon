import { getTranslations } from "next-intl/server";
import { PlayStationIcon, SteamIcon, XboxIcon, NintendoIcon, EpicGamesIcon, UbisoftIcon } from "@/lib/platformIcons";

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

export async function PlatformTiles() {
  const t = await getTranslations("Onboarding");

  const TILES: Tile[] = [
    {
      label: t("platformTiles.todo"),
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
    {
      label: t("platformTiles.recommendations"),
      href: "/descubrir/recomendaciones",
      bg: "var(--accent-grad)",
      fg: "var(--background)",
      icon: (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
        </svg>
      ),
    },
    { label: t("platformTiles.playstation"), href: "/descubrir/playstation", bg: "var(--surface-2)", fg: "var(--foreground)", icon: <PlayStationIcon size={22} /> },
    {
      label: t("platformTiles.xbox"),
      href: "/descubrir/xbox",
      bg: "var(--surface-2)",
      fg: "var(--foreground)",
      icon: <XboxIcon size={22} />,
    },
    { label: t("platformTiles.steam"), href: "/descubrir/steam", bg: "var(--surface-2)", fg: "var(--foreground)", icon: <SteamIcon size={22} /> },
    {
      label: t("platformTiles.nintendo"),
      bg: "var(--surface-2)",
      fg: "var(--foreground)",
      disabledNote: t("platformTiles.nintendoNote"),
      icon: <NintendoIcon size={22} />,
    },
    {
      label: t("platformTiles.epicGames"),
      bg: "var(--surface-2)",
      fg: "var(--foreground)",
      disabledNote: t("platformTiles.epicGamesNote"),
      icon: <EpicGamesIcon size={22} />,
    },
    {
      label: t("platformTiles.ubisoft"),
      bg: "var(--surface-2)",
      fg: "var(--foreground)",
      disabledNote: t("platformTiles.ubisoftNote"),
      icon: <UbisoftIcon size={22} />,
    },
  ];

  // `auto-rows-fr`: las filas de una rejilla se dimensionan por separado, asi
  // que la primera (con "RECOMENDACIONES" partido en dos lineas) salia mas
  // alta que la segunda — 87px frente a 75px. Con esto todas las celdas miden
  // igual, que es lo que se espera de una fila de iconos.
  return (
    <div className="mb-8 grid auto-rows-fr grid-cols-4 gap-2 sm:grid-cols-7">
      {TILES.map((t) =>
        t.href ? (
          <a
            key={t.label}
            href={t.href}
            className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl px-1.5 py-4 text-center transition-all sm:px-3"
            style={{ background: t.bg, color: t.fg }}
          >
            {t.icon}
            <span className="w-full break-words text-[0.625rem] font-bold uppercase leading-tight tracking-wide sm:text-xs">
              {t.label}
            </span>
          </a>
        ) : (
          <span
            key={t.label}
            title={t.disabledNote}
            className="flex min-w-0 cursor-not-allowed flex-col items-center justify-center gap-2 rounded-xl px-1.5 py-4 text-center opacity-50 sm:px-3"
            style={{ background: t.bg, color: t.fg }}
          >
            {t.icon}
            <span className="w-full break-words text-[0.625rem] font-bold uppercase leading-tight tracking-wide sm:text-xs">
              {t.label}
            </span>
          </span>
        ),
      )}
    </div>
  );
}
