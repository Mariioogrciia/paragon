"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { reportarError } from "@/lib/reportarError";

/**
 * Solo se dispara si falla el propio layout raíz (sesión, `<html>`, lo que
 * envuelve TODA la app) — `error.tsx` no puede cubrir eso, Next exige un
 * archivo aparte que reponga su propio `<html>`/`<body>` porque sustituye
 * al layout entero, no a lo que hay dentro. Por eso va sin depender de
 * nada del árbol normal (ni Header, ni ThemeProvider, ni las variables de
 * `globals.css`): si el layout raíz reventó, no hay garantía de que nada
 * de eso esté disponible. Estilos en línea a propósito, no clases.
 *
 * Tampoco hay next-intl aquí (su proveedor vive en el layout que ha
 * reventado): los textos van en los 6 idiomas en este mismo archivo y se
 * elige por el idioma del navegador.
 */
const TEXTOS = {
  es: { titulo: "Paragon se ha caído", texto: "Un fallo grave impidió cargar la app entera, no solo esta página. Ya ha quedado registrado.", referencia: "Referencia:", reintentar: "Reintentar", inicio: "Ir al inicio" },
  en: { titulo: "Paragon is down", texto: "A serious error stopped the whole app from loading, not just this page. It's already been logged.", referencia: "Reference:", reintentar: "Try again", inicio: "Go home" },
  de: { titulo: "Paragon ist ausgefallen", texto: "Ein schwerer Fehler hat das Laden der ganzen App verhindert, nicht nur dieser Seite. Er wurde bereits protokolliert.", referencia: "Referenz:", reintentar: "Erneut versuchen", inicio: "Zur Startseite" },
  fr: { titulo: "Paragon est en panne", texto: "Une erreur grave a empêché toute l'application de se charger, pas seulement cette page. Elle a déjà été enregistrée.", referencia: "Référence :", reintentar: "Réessayer", inicio: "Aller à l'accueil" },
  it: { titulo: "Paragon non funziona", texto: "Un errore grave ha impedito il caricamento dell'intera app, non solo di questa pagina. È già stato registrato.", referencia: "Riferimento:", reintentar: "Riprova", inicio: "Vai alla home" },
  pt: { titulo: "O Paragon foi abaixo", texto: "Um erro grave impediu a app inteira de carregar, não só esta página. Já ficou registado.", referencia: "Referência:", reintentar: "Tentar de novo", inicio: "Ir para o início" },
};
type IdiomaError = keyof typeof TEXTOS;

const sinSuscripcion = () => () => {};
function idiomaNavegador(): IdiomaError {
  const nav = (navigator.language || "es").slice(0, 2);
  return nav in TEXTOS ? (nav as IdiomaError) : "es";
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error.tsx]", error);
    reportarError(error);
  }, [error]);

  // Sin clases en todo este archivo a propósito (ver el comentario de
  // arriba) — un `hover:` de Tailwind no se puede escribir con `style`
  // inline, así que el hover de los dos botones va por estado en vez de
  // CSS. Regla del usuario para toda la UI: todo control clicable
  // necesita un hover visible, sin excepción por ser la pantalla de
  // "todo se rompió".
  const [hoverReintentar, setHoverReintentar] = useState(false);
  const [hoverInicio, setHoverInicio] = useState(false);
  const idioma = useSyncExternalStore(sinSuscripcion, idiomaNavegador, () => "es" as IdiomaError);
  const tx = TEXTOS[idioma];

  return (
    <html lang={idioma}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
          textAlign: "center",
          background: "#0b0e14",
          color: "#e8eaed",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{tx.titulo}</h1>
        <p style={{ maxWidth: 420, color: "#9aa0ac", margin: 0 }}>{tx.texto}</p>
        {error.digest && (
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
            {tx.referencia} <span style={{ fontFamily: "monospace" }}>{error.digest}</span>
          </p>
        )}
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button
            onClick={reset}
            onMouseEnter={() => setHoverReintentar(true)}
            onMouseLeave={() => setHoverReintentar(false)}
            style={{
              borderRadius: 8,
              padding: "10px 24px",
              fontWeight: 700,
              color: "#0b0e14",
              background: hoverReintentar ? "#9ccfe6" : "#7fbcd8",
              border: "none",
              cursor: "pointer",
            }}
          >
            {tx.reintentar}
          </button>
          {/* <a> y no <Link> a propósito: global-error sustituye al layout
              raíz entero, y una recarga completa es justo lo que hace falta
              para salir de un árbol de React que ha reventado. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            onMouseEnter={() => setHoverInicio(true)}
            onMouseLeave={() => setHoverInicio(false)}
            style={{
              borderRadius: 8,
              padding: "10px 24px",
              fontWeight: 700,
              color: "#e8eaed",
              border: `1px solid ${hoverInicio ? "#4a5262" : "#2a2f3a"}`,
              background: hoverInicio ? "rgba(255,255,255,0.05)" : "transparent",
              textDecoration: "none",
            }}
          >
            {tx.inicio}
          </a>
        </div>
      </body>
    </html>
  );
}
