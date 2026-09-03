"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Avatar } from "./Avatar";
import { ThemeCustomizer } from "./ThemeCustomizer";

const LOGGED_IN_NAV = [
  { label: "Panel", href: "/", match: (p: string) => p === "/" },
  {
    label: "Biblioteca",
    href: (handle: string) => `/u/${handle}`,
    match: (p: string) => p.startsWith("/u/"),
  },
  {
    label: "Comunidad",
    href: "/feed",
    match: (p: string) => p.startsWith("/feed"),
  },
  {
    label: "Descubrir",
    href: "/descubrir",
    match: (p: string) => p.startsWith("/descubrir"),
  },
  {
    label: "Noticias",
    href: "/noticias",
    match: (p: string) => p.startsWith("/noticias"),
  },
  {
    label: "Ligas",
    href: "/ligas",
    match: (p: string) => p.startsWith("/ligas"),
  },
  {
    label: "Amigos",
    href: "/amigos",
    match: (p: string) => p.startsWith("/amigos") || p.startsWith("/comparar"),
  },
  {
    label: "Planificador",
    href: "/planificador",
    match: (p: string) => p.startsWith("/planificador"),
  },
  {
    label: "Rankings",
    href: "/rankings",
    match: (p: string) => p.startsWith("/rankings"),
  },
];

const LOGGED_OUT_NAV = [
  { label: "Inicio", href: "/", match: (p: string) => p === "/" },
  { label: "Noticias", href: "/noticias", match: (p: string) => p.startsWith("/noticias") },
  { label: "Ligas", href: "/ligas", match: (p: string) => p.startsWith("/ligas") },
  { label: "Cómo funciona", href: "/#biblioteca", match: (p: string) => false },
];

export function Header({
  user,
  avisosSinLeer = 0,
}: {
  user: {
    handle: string | null;
    name: string;
    image?: string | null;
    paragonLevel?: number | null;
    paragonProgress?: number | null;
    esDesarrollador?: boolean;
  } | null;
  /** Avisos pendientes, para el punto de la campana. */
  avisosSinLeer?: number;
}) {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const nav = user?.handle
    ? user.esDesarrollador
      ? [...LOGGED_IN_NAV, { label: "Admin", href: "/admin", match: (p: string) => p.startsWith("/admin") }]
      : LOGGED_IN_NAV
    : LOGGED_OUT_NAV;

  return (
    <header
      className="sticky top-0 z-40 border-b border-border backdrop-blur"
      // Translúcida sobre el fondo del tema, no un azul oscuro fijo: con el
      // color incrustado, en modo claro la cabecera se quedaba negra y el
      // texto (que sí sigue al tema) se volvía ilegible encima.
      style={{ background: "color-mix(in srgb, var(--background) 88%, transparent)" }}
    >
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:gap-[30px] sm:px-7">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/logo.jpg"
            alt="Paragon"
            className="h-[30px] w-[30px] rounded-[9px]"
            style={{
              boxShadow: "0 0 18px rgb(var(--accent-rgb) / 0.45)",
            }}
          />
          <span className="font-heading text-[18px] font-bold tracking-[0.06em]">PARAGON</span>
        </Link>

        {/* En móvil el <nav> de abajo está oculto (`sm:hidden` en la versión
            de escritorio de esta línea antes de esto): sin este botón no
            había ninguna forma de llegar a Comunidad, Noticias, Ligas,
            Amigos, Planificador o Rankings desde un móvil. */}
        <button
          onClick={() => setMenuAbierto((v) => !v)}
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
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
          {nav.map((item) => {
            const href = typeof item.href === "function" ? item.href(user?.handle ?? "") : item.href;
            const active = item.match(pathname);

            return (
              <Link
                key={item.label}
                href={href}
                className="rounded-lg px-3.5 py-1.5 text-[13px] font-semibold tracking-[0.04em] transition-all duration-300 hover:text-white hover:shadow-[0_0_15px_rgb(var(--accent-rgb) / 0.2)]"
                style={
                  active
                    ? { background: "rgb(var(--accent-rgb) / 0.12)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent-text)" }
                    : { background: "none", border: "1px solid transparent", color: "var(--muted)" }
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3.5">
          {user && (
            <Link
              href="/avisos"
              aria-label={
                avisosSinLeer > 0 ? `Avisos: ${avisosSinLeer} sin leer` : "Avisos"
              }
              className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:text-foreground"
              style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>

              {/* Solo el punto, sin número: el número exacto ya está dentro, y
                  aquí lo único que importa es si hay algo o no. */}
              {avisosSinLeer > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
                  style={{ background: "var(--accent)", border: "2px solid var(--background)" }}
                />
              )}
            </Link>
          )}

          <ThemeCustomizer />

          {user ? (
            <>
              {user.paragonLevel != null && (
                <Link
                  href={user.handle ? `/u/${user.handle}#nivel-paragon` : "/"}
                  className="hidden items-center gap-2.5 rounded-full py-1.5 pl-2 pr-3 transition-colors hover:bg-[var(--surface-2)] sm:flex"
                  style={{ background: "var(--surface)", border: "1px solid #202836" }}
                  title="Ver progreso del nivel Paragon"
                >
                  <span
                    className="h-[26px] w-[26px] rounded-full"
                    style={{ background: `conic-gradient(var(--accent) 0%, var(--accent) ${user.paragonProgress ?? 0}%, #212a3a ${user.paragonProgress ?? 0}%, #212a3a 100%)` }}
                  />
                  <span className="font-heading text-sm font-bold tracking-[0.04em]">NV {user.paragonLevel}</span>
                </Link>
              )}
              <Link
                href="/ajustes"
                className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
              >
                <Avatar src={user.image} name={user.name} size={32} />
                {user.handle && (
                  <span className="hidden text-[13px] font-semibold" style={{ color: "#b9c2cc" }}>
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
                Entrar
              </Link>
              <Link
                href="/entrar"
                className="shrink-0 rounded-lg px-4 py-2 text-[13px] font-bold text-background transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgb(var(--accent-rgb) / 0.6)]"
                style={{ background: "var(--accent-grad)", boxShadow: "0 8px 24px rgb(var(--accent-rgb) / 0.25)" }}
              >
                Crear cuenta
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
                  key={item.label}
                  href={href}
                  onClick={() => setMenuAbierto(false)}
                  className="rounded-lg px-3.5 py-2.5 text-[14px] font-semibold tracking-[0.02em] transition-colors hover:text-foreground"
                  style={
                    active
                      ? { background: "rgb(var(--accent-rgb) / 0.12)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent-text)" }
                      : { background: "none", border: "1px solid transparent", color: "var(--muted)" }
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
