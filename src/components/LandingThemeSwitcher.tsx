"use client";

import { useTranslations } from "next-intl";
import { useApariencia } from "@/lib/apariencia";

// Una muestra del propio estilo en el botón (esquina, borde, fuente) en vez de un emoji.
const DEMO_STYLES = [
  { id: "", clave: "clasico", muestra: "rounded-lg" },
  { id: "estilo-brutalista", clave: "brutalista", muestra: "rounded-none uppercase" },
  { id: "estilo-ps5", clave: "consola", muestra: "rounded-full" },
  { id: "estilo-terminal", clave: "hacker", muestra: "rounded-sm font-mono" },
] as const;

export function LandingThemeSwitcher() {
  const t = useTranslations("Shell.Home.landing");
  const { elegirEstilo, estilo, montado } = useApariencia();

  if (!montado) return null;

  return (
    <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      <p className="text-[0.8125rem] font-semibold text-muted">{t("temaTitulo")}</p>
      <div className="grid w-full max-w-xs grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:max-w-none sm:gap-2">
        {DEMO_STYLES.map((s) => {
          const activo = estilo === s.id;
          return (
            <button
              key={s.clave}
              type="button"
              aria-pressed={activo}
              onClick={() => elegirEstilo(s.id)}
              className={`px-2 py-1.5 text-xs font-bold sm:px-3.5 sm:text-[0.8125rem] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgb(var(--accent-rgb)/0.6)] ${s.muestra}`}
              style={
                activo
                  ? { background: "var(--accent)", color: "var(--background)", border: "1px solid var(--accent)" }
                  : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }
              }
            >
              {t(`temas.${s.clave}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
