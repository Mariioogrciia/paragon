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

export function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  
  const [abierto, setAbierto] = useState(false);
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
    startTransition(async () => {
      await updateLanguageAction(locale);
      router.refresh();
    });
  };

  const actual = IDIOMAS.find((i) => i.id === currentLocale) || IDIOMAS[0];

  return (
    <div className="relative" ref={panel}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        disabled={isPending}
        className="flex items-center justify-center h-9 w-9 rounded-full transition-colors hover:text-foreground"
        style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
        title="Cambiar idioma"
        aria-label="Cambiar idioma"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          <path d="M2 12h20" />
        </svg>
      </button>

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
