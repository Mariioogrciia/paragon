"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Handshake } from "lucide-react";
import { proponerRetoAction, responderRetoAction } from "@/app/actions";

interface Comun {
  amigo: { userId: string; handle: string | null; nombre: string };
  titulo: string;
  miGameId: string;
  suGameId: string;
  miProgreso: number;
  suProgreso: number;
}

interface Reto {
  id: string;
  estado: string;
  titulo: string;
  fechaObjetivo: string;
  soyCreador: boolean;
  otro: { nombre: string; handle: string | null };
  miProgreso: number;
  suProgreso: number;
}

function Barras({ yo, otro, nombreOtro, t }: { yo: number; otro: number; nombreOtro: string; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="mt-2 grid gap-1">
      {[
        { etiqueta: t("tu"), valor: yo },
        { etiqueta: nombreOtro, valor: otro },
      ].map((b) => (
        <div key={b.etiqueta} className="flex items-center gap-2 text-xs">
          <span className="w-16 shrink-0 truncate text-muted">{b.etiqueta}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{ width: `${b.valor}%`, background: "var(--accent-grad)" }} />
          </div>
          <span className="w-9 shrink-0 text-right tabular-nums">{b.valor}%</span>
        </div>
      ))}
    </div>
  );
}

/** "Platinar juntos" del Planificador — ver lib/coop.ts. */
export function PlatinarJuntos({ retos, comunes }: { retos: Reto[]; comunes: Comun[] }) {
  const t = useTranslations("Analitica.planificador.coop");
  const locale = useLocale();
  const [proponiendo, setProponiendo] = useState<string | null>(null);
  const [fecha, setFecha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  if (retos.length === 0 && comunes.length === 0) return null;

  function ejecutar(accion: () => Promise<{ error?: string }>, alTerminar?: () => void) {
    setError(null);
    startTransition(async () => {
      const r = await accion();
      if (r.error) setError(r.error);
      else alTerminar?.();
    });
  }

  const fechaLegible = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" });

  return (
    <section className="rounded-[18px] border border-border bg-surface p-5">
      <h2 className="flex items-center gap-2 font-heading text-xl font-bold uppercase tracking-wide">
        <Handshake size={20} className="text-[var(--accent-text)]" /> {t("titulo")}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("subtitulo")}</p>

      {retos.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {retos.map((r) => (
            <div key={r.id} className="rounded-xl border border-border p-3">
              <p className="text-sm font-bold">{r.titulo}</p>
              <p className="text-xs text-muted">
                {t("conQuien", { nombre: r.otro.nombre, fecha: fechaLegible(r.fechaObjetivo) })}
                {r.estado === "cumplido" && <span className="ml-1 font-bold text-good">· {t("cumplido")}</span>}
              </p>
              <Barras yo={r.miProgreso} otro={r.suProgreso} nombreOtro={r.otro.nombre} t={t} />
              {r.estado === "pendiente" &&
                (r.soyCreador ? (
                  <p className="mt-2 text-xs text-muted">{t("esperando")}</p>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={pendiente}
                      onClick={() => ejecutar(() => responderRetoAction(r.id, true))}
                      className="rounded-lg px-3 py-1.5 text-xs font-bold text-background transition-all hover:-translate-y-0.5 disabled:opacity-50"
                      style={{ background: "var(--accent-grad)" }}
                    >
                      {t("aceptar")}
                    </button>
                    <button
                      type="button"
                      disabled={pendiente}
                      onClick={() => ejecutar(() => responderRetoAction(r.id, false))}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-danger"
                    >
                      {t("rechazar")}
                    </button>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      {comunes.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-muted">{t("enComun")}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {comunes.map((c) => {
              const clave = `${c.amigo.userId}:${c.miGameId}`;
              return (
                <div key={clave} className="rounded-xl border border-border p-3">
                  <p className="truncate text-sm font-bold">{c.titulo}</p>
                  <Barras yo={c.miProgreso} otro={c.suProgreso} nombreOtro={c.amigo.nombre} t={t} />
                  {proponiendo === clave ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        aria-label={t("fecha")}
                        className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        disabled={pendiente || !fecha}
                        onClick={() =>
                          ejecutar(
                            () => proponerRetoAction({ invitadoId: c.amigo.userId, miGameId: c.miGameId, suGameId: c.suGameId, fecha }),
                            () => setProponiendo(null),
                          )
                        }
                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-background transition-all hover:-translate-y-0.5 disabled:opacity-50"
                        style={{ background: "var(--accent-grad)" }}
                      >
                        {t("enviar")}
                      </button>
                      <button type="button" onClick={() => setProponiendo(null)} className="text-xs text-muted hover:text-foreground">
                        {t("cancelar")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setProponiendo(clave);
                        setFecha("");
                      }}
                      className="mt-2 text-xs font-semibold text-[var(--accent-text)] hover:underline"
                    >
                      {t("proponer", { nombre: c.amigo.nombre })}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      {error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}
    </section>
  );
}
