"use client";

import { useEffect } from "react";

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
            style={{
              borderRadius: 8,
              padding: "10px 24px",
              fontWeight: 700,
              color: "#0b0e14",
              background: "#7fbcd8",
              border: "none",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
          <a
            href="/"
            style={{
              borderRadius: 8,
              padding: "10px 24px",
              fontWeight: 700,
              color: "#e8eaed",
              border: "1px solid #2a2f3a",
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
