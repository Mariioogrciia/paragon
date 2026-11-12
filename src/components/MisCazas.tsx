"use client";

/* eslint-disable @next/next/no-img-element -- carátulas de CDNs externos (PSN, Steam...), como en el resto del panel */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/Enlace";
import { coverGradient } from "@/lib/design";
import { cambiarRetiradoAction } from "@/app/actions/retirados";

export interface CazaFila {
  id: string;
  titulo: string;
  iconUrl: string | null;
  percent: number;
  href: string;
  /** "Faltan 3", ya traducido. */
  faltan: string;
  /** "Jugado hace 3 días", "~6 h": lo que haya, ya traducido. */
  extra: string[];
}

/**
 * «Reanuda tus cazas» (12 nov 2026): los juegos que has elegido platinar
 * (marca «caza», lib/retirados.ts), arriba del inicio, en el orden en que los
 * elegiste. Se eligen con 🎯 en la ficha o en «A un paso del platino»; la ×
 * los quita de aquí sin tocar nada más.
 */
/** Un juego de tu biblioteca que se puede elegir como caza (sin platinar, no retirado). */
export interface CandidatoCaza {
  id: string;
  titulo: string;
  iconUrl: string | null;
  percent: number;
}

export function MisCazas({
  cazas,
  candidatos = [],
  max,
  textos,
}: {
  cazas: CazaFila[];
  /** Para elegir desde aquí mismo (12 nov 2026): tu biblioteca sin platinar, lo último jugado primero. */
  candidatos?: CandidatoCaza[];
  max: number;
  textos: { titulo: string; sub: string; vacio: string; quitar: string; elegir: string; buscar: string; cerrar: string; anadir: string; anadida: string; llena: string; cuenta: string; sinResultados: string };
}) {
  const [quitadas, setQuitadas] = useState<Set<string>>(() => new Set());
  const [pendiente, empezar] = useTransition();
  const router = useRouter();
  const lista = cazas.filter((c) => !quitadas.has(c.id));

  // El selector: qué hay elegido ahora (lo de la lista + lo que se añada aquí).
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [elegidas, setElegidas] = useState<Set<string>>(() => new Set(cazas.map((c) => c.id)));
  const [llena, setLlena] = useState(false);
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase();
    return (q ? candidatos.filter((c) => c.titulo.toLocaleLowerCase().includes(q)) : candidatos).slice(0, 60);
  }, [busqueda, candidatos]);

  const alternar = (id: string) => {
    const nueva = !elegidas.has(id);
    if (nueva && elegidas.size >= max) {
      setLlena(true);
      return;
    }
    setLlena(false);
    setElegidas((s) => {
      const n = new Set(s);
      if (nueva) n.add(id);
      else n.delete(id);
      return n;
    });
    if (!nueva) setQuitadas((s) => new Set(s).add(id));
    empezar(async () => {
      const { ok } = await cambiarRetiradoAction("caza", id, nueva);
      if (!ok && nueva) {
        setElegidas((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
        setLlena(true);
      }
    });
  };

  const cerrar = () => {
    setAbierto(false);
    setBusqueda("");
    // Vuelve a pedir el inicio para pintar las cazas nuevas con sus datos.
    router.refresh();
  };

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
        <h2 className="font-heading text-2xl font-bold">🎯 {textos.titulo}</h2>
        <p className="text-[0.8125rem] text-muted">{textos.sub}</p>
        {candidatos.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setElegidas(new Set(lista.map((c) => c.id)));
              setLlena(false);
              setAbierto(true);
            }}
            className="ml-auto rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors"
            style={{ background: "rgb(var(--accent-rgb) / 0.16)", color: "var(--accent-text)", border: "1px solid rgb(var(--accent-rgb) / 0.4)" }}
          >
            + {textos.elegir}
          </button>
        )}
      </div>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6" onClick={cerrar} role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={textos.elegir}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-[20px] sm:rounded-[20px]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <h3 className="font-heading text-lg font-bold">🎯 {textos.elegir}</h3>
              <span className="text-xs text-muted">{textos.cuenta.replace("{n}", String(elegidas.size)).replace("{max}", String(max))}</span>
              <button type="button" onClick={cerrar} className="ml-auto text-sm font-bold text-[var(--accent-text)] hover:underline">
                {textos.cerrar}
              </button>
            </div>
            <div className="px-5 pt-3">
              <input
                type="search"
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={textos.buscar}
                className="w-full rounded-[12px] px-3.5 py-2.5 text-sm"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              />
              {llena && <p className="mt-2 text-xs font-semibold text-[var(--danger)]">{textos.llena}</p>}
            </div>
            <ul className="mt-2 flex-1 overflow-y-auto px-3 pb-4" aria-busy={pendiente}>
              {filtrados.length === 0 && <li className="px-2 py-6 text-center text-sm text-muted">{textos.sinResultados}</li>}
              {filtrados.map((c) => {
                const activa = elegidas.has(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => alternar(c.id)}
                      aria-pressed={activa}
                      className="flex w-full items-center gap-3 rounded-[12px] px-2 py-2 text-left transition-colors hover:bg-surface-2"
                    >
                      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-[8px]" style={{ background: coverGradient(c.id) }}>
                        {c.iconUrl && <img src={c.iconUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{c.titulo}</span>
                        <span className="text-xs text-muted">{c.percent}%</span>
                      </span>
                      <span
                        className="shrink-0 rounded-full px-3 py-1 text-xs font-bold"
                        style={
                          activa
                            ? { background: "rgb(var(--accent-rgb) / 0.16)", color: "var(--accent-text)", border: "1px solid rgb(var(--accent-rgb) / 0.4)" }
                            : { color: "var(--muted)", border: "1px solid var(--border)" }
                        }
                      >
                        {activa ? `🎯 ${textos.anadida}` : `+ ${textos.anadir}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {lista.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-border px-4 py-4 text-sm text-muted">{textos.vacio}</p>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {lista.map((c) => (
            <li key={c.id} className="group/caza relative">
              <button
                type="button"
                onClick={() => {
                  setQuitadas((s) => new Set(s).add(c.id));
                  empezar(() => void cambiarRetiradoAction("caza", c.id, false));
                }}
                title={textos.quitar}
                aria-label={`${textos.quitar}: ${c.titulo}`}
                className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full text-sm text-muted opacity-60 transition-opacity hover:bg-surface-2 hover:text-foreground hover:opacity-100 sm:opacity-0 sm:group-hover/caza:opacity-100"
              >
                ×
              </button>
              <Link
                href={c.href}
                className="group flex h-full items-center gap-3 rounded-[14px] p-2.5 transition-colors hover:bg-surface-2"
                style={{ border: "1px solid rgb(var(--accent-rgb) / 0.35)", background: "var(--surface)" }}
              >
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px]" style={{ background: coverGradient(c.id) }}>
                  {c.iconUrl && (
                    <img
                      src={c.iconUrl}
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
                  <span className="block truncate pr-5 text-sm font-bold group-hover:text-[var(--accent-text)]">{c.titulo}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span className="font-semibold text-platinum">{c.faltan}</span>
                    {c.extra.map((e) => (
                      <span key={e}>· {e}</span>
                    ))}
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="block h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span className="block h-full rounded-full" style={{ width: `${c.percent}%`, background: "var(--accent-grad-h)" }} />
                    </span>
                    <span className="text-xs font-bold" style={{ color: "var(--accent-text)" }}>
                      {c.percent}%
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
