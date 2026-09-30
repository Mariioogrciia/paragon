"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/Avatar";
import { EpicGamesLogo, PlayStationLogo, SteamLogo, XboxLogo } from "@/components/ui/PlatformLogos";

type Juego = { titulo: string; tengo: number; total: number };

// Datos de ejemplo (la sección lo dice): cuatro bibliotecas sueltas que suman un perfil.
const PLATAFORMAS: { id: string; nombre: string; color: string; Logo: typeof SteamLogo; juegos: Juego[] }[] = [
  {
    id: "psn",
    nombre: "PlayStation",
    color: "#2f7ad6",
    Logo: PlayStationLogo,
    juegos: [
      { titulo: "God of War Ragnarök", tengo: 38, total: 48 },
      { titulo: "Bloodborne", tengo: 40, total: 40 },
      { titulo: "Returnal", tengo: 12, total: 31 },
    ],
  },
  {
    id: "steam",
    nombre: "Steam",
    color: "#66c0f4",
    Logo: SteamLogo,
    juegos: [
      { titulo: "Hollow Knight", tengo: 39, total: 63 },
      { titulo: "Hades", tengo: 49, total: 49 },
      { titulo: "Celeste", tengo: 19, total: 32 },
    ],
  },
  {
    id: "xbox",
    nombre: "Xbox",
    color: "#16a316",
    Logo: XboxLogo,
    juegos: [
      { titulo: "Halo Infinite", tengo: 71, total: 119 },
      { titulo: "Forza Horizon 5", tengo: 45, total: 90 },
      { titulo: "Starfield", tengo: 22, total: 50 },
    ],
  },
  {
    id: "epic",
    nombre: "Epic Games",
    color: "#c9ced6",
    Logo: EpicGamesLogo,
    juegos: [
      { titulo: "Alan Wake 2", tengo: 18, total: 40 },
      { titulo: "Control", tengo: 20, total: 60 },
      { titulo: "Death Stranding", tengo: 9, total: 55 },
    ],
  },
];

const TOTAL = PLATAFORMAS.reduce((s, p) => s + p.juegos.reduce((a, j) => a + j.tengo, 0), 0);
const NIVEL = 42;
/** Progreso hacia el nivel siguiente (ejemplo). */
const XP = 0.62;
// Escritorio: las cuatro columnas en fila. Móvil (2x2): PlayStation y Xbox a
// la izquierda, Steam y Epic a la derecha — mismo orden que PLATAFORMAS.
const CENTROS_FILA = [125, 375, 625, 875];
const CENTROS_REJILLA = [190, 810, 310, 690];
const rutaFila = (x: number) => `M${x},0 C${x},70 500,60 500,120`;
const rutaRejilla = (x: number) => `M${x},0 C${x},45 500,35 500,80`;
const ANILLO = 2 * Math.PI * 40;

function Trayectorias({
  centros,
  ruta,
  alto,
  fundiendo,
  className,
}: {
  centros: number[];
  ruta: (x: number) => string;
  alto: number;
  fundiendo: boolean;
  className: string;
}) {
  return (
    <svg className={className} viewBox={`0 0 1000 ${alto}`} preserveAspectRatio="none" aria-hidden="true">
      {PLATAFORMAS.map((p, i) => (
        <path key={p.id} d={ruta(centros[i])} fill="none" stroke={p.color} strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
      ))}
      {fundiendo &&
        PLATAFORMAS.map((p, i) =>
          [0, 0.45, 0.9].map((retraso) => (
            <circle key={`${p.id}-${retraso}`} r={3.5} fill={p.color} opacity={0}>
              <animateMotion dur="1.4s" begin={`${retraso + i * 0.12}s`} repeatCount="2" path={ruta(centros[i])} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1" fill="freeze" />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.85;1" dur="1.4s" begin={`${retraso + i * 0.12}s`} repeatCount="2" fill="freeze" />
            </circle>
          )),
        )}
    </svg>
  );
}

/**
 * Cuatro bibliotecas de ejemplo, una por plataforma, que al entrar en
 * pantalla mandan sus trofeos por las líneas hasta un solo perfil Paragon: el
 * anillo de nivel se llena y el nivel sube. El estado final está pintado desde
 * el principio: sin JS, o con movimiento reducido, se ve igual, solo quieto.
 */
export function Convergencia({ cazadores = [] }: { cazadores?: { id: string; nombre: string; imagen: string | null }[] }) {
  const t = useTranslations("Shell.Home");
  const raiz = useRef<HTMLDivElement>(null);
  const [fundiendo, setFundiendo] = useState(false);
  const [nivel, setNivel] = useState(NIVEL);

  useEffect(() => {
    const el = raiz.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        obs.disconnect();
        setFundiendo(true);
        const inicio = performance.now();
        const paso = (ahora: number) => {
          const p = Math.min(1, (ahora - inicio) / 1800);
          setNivel(Math.round(NIVEL * (1 - Math.pow(1 - p, 4))));
          if (p < 1) requestAnimationFrame(paso);
        };
        requestAnimationFrame(paso);
      },
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="relative pt-10 sm:pt-12" aria-labelledby="convergencia-titulo">
      <div ref={raiz} className="relative">
        <div className="mb-2 flex justify-end">
          <span className="rounded-full border border-border px-2.5 py-0.5 text-[0.6875rem] font-semibold text-muted">{t("landing.ejemplo")}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PLATAFORMAS.map(({ id, nombre, color, Logo, juegos }, i) => (
            <div
              key={id}
              className="landing-columna min-w-0 rounded-2xl border border-border bg-[var(--surface)] p-3 sm:p-4"
              style={{ ["--plataforma" as string]: color, transitionDelay: `${i * 90}ms` }}
              data-fundiendo={fundiendo || undefined}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}>
                  <Logo width={16} height={16} aria-hidden="true" />
                </span>
                <span className="truncate text-sm font-bold">{nombre}</span>
              </div>
              <ul className="mt-4 grid grid-cols-1 gap-3">
                {juegos.map((j) => (
                  <li key={j.titulo} className="min-w-0">
                    <div className="flex min-w-0 items-baseline justify-between gap-2 text-[0.75rem] sm:text-[0.8125rem]">
                      <span className="min-w-0 truncate font-semibold">{j.titulo}</span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {j.tengo}/{j.total}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div className="h-full rounded-full" style={{ width: `${(j.tengo / j.total) * 100}%`, background: color }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Trayectorias className="hidden h-[120px] w-full lg:block" centros={CENTROS_FILA} ruta={rutaFila} alto={120} fundiendo={fundiendo} />
        <Trayectorias className="h-16 w-full lg:hidden" centros={CENTROS_REJILLA} ruta={rutaRejilla} alto={80} fundiendo={fundiendo} />

        <div className="landing-perfil relative mx-auto max-w-[36rem] rounded-3xl border p-5 sm:p-7" data-fundiendo={fundiendo || undefined}>
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative h-[84px] w-[84px] shrink-0 sm:h-24 sm:w-24">
              <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90" aria-hidden="true">
                <defs>
                  <linearGradient id="landing-anillo-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--accent-2)" />
                    <stop offset="100%" stopColor="var(--accent)" />
                  </linearGradient>
                </defs>
                <circle cx="48" cy="48" r="40" fill="none" stroke="var(--surface-2)" strokeWidth="7" />
                <circle
                  className="landing-anillo"
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="url(#landing-anillo-grad)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={ANILLO}
                  style={{ ["--anillo-vacio" as string]: `${ANILLO}`, strokeDashoffset: ANILLO * (1 - XP) }}
                />
              </svg>
              <span className="font-heading absolute inset-0 flex items-center justify-center text-[1.875rem] font-bold tabular-nums sm:text-[2.125rem]">{nivel}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{t("landing.nivelParagon")}</p>
              <p className="mt-1 text-xs text-muted">{t("landing.trofeosEnPlataformas", { n: TOTAL })}</p>
              <div className="mt-2.5 flex -space-x-1.5" aria-hidden="true">
                {PLATAFORMAS.map(({ id, color, Logo }) => (
                  <span key={id} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--surface)]" style={{ background: `color-mix(in srgb, ${color} 22%, var(--surface-2))`, color }}>
                    <Logo width={13} height={13} />
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-4 border-t border-[var(--border)] pt-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://psnobj.prod.dl.playstation.net/psnobj/NPWR22392_00/2e8a3bfb-6da4-4133-b2ca-2b8c5042ed09.png" alt="" width={44} height={44} loading="lazy" className="shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted">{t("platinoMasCercano")}</p>
              <p className="font-heading text-lg font-bold leading-tight [text-wrap:balance]">{"God of War Ragnarök"}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div className="h-full w-[79%] rounded-full" style={{ background: "#2f7ad6" }} />
              </div>
              <p className="mt-1.5 text-xs text-muted">{t("conseguidos", { conseguidos: 38, total: 48 })}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="font-heading block text-[2.5rem] font-bold leading-none text-platinum tabular-nums">10</span>
              <span className="block whitespace-pre-line text-[0.6875rem] font-semibold leading-tight text-muted">{t("trofeosParaElPlatino")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-[46rem] text-center">
        <h2 id="convergencia-titulo" className="font-heading text-[clamp(1.625rem,3.6vw,2.375rem)] font-bold uppercase leading-[1.05] tracking-[-0.02em] [text-wrap:balance]">
          {t("landing.convergenciaTitulo")}
        </h2>
        <p className="mx-auto mt-3 max-w-[60ch] text-base leading-relaxed text-muted">{t("landing.convergenciaTexto")}</p>
        {cazadores.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="flex -space-x-2.5">
              {cazadores.map((c) => (
                <span key={c.id} className="block rounded-full" style={{ border: "2px solid var(--background)" }}>
                  <Avatar src={c.imagen} name={c.nombre} size={30} />
                </span>
              ))}
            </div>
            <p className="text-left text-[0.8125rem] font-semibold text-muted">{t("socialProofTexto")}</p>
          </div>
        )}
      </div>
    </section>
  );
}
