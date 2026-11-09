"use client";

/* eslint-disable @next/next/no-img-element -- carátulas de CDNs externos (PSN, Steam...), como en el resto del panel */
import { useMemo, useState, useTransition } from "react";
import Link from "@/components/Enlace";
import { coverGradient } from "@/lib/design";
import { cambiarRetiradoAction } from "@/app/actions/retirados";

export interface FilaPlatinable {
  id: string;
  titulo: string;
  iconUrl: string | null;
  percent: number;
  href: string;
  /** "Faltan 3" / "1 logro para el 100 %": ya traducido en el servidor. */
  faltan: string;
  /** "Jugado hace 3 días", "~6 h": lo que haya, ya traducido. */
  extra: string[];
  /** Consolas del juego ("PS4", "PSVITA"…) para el filtro. */
  dispositivos: string[];
  horas: number | null;
  instalado: boolean;
  suscripcion: boolean;
  /** Etiquetas de aviso (perdibles, lo que falta es rarísimo, PS Plus…), ya traducidas. */
  avisos: string[];
  /** "Nerea y Iker también lo tienen a medias". */
  amigos: string | null;
  /** Sin la × de "ya no lo tengo" (doble platino: el juego puede no ser tuyo). */
  sinOcultar?: boolean;
}

type Pestana = "cerca" | "jugando" | "faciles" | "dobles";

/**
 * «A un paso del platino» del panel (lib/platinables.ts): cuatro pestañas
 * (lo que menos te queda, lo que juegas, platinos fáciles sin empezar y
 * doble platino) y filtros por consola, horas, instalado y suscripción.
 * Los textos llegan traducidos del servidor (app/(app)/page.tsx).
 */
export function PlatinablesPanel({
  listas,
  sugerencia,
  textos,
  nombresConsola,
}: {
  listas: Record<Pestana, FilaPlatinable[]>;
  /** "Hace 3 años que no juegas a nada de PS3": se puede quitar de las sugerencias. */
  sugerencia: { dispositivo: string; texto: string } | null;
  textos: Record<Pestana | `desc_${Pestana}` | `vacio_${Pestana}` | "verMas" | "verMenos" | "yaNoLoTengo" | "todas" | "corto" | "instalados" | "suscripcion" | "quitar" | "dejar", string>;
  nombresConsola: Record<string, string>;
}) {
  const pestanas = (["cerca", "jugando", "faciles", "dobles"] as const).filter((p) => p !== "dobles" || listas.dobles.length > 0);
  const [pestana, setPestana] = useState<Pestana>(listas.cerca.length > 0 ? "cerca" : "jugando");
  const [todos, setTodos] = useState(false);
  const [consola, setConsola] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"corto" | "instalados" | "suscripcion" | null>(null);
  const [quitados, setQuitados] = useState<Set<string>>(() => new Set());
  const [aviso, setAviso] = useState(sugerencia);
  const [, empezar] = useTransition();

  const retirar = (id: string) => {
    setQuitados((s) => new Set(s).add(id));
    empezar(() => void cambiarRetiradoAction("juego", id, true));
  };

  const base = listas[pestana].filter((j) => !quitados.has(j.id));
  const consolas = useMemo(() => [...new Set(Object.values(listas).flat().flatMap((j) => j.dispositivos))], [listas]);
  const lista = base.filter(
    (j) =>
      (!consola || j.dispositivos.includes(consola)) &&
      (filtro !== "corto" || (j.horas !== null && j.horas <= 5)) &&
      (filtro !== "instalados" || j.instalado) &&
      (filtro !== "suscripcion" || j.suscripcion),
  );
  const visibles = todos ? lista : lista.slice(0, 6);

  const pastilla = (activa: boolean) =>
    activa
      ? { background: "rgb(var(--accent-rgb) / 0.16)", color: "var(--accent-text)", border: "1px solid rgb(var(--accent-rgb) / 0.4)" }
      : { background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" };

  return (
    <div>
      {aviso && (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[14px] px-4 py-3 text-sm" style={{ border: "1px solid rgb(var(--accent-rgb) / 0.35)", background: "rgb(var(--accent-rgb) / 0.08)" }}>
          <span className="min-w-0 flex-1">{aviso.texto}</span>
          <button
            type="button"
            className="text-xs font-bold text-accent hover:underline"
            onClick={() => {
              empezar(() => void cambiarRetiradoAction("dispositivo", aviso.dispositivo, true));
              setAviso(null);
            }}
          >
            {textos.quitar}
          </button>
          <button type="button" className="text-xs font-semibold text-muted hover:underline" onClick={() => setAviso(null)}>
            {textos.dejar}
          </button>
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        {pestanas.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setPestana(p);
              setTodos(false);
            }}
            aria-pressed={pestana === p}
            className="rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors"
            style={pastilla(pestana === p)}
          >
            {textos[p]} · {listas[p].filter((j) => !quitados.has(j.id)).length}
          </button>
        ))}
      </div>

      {(consolas.length > 1 || base.some((j) => j.horas !== null || j.instalado || j.suscripcion)) && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {consolas.length > 1 && (
            <>
              <button type="button" onClick={() => setConsola(null)} className="rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold" style={pastilla(consola === null)}>
                {textos.todas}
              </button>
              {consolas.map((c) => (
                <button key={c} type="button" onClick={() => setConsola(consola === c ? null : c)} className="rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold" style={pastilla(consola === c)}>
                  {nombresConsola[c] ?? c}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
            </>
          )}
          {(["corto", "instalados", "suscripcion"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFiltro(filtro === f ? null : f)} className="rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold" style={pastilla(filtro === f)}>
              {textos[f]}
            </button>
          ))}
        </div>
      )}

      <p className="mb-3 text-[0.8125rem] text-muted">{textos[`desc_${pestana}`]}</p>

      {lista.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-border px-4 py-6 text-center text-sm text-muted">{textos[`vacio_${pestana}`]}</p>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {visibles.map((j) => (
            <li key={j.id} className="group/fila relative">
              {!j.sinOcultar && (
                <button
                  type="button"
                  onClick={() => retirar(j.id)}
                  title={textos.yaNoLoTengo}
                  aria-label={`${textos.yaNoLoTengo}: ${j.titulo}`}
                  className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full text-sm text-muted opacity-60 transition-opacity hover:bg-surface-2 hover:text-foreground hover:opacity-100 sm:opacity-0 sm:group-hover/fila:opacity-100"
                >
                  ×
                </button>
              )}
              <Link
                href={j.href}
                className="group flex items-center gap-3 rounded-[14px] p-2.5 transition-colors hover:bg-surface-2"
                style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
              >
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px]" style={{ background: coverGradient(j.id) }}>
                  {j.iconUrl && (
                    <img
                      src={j.iconUrl}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.visibility = "hidden";
                      }}
                      className="h-full w-full object-cover"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate pr-5 text-sm font-bold group-hover:text-[var(--accent-text)]">{j.titulo}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span className="font-semibold text-platinum">{j.faltan}</span>
                    {j.extra.map((e) => (
                      <span key={e}>· {e}</span>
                    ))}
                  </span>
                  {(j.avisos.length > 0 || j.amigos) && (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {j.avisos.map((a) => (
                        <span key={a} className="rounded-full px-2 py-0.5 text-[0.625rem] font-bold" style={{ background: "rgb(var(--accent-rgb) / 0.12)", color: "var(--accent-text)" }}>
                          {a}
                        </span>
                      ))}
                      {j.amigos && <span className="text-[0.6875rem] text-muted">{j.amigos}</span>}
                    </span>
                  )}
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full" style={{ width: `${j.percent}%`, background: "var(--accent-grad-h)" }} />
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold" style={{ color: "var(--accent-text)" }}>
                  {j.percent}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {lista.length > 6 && (
        <button type="button" onClick={() => setTodos((v) => !v)} className="mt-3 text-xs font-bold uppercase tracking-wide text-accent hover:underline">
          {todos ? textos.verMenos : textos.verMas.replace("{n}", String(lista.length - 6))}
        </button>
      )}
    </div>
  );
}
