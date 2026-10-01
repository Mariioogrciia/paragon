import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Cabecera de las páginas de plataforma de Descubrir (rediseño del 1 oct
 * 2026): una banda con el color de la marca y su logo en blanco. Los colores
 * de marca solo viven aquí y en los accesos de plataforma: es contexto de
 * identidad de plataforma (DESIGN.md).
 */
export function CabeceraPlataforma({
  nombre,
  color,
  icono,
  migas,
  descripcion,
}: {
  nombre: string;
  color: string;
  icono: ReactNode;
  migas: string;
  descripcion?: string;
}) {
  return (
    <header className="plataforma-banda mb-10" style={{ "--marca": color } as React.CSSProperties}>
      <span className="plataforma-logo" aria-hidden="true">
        {icono}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">
          <Link href="/descubrir" className="rounded-sm hover:text-white hover:underline">
            {migas}
          </Link>{" "}
          / {nombre}
        </p>
        <h1 className="font-heading mt-1 text-[clamp(2rem,6vw,3rem)] font-bold uppercase leading-none text-white">{nombre}</h1>
        {descripcion && <p className="mt-2 max-w-[60ch] text-sm text-white/80">{descripcion}</p>}
      </div>
    </header>
  );
}
