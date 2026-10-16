"use client";

/* eslint-disable @next/next/no-img-element -- avatares de PSN, Steam y Xbox (CDNs externos), como en el resto de la web: next/image gastaría la cuota de optimización del plan Hobby */
import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { comprobarCuentaAction, vincularDesdeAsistenteAction, type ActionState } from "@/app/actions";
import type { ClaveComprobacion, Diagnostico, PlataformaAsistente } from "@/lib/comprobarCuenta";
import type { PlataformaVinculable } from "@/lib/types";
import { PlayStationLogo, SteamLogo, XboxLogo } from "@/components/ui/PlatformLogos";

/**
 * Asistente para vincular una cuenta (16 oct 2026). Es el momento en el que
 * más gente se perdía: no sabía qué escribir (en Steam, el nombre visible no
 * vale) o vinculaba una cuenta privada y se encontraba la biblioteca vacía.
 *
 * Un solo paso a la vista: eliges la plataforma, una ilustración enseña
 * dónde está tu ID, y "Comprobar" lee la cuenta SIN vincularla
 * (`comprobarCuentaAction`) y dice qué ajuste falta, con otra ilustración de
 * dónde tocarlo. "Vincular" es lo mismo que los formularios de siempre.
 *
 * Las ilustraciones son maquetas dibujadas con HTML (no capturas): no se
 * quedan viejas cuando Sony, Valve o Microsoft cambian un color, y salen en
 * el idioma de quien mira.
 */

const PLATAFORMAS: { id: PlataformaAsistente; nombre: string; fondo: string; Logo: typeof PlayStationLogo }[] = [
  { id: "psn", nombre: "PlayStation", fondo: "linear-gradient(150deg, #2f7ad6, #6b3fd4)", Logo: PlayStationLogo },
  { id: "steam", nombre: "Steam", fondo: "linear-gradient(150deg, #2f7d9d, #1b2838)", Logo: SteamLogo },
  { id: "xbox", nombre: "Xbox", fondo: "linear-gradient(150deg, #107C10, #16a316)", Logo: XboxLogo },
];

const CAMPO = { border: "1px solid var(--border)", background: "var(--background)" };
const RESALTE = { outline: "2px solid var(--gold)", outlineOffset: "2px", background: "rgba(226, 181, 62, 0.14)" };

export function AsistenteVincular({ vinculadas, handle }: { vinculadas: PlataformaVinculable[]; handle: string | null }) {
  const t = useTranslations("Onboarding");
  const [plataforma, setPlataforma] = useState<PlataformaAsistente>("psn");
  const [entrada, setEntrada] = useState("");
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ActionState | null>(null);
  const [comprobando, empezarComprobar] = useTransition();
  const [vinculando, empezarVincular] = useTransition();

  function elegir(p: PlataformaAsistente) {
    setPlataforma(p);
    setEntrada("");
    setDiagnostico(null);
    setError(null);
    setResultado(null);
  }

  function comprobar() {
    setError(null);
    setResultado(null);
    empezarComprobar(async () => {
      const r = await comprobarCuentaAction(plataforma, entrada);
      setDiagnostico(r.diagnostico ?? null);
      setError(r.error ?? null);
    });
  }

  function vincular() {
    empezarVincular(async () => {
      setResultado(await vincularDesdeAsistenteAction(plataforma, entrada));
    });
  }

  const pasos = t.raw(`asistente.donde.${plataforma}.pasos`) as string[];
  const vinculado = resultado && !resultado.error;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <Etiqueta numero={1} texto={t("asistente.paso1")} />
        <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("asistente.paso1")}>
          {PLATAFORMAS.map(({ id, nombre, fondo, Logo }) => {
            const activa = id === plataforma;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={activa}
                onClick={() => elegir(id)}
                className="relative flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-[0.8125rem] font-bold transition-colors"
                style={
                  activa
                    ? { background: "rgb(var(--accent-rgb) / 0.12)", border: "1px solid rgb(var(--accent-rgb) / 0.4)", color: "var(--accent-text)" }
                    : { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--muted)" }
                }
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] text-white" style={{ background: fondo }}>
                  <Logo className="h-5 w-5" />
                </span>
                {nombre}
                {vinculadas.includes(id) && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-good text-background" aria-hidden="true">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">{t("asistente.epic")}</p>
      </section>

      <section>
        <Etiqueta numero={2} texto={t("asistente.paso2")} />
        <div className="mt-3 grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <IlustracionDonde plataforma={plataforma} />
          <div>
            <p className="font-heading text-[0.9375rem] font-bold">{t(`asistente.donde.${plataforma}.titulo`)}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[0.8125rem] text-muted marker:text-accent">
              {pasos.map((paso) => (
                <li key={paso}>{paso}</li>
              ))}
            </ol>
          </div>
        </div>

        <form
          className="mt-4 flex flex-col gap-2.5 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (entrada.trim() && !comprobando) comprobar();
          }}
        >
          <input
            value={entrada}
            onChange={(e) => {
              setEntrada(e.target.value);
              setDiagnostico(null);
              setError(null);
            }}
            placeholder={t(`forms.${plataforma}.placeholder`)}
            aria-label={t(`asistente.donde.${plataforma}.titulo`)}
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-xl px-3.5 py-3.5 text-[0.9375rem] text-foreground outline-none placeholder:text-muted"
            style={CAMPO}
          />
          <button
            type="submit"
            disabled={comprobando || !entrada.trim()}
            className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-background transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            style={{ background: "var(--accent-grad)" }}
          >
            {comprobando ? t("asistente.comprobando") : t("asistente.comprobar")}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </section>

      {diagnostico && (
        <section aria-live="polite">
          <Etiqueta numero={3} texto={t("asistente.paso3")} />
          <div className="mt-3 rounded-[16px] p-4" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white"
                style={{ background: PLATAFORMAS.find((p) => p.id === plataforma)?.fondo }}
              >
                {diagnostico.avatarUrl ? (
                  <img src={diagnostico.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  diagnostico.username.charAt(0).toUpperCase()
                )}
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted">{t("asistente.eresTu")}</p>
                <p className="truncate font-heading text-[1.0625rem] font-bold">{diagnostico.username}</p>
              </div>
            </div>

            <ul className="mt-4 flex flex-col gap-2">
              {diagnostico.comprobaciones.map((c) => (
                <li key={c.clave} className="flex items-center gap-2.5 text-sm">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${c.ok ? "bg-good" : "bg-danger"} text-background`}
                    aria-hidden="true"
                  >
                    {c.ok ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
                  </span>
                  <span className={c.ok ? "" : "font-semibold"}>{textoFila(t, c.clave, c.ok)}</span>
                </li>
              ))}
            </ul>

            {diagnostico.bloqueada ? (
              <p className="mt-4 text-[0.8125rem] text-muted">{t("asistente.libreAyuda")}</p>
            ) : (
              !diagnostico.listo && <Arreglo plataforma={plataforma} diagnostico={diagnostico} />
            )}

            {!diagnostico.bloqueada && (
              <div className="mt-4 border-t border-border pt-4">
                <p className={`text-[0.8125rem] ${diagnostico.listo ? "text-good" : "text-muted"}`}>
                  {diagnostico.listo ? t("asistente.listo") : t("asistente.noListo")}
                </p>
                {vinculado ? (
                  <div className="mt-3">
                    <p className="text-sm" style={{ color: resultado.warning ? "#e2b53e" : undefined }}>
                      {resultado.warning ?? resultado.success}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {handle && (
                        <Link
                          href={`/u/${handle}`}
                          className="rounded-xl px-4 py-2.5 text-sm font-bold text-background"
                          style={{ background: "var(--accent-grad)" }}
                        >
                          {t("asistente.verBiblioteca")}
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => elegir(plataforma)}
                        className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-[var(--surface)] hover:text-foreground"
                      >
                        {t("asistente.otraPlataforma")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {!diagnostico.listo && (
                      <button
                        type="button"
                        onClick={comprobar}
                        disabled={comprobando || vinculando}
                        className="rounded-xl px-4 py-2.5 text-sm font-bold text-background disabled:opacity-50"
                        style={{ background: "var(--accent-grad)" }}
                      >
                        {comprobando ? t("asistente.comprobando") : t("asistente.volverAComprobar")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={vincular}
                      disabled={vinculando || comprobando}
                      className={
                        diagnostico.listo
                          ? "rounded-xl px-4 py-2.5 text-sm font-bold text-background disabled:opacity-50"
                          : "rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-[var(--surface)] hover:text-foreground disabled:opacity-50"
                      }
                      style={diagnostico.listo ? { background: "var(--accent-grad)" } : undefined}
                    >
                      {vinculando
                        ? t("asistente.vinculando")
                        : diagnostico.listo
                          ? t("asistente.vincular", { nombre: diagnostico.username })
                          : t("asistente.vincularIgual")}
                    </button>
                  </div>
                )}
                {resultado?.error && <p className="mt-2 text-sm text-danger">{resultado.error}</p>}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

type Traductor = ReturnType<typeof useTranslations<"Onboarding">>;

function textoFila(t: Traductor, clave: ClaveComprobacion, ok: boolean): string {
  if (clave === "encontrada" || clave === "libre") return t(`asistente.filas.${clave}`);
  return t(`asistente.filas.${clave}.${ok ? "ok" : "mal"}`);
}

function Etiqueta({ numero, texto }: { numero: number; texto: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="font-heading flex h-[26px] w-[26px] items-center justify-center rounded-[8px] text-[0.8125rem] font-bold"
        style={{ background: "rgb(var(--accent-rgb) / 0.12)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent-text)" }}
      >
        {numero}
      </span>
      <h2 className="font-heading text-[1rem] font-bold tracking-[0.03em]">{texto}</h2>
    </div>
  );
}

/** Qué tocar para lo que ha salido en rojo: la maqueta del ajuste y los pasos de siempre (privacyGuide). */
function Arreglo({ plataforma, diagnostico }: { plataforma: PlataformaAsistente; diagnostico: Diagnostico }) {
  const t = useTranslations("Onboarding");
  const pasos = t.raw(`privacyGuide.steps.${plataforma}`) as string[];
  const mal = new Set(diagnostico.comprobaciones.filter((c) => !c.ok).map((c) => c.clave));

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="font-heading text-sm font-bold">{t("asistente.comoArreglarlo")}</p>
      <div className="mt-3 grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <IlustracionAjuste plataforma={plataforma} mal={mal} />
        <ol className="list-decimal space-y-1.5 pl-5 text-[0.8125rem] text-muted marker:text-accent">
          {pasos.map((paso) => (
            <li key={paso}>{paso}</li>
          ))}
        </ol>
      </div>
      {plataforma === "psn" && (
        <p className="mt-3 text-xs text-muted">
          {t("asistente.psnExtension")}{" "}
          <Link href="/movil/enlazar-extension" className="font-bold text-[var(--accent-text)] hover:underline">
            {t("asistente.psnExtensionEnlace")} →
          </Link>
        </p>
      )}
    </div>
  );
}

/* --------------------------------- Maquetas -------------------------------- */

/** Marco común: una "pantalla" pequeña con la barra de la plataforma arriba. */
function Pantalla({ plataforma, titulo, children }: { plataforma: PlataformaAsistente; titulo: string; children: React.ReactNode }) {
  const t = useTranslations("Onboarding");
  const { fondo, Logo } = PLATAFORMAS.find((p) => p.id === plataforma)!;
  return (
    <figure className="overflow-hidden rounded-[14px] text-[0.75rem]" style={{ border: "1px solid var(--border)", background: "var(--background)" }}>
      <figcaption className="sr-only">{t("asistente.ilustracion")}</figcaption>
      <div className="flex items-center gap-2 px-3 py-2 font-bold text-white" style={{ background: fondo }} aria-hidden="true">
        <Logo className="h-3.5 w-3.5" />
        {titulo}
      </div>
      <div className="p-3" aria-hidden="true">
        {children}
      </div>
    </figure>
  );
}

function IlustracionDonde({ plataforma }: { plataforma: PlataformaAsistente }) {
  const t = useTranslations("Onboarding");

  if (plataforma === "steam") {
    return (
      <figure className="overflow-hidden rounded-[14px] text-[0.75rem]" style={{ border: "1px solid var(--border)", background: "var(--background)" }}>
        <figcaption className="sr-only">{t("asistente.ilustracion")}</figcaption>
        <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: "var(--surface-2)" }} aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
          <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
          <span className="h-2 w-2 rounded-full bg-[#28c840]" />
          <span className="ml-2 min-w-0 flex-1 truncate rounded-md px-2 py-1 font-mono text-[0.6875rem] text-muted" style={{ background: "var(--background)" }}>
            steamcommunity.com/id/
            <span className="rounded px-0.5 font-bold text-foreground" style={{ ...RESALTE, outlineOffset: "-1px" }}>
              tu_nombre
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2.5 p-3" style={{ background: "linear-gradient(150deg, #2f7d9d33, #1b283855)" }} aria-hidden="true">
          <span className="h-9 w-9 rounded-md" style={{ background: "linear-gradient(150deg, #2f7d9d, #1b2838)" }} />
          <div className="flex-1">
            <div className="h-2.5 w-24 rounded bg-[var(--muted)] opacity-40" />
            <div className="mt-1.5 h-2 w-16 rounded bg-[var(--muted)] opacity-25" />
          </div>
        </div>
      </figure>
    );
  }

  const nombre = plataforma === "psn" ? "Kratos_1987" : "MasterChief#1234";
  return (
    <Pantalla plataforma={plataforma} titulo={t("asistente.maqueta.perfil")}>
      <div className="flex items-center gap-3">
        <span className="h-11 w-11 shrink-0 rounded-full" style={{ background: PLATAFORMAS.find((p) => p.id === plataforma)!.fondo }} />
        <div className="min-w-0">
          {plataforma === "psn" && <p className="text-[0.625rem] uppercase tracking-[0.08em] text-muted">{t("asistente.maqueta.idOnline")}</p>}
          <p className="mt-0.5 inline-block truncate rounded px-1 text-[0.875rem] font-bold" style={RESALTE}>
            {nombre}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-1.5">
        <div className="h-2 w-12 rounded bg-[var(--muted)] opacity-25" />
        <div className="h-2 w-8 rounded bg-[var(--muted)] opacity-25" />
      </div>
    </Pantalla>
  );
}

function Fila({ etiqueta, valor, resaltada }: { etiqueta: string; valor: string; resaltada: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5" style={resaltada ? RESALTE : undefined}>
      <span className="min-w-0 truncate">{etiqueta}</span>
      <span className="shrink-0 rounded px-1.5 py-0.5 font-bold" style={{ background: "var(--surface-2)" }}>
        {valor} ▾
      </span>
    </div>
  );
}

function IlustracionAjuste({ plataforma, mal }: { plataforma: PlataformaAsistente; mal: Set<ClaveComprobacion> }) {
  const t = useTranslations("Onboarding");

  if (plataforma === "steam") {
    return (
      <Pantalla plataforma="steam" titulo={t("asistente.maqueta.steamPrivacidad")}>
        <div className="flex flex-col gap-1.5">
          <Fila etiqueta={t("asistente.maqueta.steamPerfil")} valor={t("asistente.maqueta.publico")} resaltada={mal.has("perfilPublico")} />
          <Fila etiqueta={t("asistente.maqueta.steamDetalles")} valor={t("asistente.maqueta.publico")} resaltada={mal.has("detallesJuego")} />
        </div>
        <div className="mt-3 flex justify-end">
          <span className="rounded px-2.5 py-1 font-bold text-white" style={{ background: "#2f7d9d" }}>
            {t("asistente.maqueta.guardar")}
          </span>
        </div>
      </Pantalla>
    );
  }

  if (plataforma === "psn") {
    return (
      <Pantalla plataforma="psn" titulo={t("asistente.maqueta.privacidad")}>
        <Fila etiqueta={t("asistente.maqueta.psnTrofeos")} valor={t("asistente.maqueta.cualquiera")} resaltada />
      </Pantalla>
    );
  }

  return (
    <Pantalla plataforma="xbox" titulo={t("asistente.maqueta.xboxPrivacidad")}>
      <Fila etiqueta={t("asistente.maqueta.xboxHistorial")} valor={t("asistente.maqueta.todos")} resaltada />
    </Pantalla>
  );
}
