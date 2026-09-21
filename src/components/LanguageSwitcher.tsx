"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateLanguageAction } from "@/app/actions";

const IDIOMAS = [
  { id: "es", label: "Español", flag: "🇪🇸" },
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "de", label: "Deutsch", flag: "🇩🇪" },
  { id: "fr", label: "Français", flag: "🇫🇷" },
];

/** Texto del overlay de carga, en el idioma de ANTES de cambiar — el nuevo
 *  todavía no ha llegado del servidor mientras esto está en pantalla. */
const CAMBIANDO: Record<string, string> = {
  es: "Cambiando de idioma…",
  en: "Switching language…",
  de: "Sprache wird geändert…",
  fr: "Changement de langue…",
};

/** Si falla la petición (red, servidor reiniciando…), este es el aviso —
 *  nunca la pantalla genérica de "Algo se ha roto" de toda la app por algo
 *  tan menor como no poder cambiar el idioma. */
const FALLO: Record<string, string> = {
  es: "No se pudo cambiar. Inténtalo de nuevo.",
  en: "Couldn't switch. Try again.",
  de: "Wechsel fehlgeschlagen. Erneut versuchen.",
  fr: "Échec du changement. Réessaie.",
};

export function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [abierto, setAbierto] = useState(false);
  const [fallo, setFallo] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (panel.current && !panel.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  const handleLanguageChange = (locale: string) => {
    setAbierto(false);
    setFallo(false);
    startTransition(async () => {
      try {
        await updateLanguageAction(locale);
        router.refresh();
      } catch {
        // Red caída, servidor reiniciando... — se queda en el idioma actual
        // en vez de tumbar la app entera con la pantalla de error genérica.
        setFallo(true);
      }
    });
  };

  const actual = IDIOMAS.find((i) => i.id === currentLocale) || IDIOMAS[0];

  return (
    <div className="relative" ref={panel}>
      {isPending && (
        <div
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-3"
          style={{ background: "rgba(6, 8, 13, 0.6)", backdropFilter: "blur(2px)" }}
          aria-live="polite"
          aria-busy="true"
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            className="animate-spin"
            style={{ color: "var(--accent)" }}
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <p className="text-sm font-semibold text-white/90">{CAMBIANDO[currentLocale] ?? CAMBIANDO.es}</p>
        </div>
      )}

      <button
        onClick={() => {
          setFallo(false);
          setAbierto((v) => !v);
        }}
        aria-expanded={abierto}
        disabled={isPending}
        className="flex items-center justify-center h-9 w-9 rounded-full transition-colors hover:text-foreground disabled:opacity-60"
        style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
        title="Cambiar idioma"
        aria-label="Cambiar idioma"
      >
        {isPending ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            <path d="M2 12h20" />
          </svg>
        )}
      </button>

      {fallo && !isPending && (
        <div
          role="alert"
          className="absolute right-0 z-50 mt-2 w-48 rounded-lg px-3 py-2 text-xs font-semibold shadow-lg"
          style={{ background: "var(--surface)", border: "1px solid rgb(239 68 68 / 0.4)", color: "rgb(248 113 113)" }}
        >
          {FALLO[currentLocale] ?? FALLO.es}
        </div>
      )}

      {abierto && (
        <div
          className="absolute right-0 z-50 mt-2 w-40 rounded-xl p-1.5 shadow-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {IDIOMAS.map((item) => {
            const active = item.id === currentLocale;
            return (
              <button
                key={item.id}
                onClick={() => handleLanguageChange(item.id)}
                className="w-full text-left rounded-lg px-3 py-2 text-[0.8125rem] font-semibold transition-colors flex items-center justify-between"
                style={active ? { color: "var(--accent-text)", background: "rgb(var(--accent-rgb) / 0.12)" } : { color: "var(--muted)" }}
              >
                <span className="flex items-center gap-2">
                  <span>{item.flag}</span>
                  {item.label}
                </span>
                {active && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
