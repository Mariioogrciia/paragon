"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    label: "Rivales",
    href: "/amigos",
    match: (p: string) => p.startsWith("/amigos") || p.startsWith("/comparar"),
  },
];

const LOGGED_OUT_NAV = [
  { label: "Inicio", href: "/", match: (p: string) => p === "/" },
  { label: "Cómo funciona", href: "/#biblioteca", match: (p: string) => false },
];

export function Header({
  user,
}: {
  user: {
    handle: string | null;
    name: string;
    image?: string | null;
    trophyLevel?: number | null;
  } | null;
}) {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-40 border-b border-border backdrop-blur"
      style={{ background: "rgba(10, 13, 19, 0.88)" }}
    >
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-[30px] px-7">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px]"
            style={{
              background: "linear-gradient(150deg, #9fd4ec, #4a9eff 70%)",
              boxShadow: "0 0 18px rgba(74, 158, 255, 0.45)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: "#08111f" }}>
              <path
                d="M7 4h10v5a5 5 0 0 1-10 0V4Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path d="M12 14v3m-3.5 3h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-heading text-[18px] font-bold tracking-[0.06em]">PLATINOS</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {(user?.handle ? LOGGED_IN_NAV : LOGGED_OUT_NAV).map((item) => {
            const href = typeof item.href === "function" ? item.href(user?.handle ?? "") : item.href;
            const active = item.match(pathname);

            return (
              <Link
                key={item.label}
                href={href}
                className="rounded-lg px-3.5 py-1.5 text-[13px] font-semibold tracking-[0.04em] transition-all duration-300 hover:text-white hover:shadow-[0_0_15px_rgba(74,158,255,0.2)]"
                style={
                  active
                    ? { background: "rgba(74, 158, 255, 0.12)", border: "1px solid rgba(74, 158, 255, 0.3)", color: "#cfe4ff" }
                    : { background: "none", border: "1px solid transparent", color: "#8794a8" }
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3.5">
          <ThemeCustomizer />

          {user ? (
            <>
              {user.trophyLevel != null && (
                <span
                  className="hidden items-center gap-2.5 rounded-full py-1.5 pl-2 pr-3 sm:flex"
                  style={{ background: "#121721", border: "1px solid #202836" }}
                >
                  <span
                    className="h-[26px] w-[26px] rounded-full"
                    style={{ background: "conic-gradient(#4a9eff 0turn, #4a9eff 0.68turn, #212a3a 0.68turn, #212a3a 1turn)" }}
                  />
                  <span className="font-heading text-sm font-bold tracking-[0.04em]">NV {user.trophyLevel}</span>
                </span>
              )}
              <Link
                href="/ajustes"
                className="flex items-center gap-2.5"
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
              <Link href="/entrar" className="text-sm text-muted hover:text-foreground">
                Entrar
              </Link>
              <Link
                href="/entrar"
                className="rounded-lg px-4 py-2 text-[13px] font-bold text-background transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(74,158,255,0.6)]"
                style={{ background: "var(--accent-grad)", boxShadow: "0 8px 24px rgba(74, 158, 255, 0.25)" }}
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
