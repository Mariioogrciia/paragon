"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Casa = "ps" | "xbox" | "steam" | "epic";

export interface JuegoDestacado {
  clave: string;
  titulo: string;
  /** Arte apaisado grande (artwork de IGDB, banner de Epic). */
  arte?: string;
  /** Carátula vertical o icono. */
  portada?: string;
  href: string;
  externo?: boolean;
  /** Línea corta bajo el título: "Gratis hasta…", "Recomendado para ti"… */
  etiqueta?: string;
}

/**
 * Destacado a pantalla completa de las páginas de plataforma ("cada una en
 * su casa", rediseño del 1 oct 2026). Mismos datos en las cuatro casas; lo
 * que cambia es la composición, que evoca la de cada plataforma sin copiar
 * su interfaz:
 * - ps: arte a sangre con una fila de baldosas arriba (inicio de consola).
 * - xbox: mosaico, el elegido grande y el resto en cuadros.
 * - steam: cápsula grande con columna lateral de miniaturas (tienda).
 * - epic: banner con la lista de juegos a la derecha (escaparate).
 * Avanza solo cada 8 s salvo con el ratón encima o con movimiento reducido.
 */
export function DestacadoCasa({
  casa,
  juegos,
  textos,
}: {
  casa: Casa;
  juegos: JuegoDestacado[];
  textos: { ver: string; anterior: string; siguiente: string };
}) {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (juegos.length <= 1 || pausado) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % juegos.length), 8000);
    return () => clearInterval(id);
  }, [juegos.length, pausado]);

  if (juegos.length === 0) return null;
  const g = juegos[i];
  const fondo = g.arte ?? g.portada;

  const Boton = (
    <Enlace juego={g} className="casa-boton">
      {textos.ver}
    </Enlace>
  );

  const flechas = juegos.length > 1 && (
    <div className="casa-flechas">
      <button type="button" aria-label={textos.anterior} onClick={() => setI((n) => (n - 1 + juegos.length) % juegos.length)}>
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <button type="button" aria-label={textos.siguiente} onClick={() => setI((n) => (n + 1) % juegos.length)}>
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <section
      className={`casa-destacado casa-destacado-${casa}`}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      aria-roledescription="carousel"
    >
      {casa === "ps" && (
        <div className="casa-ps-escena">
          {fondo && <img key={fondo} src={fondo} alt="" className="casa-arte" />}
          <div className="casa-velo" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-8 p-5 sm:p-8">
            <div className="casa-ps-baldosas" role="tablist">
              {juegos.map((j, n) => (
                <button
                  key={j.clave}
                  type="button"
                  role="tab"
                  aria-selected={n === i}
                  aria-label={j.titulo}
                  onClick={() => setI(n)}
                  className="casa-ps-baldosa"
                  data-activa={n === i || undefined}
                >
                  {j.portada ? <img src={j.portada} alt="" /> : <span />}
                </button>
              ))}
            </div>
            <div className="max-w-xl">
              <h2 className="casa-titulo">{g.titulo}</h2>
              {g.etiqueta && <p className="mt-2 text-sm text-white/80">{g.etiqueta}</p>}
              <div className="mt-5 flex items-center gap-3">{Boton}</div>
            </div>
          </div>
        </div>
      )}

      {casa === "xbox" && (
        <div className="casa-xbox-mosaico">
          <Enlace juego={g} className="casa-xbox-grande group">
            {fondo && <img key={fondo} src={fondo} alt="" className="casa-arte" />}
            <span className="casa-velo" />
            <span className="relative z-10 mt-auto block p-5">
              <span className="casa-titulo block">{g.titulo}</span>
              {g.etiqueta && <span className="mt-1 block text-sm text-white/80">{g.etiqueta}</span>}
            </span>
          </Enlace>
          {/* Mosaico fijo de 1 grande + 4: al elegir un cuadro pasa a grande
              y el anterior vuelve a la cola. */}
          {juegos
            .map((j, n) => ({ j, n }))
            .filter(({ n }) => n !== i)
            .slice(0, 4)
            .map(({ j, n }) => (
              <button key={j.clave} type="button" onClick={() => setI(n)} className="casa-xbox-cuadro" aria-label={j.titulo}>
                {j.portada ? <img src={j.portada} alt="" /> : <span />}
                <span className="casa-xbox-cuadro-titulo">{j.titulo}</span>
              </button>
            ))}
        </div>
      )}

      {casa === "steam" && (
        <div className="casa-steam-capsula">
          <Enlace juego={g} className="casa-steam-principal">
            {fondo && <img key={fondo} src={fondo} alt="" className="casa-arte" />}
          </Enlace>
          <div className="casa-steam-lado">
            <h2 className="casa-titulo">{g.titulo}</h2>
            {g.etiqueta && <p className="text-[0.8125rem] text-muted">{g.etiqueta}</p>}
            <div className="casa-steam-miniaturas">
              {juegos.slice(0, 4).map((j, n) => (
                <button key={j.clave} type="button" onClick={() => setI(n)} aria-label={j.titulo} data-activa={n === i || undefined}>
                  {j.arte || j.portada ? <img src={j.arte ?? j.portada} alt="" /> : <span />}
                </button>
              ))}
            </div>
            <div className="mt-auto flex items-center justify-between gap-3">
              {Boton}
              {flechas}
            </div>
          </div>
          <div className="casa-steam-puntos" aria-hidden="true">
            {juegos.map((j, n) => (
              <span key={j.clave} data-activa={n === i || undefined} />
            ))}
          </div>
        </div>
      )}

      {casa === "epic" && (
        <div className="casa-epic-escaparate">
          <div className="casa-epic-banner">
            {fondo && <img key={fondo} src={fondo} alt="" className="casa-arte" />}
            <div className="casa-velo" />
            <div className="relative z-10 mt-auto max-w-md p-6 sm:p-8">
              <h2 className="casa-titulo">{g.titulo}</h2>
              {g.etiqueta && <p className="mt-2 text-sm text-white/85">{g.etiqueta}</p>}
              <div className="mt-5">{Boton}</div>
            </div>
          </div>
          <ol className="casa-epic-lista">
            {juegos.slice(0, 6).map((j, n) => (
              <li key={j.clave}>
                <button type="button" onClick={() => setI(n)} data-activa={n === i || undefined}>
                  {j.portada ? <img src={j.portada} alt="" /> : <span className="block h-full w-full" />}
                  <span className="min-w-0 truncate">{j.titulo}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(casa === "ps" || casa === "epic") && flechas && <div className="casa-flechas-sueltas">{flechas}</div>}
    </section>
  );
}

function Enlace({ juego, className, children }: { juego: JuegoDestacado; className?: string; children: React.ReactNode }) {
  return juego.externo ? (
    <a href={juego.href} target="_blank" rel="noopener noreferrer nofollow" className={className}>
      {children}
    </a>
  ) : (
    <Link href={juego.href} className={className}>
      {children}
    </Link>
  );
}
