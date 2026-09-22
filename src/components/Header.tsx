"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Avatar } from "./Avatar";
import { ThemeCustomizer } from "./ThemeCustomizer";
import { LanguageSwitcher } from "./LanguageSwitcher";

/**
 * Antes eran 9 enlaces en una sola fila (más "Admin" como un décimo, para
 * quien lo es) — se apretaban o directamente se salían del ancho en
 * pantallas medianas. Los cinco de más uso se quedan sueltos; el resto vive
 * detrás de "Más" (MenuMas, abajo), mismo patrón que "Más filtros" en la
 * biblioteca: no desaparece nada, solo deja de estar siempre a la vista.
 */
/**
 * `navKey`: casa con `NAV_OCULTABLE` (lib/navPreferences.ts) para poder
 * ocultarlo desde /ajustes/ocultar. Panel y Biblioteca no llevan clave —
 * son el núcleo de la app, no algo "opcional" que se pueda ocultar.
 */
const NAV_PRINCIPAL = [
  { labelKey: "panel", href: "/", match: (p: string) => p === "/" },
  {
    labelKey: "biblioteca",
    href: (handle: string) => `/u/${handle}`,
    match: (p: string) => p.startsWith("/u/"),
  },
  {
    labelKey: "comunidad",
    href: "/feed",
    match: (p: string) => p.startsWith("/feed"),
    navKey: "feed",
  },
  {
    labelKey: "ligas",
    href: "/ligas",
    match: (p: string) => p.startsWith("/ligas"),
    navKey: "ligas",
  },
  {
    labelKey: "amigos",
    href: "/amigos",
    match: (p: string) =>
      p.startsWith("/amigos") || p.startsWith("/comparar") || p.startsWith("/rankings"),
    navKey: "amigos",
  },
] as const;

const NAV_MAS = [
  {
    labelKey: "descubrir",
    href: "/descubrir",
    match: (p: string) => p.startsWith("/descubrir"),
    navKey: "descubrir",
  },
  {
    labelKey: "noticias",
    href: "/noticias",
    match: (p: string) => p.startsWith("/noticias"),
    navKey: "noticias",
  },
  {
    labelKey: "esports",
    href: "/esports",
    match: (p: string) => p.startsWith("/esports"),
    navKey: "esports",
  },
  {
    labelKey: "planificador",
    href: "/planificador",
    match: (p: string) => p.startsWith("/planificador"),
    navKey: "planificador",
  },
  {
    labelKey: "clanes",
    href: "/clanes",
    match: (p: string) => p.startsWith("/clanes"),
    navKey: "clanes",
  },
] as const;

const LOGGED_OUT_NAV = [
  { labelKey: "inicio", href: "/", match: (p: string) => p === "/" },
  { labelKey: "noticias", href: "/noticias", match: (p: string) => p.startsWith("/noticias") },
  { labelKey: "esports", href: "/esports", match: (p: string) => p.startsWith("/esports") },
  { labelKey: "ligas", href: "/ligas", match: (p: string) => p.startsWith("/ligas") },
  { labelKey: "comoFunciona", href: "/como-funciona", match: (p: string) => p.startsWith("/como-funciona") },
];

/** Desplegable de "Más": mismos enlaces que ya había, solo que agrupados. */
function MenuMas({
  pathname,
  activo,
  items,
}: {
  pathname: string;
  activo: boolean;
  items: typeof NAV_MAS[number][];
}) {
  const t = useTranslations("Shell.Header");
  const [abierto, setAbierto] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (panel.current && !panel.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={panel}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex items-center gap-1 rounded-lg px-3.5 py-1.5 text-[0.8125rem] font-semibold tracking-[0.04em] transition-all duration-300 hover:text-white hover:shadow-[0_0_15px_rgb(var(--accent-rgb) / 0.2)]"
        style={
          activo
            ? { background: "rgb(var(--accent-rgb) / 0.12)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent-text)" }
            : { background: "none", border: "1px solid transparent", color: "var(--muted)" }
        }
      >
        {t("nav.mas")}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {abierto && (
        <div
          className="absolute left-0 z-50 mt-2 w-48 rounded-xl p-1.5 shadow-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {items.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.labelKey}
                href={item.href}
                onClick={() => setAbierto(false)}
                className="block rounded-lg px-3 py-2 text-[0.8125rem] font-semibold transition-colors hover:text-foreground"
                style={active ? { color: "var(--accent-text)" } : { color: "var(--muted)" }}
              >
                {t(`nav.${item.labelKey}`)}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Header({
  user,
  navOculta = [],
  locale,
}: {
  user: {
    handle: string | null;
    name: string;
    image?: string | null;
    paragonLevel?: number | null;
    paragonProgress?: number | null;
    esDesarrollador?: boolean;
    racha?: { actual: number; hoyCuenta: boolean } | null;
  } | null;
  /** Claves de NAV_OCULTABLE que este usuario ha decidido no ver (/ajustes/ocultar). */
  navOculta?: string[];
  locale?: string;
}) {
  const t = useTranslations("Shell.Header");
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const ocultas = new Set(navOculta);
  const navPrincipalVisible = NAV_PRINCIPAL.filter((item) => !("navKey" in item) || !ocultas.has(item.navKey));
  const navMasVisible = NAV_MAS.filter((item) => !ocultas.has(item.navKey));
  // El menú móvil (el de la hamburguesa) sigue enseñando todo en una lista,
  // "Más" incluido — ahí no hace falta esconder nada, ya está detrás de un
  // botón. Admin no entra aquí: vive como icono junto al avatar (ver abajo).
  const nav = user?.handle ? [...navPrincipalVisible, ...navMasVisible] : LOGGED_OUT_NAV;
  const masActivo = navMasVisible.some((item) => item.match(pathname));

  return (
    <header
      className="sticky top-0 z-40 border-b border-border backdrop-blur"
      // Translúcida sobre el fondo del tema, no un azul oscuro fijo: con el
      // color incrustado, en modo claro la cabecera se quedaba negra y el
      // texto (que sí sigue al tema) se volvía ilegible encima.
      // Se añade paddingTop de safe-area-inset-top para que en móviles, con la
      // barra de estado transparente, la cabecera absorba ese espacio y el contenido
      // no quede oculto detrás del notch o la cámara.
      style={{
        background: "color-mix(in srgb, var(--background) 88%, transparent)",
        paddingTop: "env(safe-area-inset-top)"
      }}
    >
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:gap-[30px] sm:px-7">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Paragon"
            className="h-[30px] w-[30px]"
          />
          {/* Se esconde por debajo de 400px: con los iconos de la derecha,
              el nombre no cabia y acababa solapado con el boton de menu
              (visto en un iPhone real, no en el emulador). El logo sigue,
              asi que la marca no desaparece. */}
          <span className="hidden font-heading text-[1.125rem] font-bold tracking-[0.06em] min-[400px]:inline">
            PARAGON
          </span>
        </Link>

        {/* En móvil el <nav> de abajo está oculto (`sm:hidden` en la versión
            de escritorio de esta línea antes de esto): sin este botón no
            había ninguna forma de llegar a Comunidad, Noticias, Ligas,
            Amigos, Planificador o Rankings desde un móvil. */}
        <button
          onClick={() => setMenuAbierto((v) => !v)}
          aria-label={menuAbierto ? t("cerrarMenu") : t("abrirMenu")}
          aria-expanded={menuAbierto}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:text-foreground sm:hidden"
          style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {menuAbierto ? (
              <path d="M18 6 6 18M6 6l12 12" />
            ) : (
              <path d="M3 6h18M3 12h18M3 18h18" />
            )}
          </svg>
        </button>

        <nav className="hidden items-center gap-1 sm:flex">
          {(user?.handle ? navPrincipalVisible : LOGGED_OUT_NAV).map((item) => {
            const href = typeof item.href === "function" ? item.href(user?.handle ?? "") : item.href;
            const active = item.match(pathname);

            return (
              <Link
                key={item.labelKey}
                href={href}
                className="rounded-lg px-3.5 py-1.5 text-[0.8125rem] font-semibold tracking-[0.04em] transition-all duration-300 hover:text-white hover:shadow-[0_0_15px_rgb(var(--accent-rgb) / 0.2)]"
                style={
                  active
                    ? { background: "rgb(var(--accent-rgb) / 0.12)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent-text)" }
                    : { background: "none", border: "1px solid transparent", color: "var(--muted)" }
                }
              >
                {t(`nav.${item.labelKey}`)}
              </Link>
            );
          })}
          {user?.handle && <MenuMas pathname={pathname} activo={masActivo} items={navMasVisible} />}
        </nav>

        <div className="ml-auto flex items-center gap-3.5">
          {/* Tema y admin solo en escritorio: en movil viven dentro del menu
              de la hamburguesa. */}
          <span className="hidden sm:inline">
            <ThemeCustomizer />
          </span>
          <span className="hidden sm:inline">
            <LanguageSwitcher currentLocale={locale || "es"} />
          </span>

          {user ? (
            <>
              {user.racha && user.racha.actual > 0 && (
                <span
                  className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 sm:flex"
                  title={user.racha.hoyCuenta ? t("rachaSeguraHint") : t("rachaRiesgoHint")}
                  style={
                    user.racha.hoyCuenta
                      ? { background: "rgb(234 88 12 / 0.12)", border: "1px solid rgb(234 88 12 / 0.35)" }
                      : { background: "rgb(234 88 12 / 0.06)", border: "1px solid rgb(234 88 12 / 0.18)" }
                  }
                >
                  <span className={user.racha.hoyCuenta ? "" : "animate-pulse"} style={{ opacity: user.racha.hoyCuenta ? 1 : 0.55 }}>
                    🔥
                  </span>
                  <span className="font-heading text-sm font-bold" style={{ color: "#fb923c" }}>
                    {user.racha.actual}
                  </span>
                </span>
              )}
              {user.paragonLevel != null && (
                <Link
                  href={user.handle ? `/u/${user.handle}#nivel-paragon` : "/"}
                  className="hidden items-center gap-2.5 rounded-full py-1.5 pl-2 pr-3 transition-colors hover:bg-[var(--surface-2)] sm:flex"
                  style={{ background: "var(--surface)", border: "1px solid #202836" }}
                  title={t("verProgresoParagon")}
                >
                  <span
                    className="h-[26px] w-[26px] rounded-full"
                    style={{ background: `conic-gradient(var(--accent) 0%, var(--accent) ${user.paragonProgress ?? 0}%, #212a3a ${user.paragonProgress ?? 0}%, #212a3a 100%)` }}
                  />
                  <span className="font-heading text-sm font-bold tracking-[0.04em]">{t("nivelAbrev", { nivel: user.paragonLevel })}</span>
                </Link>
              )}
              {/* Antes "Admin" era un décimo enlace de texto metido entre los
                  demás — para quien no lo es, ese hueco ni se nota que
                  falta; para quien sí, un icono junto a su propio avatar es
                  más fácil de encontrar que rebuscar en una fila de nueve. */}
              {user.esDesarrollador && (
                <Link
                  href="/admin"
                  aria-label={t("panelAdministracion")}
                  title={t("panelAdministracion")}
                  className="hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:text-foreground sm:flex"
                  style={
                    pathname.startsWith("/admin")
                      ? { border: "1px solid rgb(var(--accent-rgb) / 0.4)", color: "var(--accent-text)", background: "rgb(var(--accent-rgb) / 0.12)" }
                      : { border: "1px solid var(--border)", color: "var(--muted)" }
                  }
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </Link>
              )}
              <Link
                href="/ajustes"
                className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
              >
                <Avatar src={user.image} name={user.name} size={32} />
                {user.handle && (
                  <span className="hidden text-[0.8125rem] font-semibold" style={{ color: "#b9c2cc" }}>
                    @{user.handle}
                  </span>
                )}
              </Link>
            </>
          ) : (
            <>
              {/* "Crear cuenta" ya lleva a /entrar; este texto es de sobra en
                  el poco sitio que hay en móvil, y las dos juntas eran lo
                  que sacaba la cabecera de los 375px de ancho. */}
              <Link href="/entrar" className="hidden text-sm text-muted hover:text-foreground sm:inline">
                {t("entrar")}
              </Link>
              <Link
                href="/entrar"
                className="shrink-0 rounded-lg px-4 py-2 text-[0.8125rem] font-bold text-background transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgb(var(--accent-rgb) / 0.6)]"
                style={{ background: "var(--accent-grad)", boxShadow: "0 8px 24px rgb(var(--accent-rgb) / 0.25)" }}
              >
                {t("crearCuenta")}
              </Link>
            </>
          )}
        </div>
      </div>

      {menuAbierto && (
        <nav
          className="border-t border-border px-3.5 py-3 sm:hidden"
          style={{ background: "var(--background)" }}
        >
          <div className="flex flex-col gap-1">
            {nav.map((item) => {
              const href = typeof item.href === "function" ? item.href(user?.handle ?? "") : item.href;
              const active = item.match(pathname);

              return (
                <Link
                  key={item.labelKey}
                  href={href}
                  onClick={() => setMenuAbierto(false)}
                  className="rounded-lg px-3.5 py-2.5 text-[0.875rem] font-semibold tracking-[0.02em] transition-colors hover:text-foreground"
                  style={
                    active
                      ? { background: "rgb(var(--accent-rgb) / 0.12)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent-text)" }
                      : { background: "none", border: "1px solid transparent", color: "var(--muted)" }
                  }
                >
                  {t(`nav.${item.labelKey}`)}
                </Link>
              );
            })}
          </div>

          {/* Lo que en escritorio son iconos sueltos de la barra. En movil no
              caben ahi (seis iconos desbordaban la cabecera y pisaban el
              logo), asi que viven aqui con su nombre escrito — que ademas se
              entiende mejor que un icono a secas. */}
          {user && (
            <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
              {user.racha && user.racha.actual > 0 && (
                <div className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-[0.875rem] font-semibold" style={{ color: "#fb923c" }}>
                  <span style={{ opacity: user.racha.hoyCuenta ? 1 : 0.55 }}>🔥</span>
                  {t("rachaMovil", { dias: user.racha.actual })}
                </div>
              )}
              <Link
                href="/ajustes/apariencia"
                onClick={() => setMenuAbierto(false)}
                className="rounded-lg px-3.5 py-2.5 text-[0.875rem] font-semibold text-muted transition-colors hover:text-foreground"
              >
                {t("apariencia")}
              </Link>
              <Link
                href="/ajustes"
                onClick={() => setMenuAbierto(false)}
                className="rounded-lg px-3.5 py-2.5 text-[0.875rem] font-semibold text-muted transition-colors hover:text-foreground"
              >
                {t("ajustes")}
              </Link>
              {user.esDesarrollador && (
                <Link
                  href="/admin"
                  onClick={() => setMenuAbierto(false)}
                  className="rounded-lg px-3.5 py-2.5 text-[0.875rem] font-semibold text-muted transition-colors hover:text-foreground"
                >
                  {t("panelAdministracion")}
                </Link>
              )}
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-border px-3.5">
            <LanguageSwitcher currentLocale={locale || "es"} />
          </div>
        </nav>
      )}
    </header>
  );
}
