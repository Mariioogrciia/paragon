"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Swords, Trophy } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Selector } from "@/components/ui/Selector";
import { cancelarRetoAmigosAction, crearRetoAmigosAction, responderRetoAmigosAction } from "@/app/actions";
import { DURACIONES_RETO, MAX_INVITADOS_RETO } from "@/lib/retosAmigosReglas";

interface Participante {
  userId: string;
  nombre: string;
  handle: string | null;
  avatar: string | null;
  estado: string;
  trofeos: number;
  ganador: boolean;
}

interface Reto {
  id: string;
  titulo: string | null;
  estado: string;
  inicio: string;
  fin: string;
  diasRestantes: number;
  soyCreador: boolean;
  miEstado: string;
  participantes: Participante[];
}

interface Amigo {
  userId: string;
  nombre: string;
  handle: string | null;
  avatar: string | null;
}

const BOTON = "rounded-lg px-3 py-1.5 text-xs font-bold text-background transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-50";

/** Retos entre amigos — ver lib/retosAmigos.ts. */
export function RetosAmigos({ retos, amigos, miId }: { retos: Reto[]; amigos: Amigo[]; miId: string }) {
  const t = useTranslations("Perfil.RetosAmigos");
  const locale = useLocale();
  const [creando, setCreando] = useState(false);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [dias, setDias] = useState<number>(7);
  const [titulo, setTitulo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function ejecutar(accion: () => Promise<{ error?: string }>, alTerminar?: () => void) {
    setError(null);
    startTransition(async () => {
      const r = await accion();
      if (r.error) setError(t.has(`errores.${r.error}`) ? t(`errores.${r.error}`) : t("errores.generico"));
      else alTerminar?.();
    });
  }

  const fecha = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });

  function alternar(id: string) {
    setElegidos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_INVITADOS_RETO ? prev : [...prev, id]));
  }

  return (
    <section className="mt-9 rounded-[18px] border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold uppercase tracking-wide">
            <Swords size={20} className="text-[var(--accent-text)]" /> {t("titulo")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("subtitulo")}</p>
        </div>
        {!creando && (
          <button type="button" onClick={() => setCreando(true)} className={BOTON} style={{ background: "var(--accent-grad)" }}>
            {t("nuevo")}
          </button>
        )}
      </div>

      {creando && (
        <div className="mt-4 rounded-xl border border-border p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{t("aQuien", { max: MAX_INVITADOS_RETO })}</p>
          <div className="flex flex-wrap gap-2">
            {amigos.map((a) => {
              const activo = elegidos.includes(a.userId);
              return (
                <button
                  key={a.userId}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => alternar(a.userId)}
                  className="flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-surface-2"
                  style={activo ? { borderColor: "var(--accent)", background: "rgb(var(--accent-rgb) / 0.14)" } : { borderColor: "var(--border)" }}
                >
                  <Avatar src={a.avatar ?? undefined} name={a.nombre} size={20} />
                  {a.nombre}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-xs">
              <span className="mb-1 block font-bold uppercase tracking-wider text-muted">{t("duracion")}</span>
              <Selector
                value={String(dias)}
                onChange={(v) => setDias(Number(v))}
                className="min-w-[140px]"
                options={DURACIONES_RETO.map((d) => ({ value: String(d), label: t("dias", { n: d }) }))}
              />
            </label>
            <label className="min-w-[180px] flex-1 text-xs">
              <span className="mb-1 block font-bold uppercase tracking-wider text-muted">{t("nombreOpcional")}</span>
              <input
                value={titulo}
                maxLength={60}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder={t("nombrePlaceholder")}
                className="w-full rounded-md border border-border bg-surface-2 px-2 py-1.5 text-sm"
              />
            </label>
          </div>

          <p className="mt-3 text-xs text-muted">{t("reglas")}</p>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pendiente || elegidos.length === 0}
              onClick={() =>
                ejecutar(
                  () => crearRetoAmigosAction({ invitados: elegidos, dias, titulo }),
                  () => {
                    setCreando(false);
                    setElegidos([]);
                    setTitulo("");
                  },
                )
              }
              className={BOTON}
              style={{ background: "var(--accent-grad)" }}
            >
              {t("enviar")}
            </button>
            <button type="button" onClick={() => setCreando(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground">
              {t("cancelar")}
            </button>
          </div>
        </div>
      )}

      {retos.length === 0 && !creando && <p className="mt-4 text-sm text-muted">{t("vacio")}</p>}

      {retos.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {retos.map((r) => {
            const aceptados = r.participantes.filter((p) => p.estado === "aceptado");
            const pendientes = r.participantes.filter((p) => p.estado === "pendiente");
            const maximo = Math.max(1, ...aceptados.map((p) => p.trofeos));
            const terminado = r.estado === "terminado";
            return (
              <div key={r.id} className="rounded-xl border border-border p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold">{r.titulo ?? t("sinNombre")}</p>
                  <span className="shrink-0 text-[0.6875rem] font-semibold text-muted">
                    {terminado
                      ? t("terminado", { fecha: fecha(r.fin) })
                      : r.diasRestantes > 0
                        ? t("quedan", { n: r.diasRestantes })
                        : t("cerrando")}
                  </span>
                </div>

                <ol className="mt-2.5 grid gap-1.5">
                  {aceptados.map((p, i) => (
                    <li key={p.userId} className="flex items-center gap-2 text-xs">
                      <span className="w-4 shrink-0 text-right font-bold text-muted">{i + 1}</span>
                      <Avatar src={p.avatar ?? undefined} name={p.nombre} size={22} />
                      <span className="w-20 shrink-0 truncate font-semibold">
                        {p.userId === miId ? t("tu") : p.nombre}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full" style={{ width: `${(p.trofeos / maximo) * 100}%`, background: "var(--accent-grad)" }} />
                      </div>
                      <span className="flex w-12 shrink-0 items-center justify-end gap-1 tabular-nums">
                        {p.ganador && <Trophy size={12} className="text-[#e2b53e]" aria-label={t("ganador")} />}
                        {p.trofeos}
                      </span>
                    </li>
                  ))}
                </ol>

                {pendientes.length > 0 && !terminado && (
                  <p className="mt-2 text-[0.6875rem] text-muted">{t("sinResponder", { nombres: pendientes.map((p) => p.nombre).join(", ") })}</p>
                )}

                {!terminado && r.miEstado === "pendiente" && (
                  <div className="mt-2.5 flex gap-2">
                    <button type="button" disabled={pendiente} onClick={() => ejecutar(() => responderRetoAmigosAction(r.id, true))} className={BOTON} style={{ background: "var(--accent-grad)" }}>
                      {t("aceptar")}
                    </button>
                    <button
                      type="button"
                      disabled={pendiente}
                      onClick={() => ejecutar(() => responderRetoAmigosAction(r.id, false))}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-danger"
                    >
                      {t("rechazar")}
                    </button>
                  </div>
                )}

                {!terminado && r.soyCreador && (
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() => ejecutar(() => cancelarRetoAmigosAction(r.id))}
                    className="mt-2 rounded px-1 text-[0.6875rem] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-danger"
                  >
                    {t("anular")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}
    </section>
  );
}
