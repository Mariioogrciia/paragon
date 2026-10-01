import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PlayStationIcon, SteamIcon, XboxIcon, EpicGamesIcon } from "@/lib/platformIcons";

/**
 * Accesos rápidos de /descubrir: "Todo" ancla a la lista multiplataforma de
 * la propia portada, "Recomendaciones" a la página personal y luego solo las
 * plataformas que Paragon sincroniza de verdad (PlayStation, Xbox, Steam,
 * Epic), cada una con su página.
 *
 * Nintendo y Ubisoft se quitaron (1 oct 2026): no sincronizan y salían
 * deshabilitados, ocupando sitio para nada. Cada plataforma va sobre el color
 * de su marca con el logo en blanco — el logo de PlayStation, azul oscuro,
 * casi no se veía sobre la superficie del tema.
 */

interface Acceso {
  label: string;
  href: string;
  /** Color de marca; sin él, el acceso va en los colores del tema. */
  marca?: string;
  icon: React.ReactNode;
  destacado?: boolean;
}

export async function PlatformTiles() {
  const t = await getTranslations("Onboarding");

  const ACCESOS: Acceso[] = [
    {
      label: t("platformTiles.todo"),
      href: "#multiplataforma",
      icon: (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      destacado: true,
      icon: (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
        </svg>
      ),
    },
    { label: t("platformTiles.playstation"), href: "/descubrir/playstation", marca: "#0070d1", icon: <PlayStationIcon size={26} /> },
    { label: t("platformTiles.xbox"), href: "/descubrir/xbox", marca: "#107c10", icon: <XboxIcon size={24} /> },
    { label: t("platformTiles.steam"), href: "/descubrir/steam", marca: "#1b2838", icon: <SteamIcon size={24} /> },
    { label: t("platformTiles.epicGames"), href: "/descubrir/epic", marca: "#2a2a2a", icon: <EpicGamesIcon size={24} /> },
  ];

  return (
    <nav aria-label={t("platformTiles.todo")} className="mb-8 grid auto-rows-fr grid-cols-3 gap-2 sm:grid-cols-6">
      {ACCESOS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={`${a.marca ? "acceso-plataforma " : ""}flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl px-1.5 py-4 text-center transition-all sm:px-3`}
          style={
            a.marca
              ? { background: `linear-gradient(150deg, ${a.marca}, color-mix(in srgb, ${a.marca} 55%, black))`, color: "#fff" }
              : a.destacado
                ? { background: "var(--accent-grad)", color: "var(--background)" }
                : { background: "var(--surface-2)", color: "var(--foreground)" }
          }
        >
          {a.icon}
          <span className="w-full break-words text-[0.625rem] font-bold uppercase leading-tight tracking-wide sm:text-xs">{a.label}</span>
        </Link>
      ))}
    </nav>
  );
}
