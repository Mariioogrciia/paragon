"use client";

import { useEffect, useState } from "react";

/**
 * Solo se dispara si falla el propio layout raíz (sesión, `<html>`, lo que
 * envuelve TODA la app) — `error.tsx` no puede cubrir eso, Next exige un
 * archivo aparte que reponga su propio `<html>`/`<body>` porque sustituye
 * al layout entero, no a lo que hay dentro. Por eso va sin depender de
 * nada del árbol normal (ni Header, ni ThemeProvider, ni las variables de
 * `globals.css`): si el layout raíz reventó, no hay garantía de que nada
 * de eso esté disponible. Estilos en línea a propósito, no clases.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error.tsx]", error);
  }, [error]);

  // Sin clases en todo este archivo a propósito (ver el comentario de
  // arriba) — un `hover:` de Tailwind no se puede escribir con `style`
  // inline, así que el hover de los dos botones va por estado en vez de
  // CSS. Regla del usuario para toda la UI: todo control clicable
  // necesita un hover visible, sin excepción por ser la pantalla de
  // "todo se rompió".
  const [hoverReintentar, setHoverReintentar] = useState(false);
  const [hoverInicio, setHoverInicio] = useState(false);

  return (
    <html lang="es">
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
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Paragon se ha caído</h1>
        <p style={{ maxWidth: 420, color: "#9aa0ac", margin: 0 }}>
          Un fallo grave impidió cargar la app entera, no solo esta página. Ya ha quedado
          registrado.
        </p>
        {error.digest && (
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
            Referencia: <span style={{ fontFamily: "monospace" }}>{error.digest}</span>
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
            Reintentar
          </button>
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
            Ir al inicio
          </a>
        </div>
      </body>
    </html>
  );
}
