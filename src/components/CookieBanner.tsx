"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CLAVE = "platinos:cookies-aceptadas";

/**
 * Aviso de cookies. Puramente informativo: Paragon solo usa la cookie de
 * sesión (imprescindible, sin consentimiento exigible por ley — ver
 * /cookies) y hoy no tiene ninguna cookie de analítica ni publicidad que
 * aceptar o rechazar. Aun así se enseña una vez, guardado en localStorage
 * (no en una cookie: no tendría sentido usar una cookie para recordar el
 * consentimiento de cookies), para ser transparentes desde el principio en
 * vez de esconderlo solo en el footer.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CLAVE)) setVisible(true);
    } catch {
      // Almacenamiento bloqueado (privado, política del navegador): no
      // insistimos, simplemente no se enseña el aviso.
    }
  }, []);

  function aceptar() {
    try {
      localStorage.setItem(CLAVE, "1");
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border px-4 py-4 backdrop-blur"
      style={{ background: "color-mix(in srgb, var(--background) 92%, transparent)" }}
      role="region"
      aria-label="Aviso de cookies"
    >
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3">
        <p className="text-[0.8125rem] text-muted">
          Solo usamos la cookie imprescindible para mantener tu sesión
          iniciada — nada de analítica ni publicidad. Más detalles en{" "}
          <Link href="/cookies" className="text-accent hover:underline">
            Cookies
          </Link>
          .
        </p>
        <button
          onClick={aceptar}
          className="shrink-0 rounded-lg px-4 py-2 text-[0.8125rem] font-bold text-background transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgb(var(--accent-rgb) / 0.5)]"
          style={{ background: "var(--accent-grad)" }}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
