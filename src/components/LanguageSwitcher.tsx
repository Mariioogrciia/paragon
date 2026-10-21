"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateLanguageAction } from "@/app/actions";

const IDIOMAS = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
  { id: "de", label: "Deutsch" },
  { id: "it", label: "Italiano" },
  { id: "pt", label: "Português" },
];

/**
 * Banderas redondas dibujadas en SVG (21 oct 2026): los emojis de bandera
 * no existen en Windows (salen las letras "ES", "GB"...), así que el
 * selector se veía distinto en cada sistema.
 */
function Bandera({ idioma, size = 20 }: { idioma: string; size?: number }) {
  const contenido: Record<string, React.ReactNode> = {
    es: (
      <>
        <rect width="20" height="20" fill="#c60b1e" />
        <rect y="5" width="20" height="10" fill="#ffc400" />
      </>
    ),
    fr: (
      <>
        <rect width="20" height="20" fill="#fff" />
        <rect width="6.67" height="20" fill="#002395" />
        <rect x="13.33" width="6.67" height="20" fill="#ed2939" />
      </>
    ),
    de: (
      <>
        <rect width="20" height="6.67" fill="#000" />
        <rect y="6.67" width="20" height="6.67" fill="#dd0000" />
        <rect y="13.33" width="20" height="6.67" fill="#ffce00" />
      </>
    ),
    it: (
      <>
        <rect width="20" height="20" fill="#fff" />
        <rect width="6.67" height="20" fill="#009246" />
        <rect x="13.33" width="6.67" height="20" fill="#ce2b37" />
      </>
    ),
    pt: (
      <>
        <rect width="20" height="20" fill="#da291c" />
        <rect width="8" height="20" fill="#046a38" />
        <circle cx="8" cy="10" r="3.2" fill="#ffe000" />
        <circle cx="8" cy="10" r="1.8" fill="#da291c" />
      </>
    ),
    en: (
      <>
        <rect width="20" height="20" fill="#fff" />
        {[0, 2, 4, 6, 8, 10, 12].map((i) => (
          <rect key={i} y={i * (20 / 13)} width="20" height={20 / 13} fill="#b22234" />
        ))}
        <rect width="10" height={(20 / 13) * 7} fill="#3c3b6e" />
        {[2, 5, 8].flatMap((x) => [2.5, 5.5, 8.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.7" fill="#fff" />))}
      </>
    ),
  };
  return (
    <span
      className="inline-flex shrink-0 overflow-hidden rounded-full"
      style={{ width: size, height: size, boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.15)" }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 20 20" width={size} height={size} className="block">
        {contenido[idioma] ?? <rect width="20" height="20" fill="var(--surface-2)" />}
      </svg>
    </span>
  );
}

/** Texto del overlay de carga, en el idioma de ANTES de cambiar — el nuevo
 *  todavía no ha llegado del servidor mientras esto está en pantalla. */
const CAMBIANDO: Record<string, string> = {
  es: "Cambiando de idioma…",
  en: "Switching language…",
  de: "Sprache wird geändert…",
  fr: "Changement de langue…",
  it: "Cambio della lingua…",
  pt: "A mudar de idioma…",
};

/** Si falla la petición (red, servidor reiniciando…), este es el aviso —
 *  nunca la pantalla genérica de "Algo se ha roto" de toda la app por algo
 *  tan menor como no poder cambiar el idioma. */
const FALLO: Record<string, string> = {
  es: "No se pudo cambiar. Inténtalo de nuevo.",
  en: "Couldn't switch. Try again.",
  de: "Wechsel fehlgeschlagen. Erneut versuchen.",
  fr: "Échec du changement. Réessaie.",
  it: "Impossibile cambiare. Riprova.",
  pt: "Não foi possível mudar. Tenta de novo.",
};

const CAMBIAR_IDIOMA: Record<string, string> = {
  es: "Cambiar idioma",
  en: "Change language",
  de: "Sprache ändern",
  fr: "Changer de langue",
  it: "Cambia lingua",
  pt: "Mudar idioma",
};

export function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const actual = IDIOMAS.find((i) => i.id === currentLocale) ?? IDIOMAS[1];
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
        aria-haspopup="menu"
        className="flex h-9 items-center gap-2 rounded-full pl-1.5 pr-2.5 text-[0.8125rem] font-semibold transition-colors hover:text-foreground disabled:opacity-60"
        style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}
        title={CAMBIAR_IDIOMA[currentLocale] ?? CAMBIAR_IDIOMA.es}
        aria-label={CAMBIAR_IDIOMA[currentLocale] ?? CAMBIAR_IDIOMA.es}
      >
        {isPending ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <Bandera idioma={actual.id} size={22} />
        )}
        <span className="hidden sm:inline">{actual.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-muted transition-transform ${abierto ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
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
          role="menu"
          className="absolute right-0 z-50 mt-2 w-48 rounded-xl p-1.5 shadow-xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {IDIOMAS.map((item) => {
            const active = item.id === currentLocale;
            return (
              <button
                key={item.id}
                role="menuitemradio"
                aria-checked={active}
                lang={item.id}
                onClick={() => (active ? setAbierto(false) : handleLanguageChange(item.id))}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors hover:bg-[var(--surface-2)]"
                style={active ? { color: "var(--foreground)", background: "rgb(var(--accent-rgb) / 0.12)" } : { color: "var(--foreground)" }}
              >
                <span className="flex items-center gap-3">
                  <Bandera idioma={item.id} size={22} />
                  {item.label}
                </span>
                {active && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
