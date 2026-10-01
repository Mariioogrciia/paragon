"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { EyeOff, Gamepad2, Palette, ShieldCheck, Sparkles, UserRound, type LucideIcon } from "lucide-react";

const GRUPOS: { clave: "grupoPerfil" | "grupoCuenta" | "grupoPanel"; items: { href: string; clave: string; icono: LucideIcon }[] }[] = [
  {
    clave: "grupoPerfil",
    items: [
      { href: "/ajustes", clave: "general", icono: UserRound },
      { href: "/ajustes/apariencia", clave: "apariencia", icono: Palette },
      { href: "/ajustes/escaparate", clave: "escaparate", icono: Sparkles },
    ],
  },
  {
    clave: "grupoCuenta",
    items: [
      { href: "/ajustes/seguridad", clave: "seguridad", icono: ShieldCheck },
      { href: "/ajustes/plataformas", clave: "plataformas", icono: Gamepad2 },
    ],
  },
  {
    clave: "grupoPanel",
    items: [{ href: "/ajustes/ocultar", clave: "ocultar", icono: EyeOff }],
  },
];

/**
 * Extraído de `ajustes/layout.tsx` (que es un Server Component, por la
 * llamada a `auth()`) porque saber en qué sección estás requiere
 * `usePathname()`, que solo existe en cliente.
 *
 * `/ajustes` necesita comparación EXACTA, no `startsWith` como el resto:
 * es el prefijo de todas las demás rutas de este menú.
 *
 * Panel de control refinado (1 oct 2026): mismas seis secciones, ahora con
 * icono y agrupadas. En móvil es una tira horizontal con scroll; desde `md`,
 * menú lateral fijo.
 */
export function AjustesNav() {
  const pathname = usePathname();
  const t = useTranslations("Onboarding");

  return (
    <nav aria-label={t("ajustesNav.titulo")} className="ajustes-nav">
      {GRUPOS.map((grupo) => (
        <div key={grupo.clave} className="ajustes-nav-grupo">
          <p className="ajustes-nav-rotulo">{t(`ajustesNav.${grupo.clave}`)}</p>
          {grupo.items.map((item) => {
            const activo = item.href === "/ajustes" ? pathname === item.href : pathname.startsWith(item.href);
            const Icono = item.icono;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className="ajustes-nav-enlace rounded-lg"
              >
                <Icono size={16} aria-hidden="true" className="shrink-0" />
                {t(`ajustesNav.${item.clave}`)}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
