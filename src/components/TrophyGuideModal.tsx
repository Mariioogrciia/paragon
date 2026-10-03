"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  searchTrophyGuideAction,
  videosGuiaAction,
  videosGuiaTextoAction,
  pinTrophyAction,
  getTrophyGuidesAction,
  saveTrophyGuideAction,
  deleteTrophyGuideAction,
  actualizarContadorManualAction,
  type ActionState,
} from "@/app/actions";
import { type Trophy } from "@/lib/types";
import { TrophyIcon, TrophyTypeIcon } from "@/components/TrophyIcon";
import { clasificarTrofeo } from "@/lib/trophyType";
import { Avatar } from "@/components/Avatar";
import { relativeDate } from "@/lib/design";
import type { TrophyGuideRow } from "@/lib/trophyGuides";
import { Pin, PinOff } from "lucide-react";
import { ConfirmForm } from "@/components/ui/ConfirmForm";

const EMPTY: ActionState = {};

/**
 * Enlaces de búsqueda externa — se quedan como alternativa cuando nadie de
 * aquí ha escrito todavía nada de este trofeo, no como la única opción: la
 * URL de verdad se abre en pestaña nueva, nada incrustado (la mayoría de
 * estos sitios bloquean el framing, y aunque no lo hicieran, reproducir su
 * contenido dentro de Paragon sin permiso no toca).
 */
const FUENTES_GUIA = [
  { label: "Google", sitio: null },
  { label: "Vandal", sitio: "vandal.elespanol.com" },
  { label: "Meristation", sitio: "as.com/meristation" },
  { label: "3DJuegos", sitio: "3djuegos.com" },
] as const;

function urlBusquedaGuia(gameTitle: string, trophyName: string, sitio: string | null, terminoBusqueda: string) {
  const consulta = `${gameTitle} "${trophyName}" ${terminoBusqueda}${sitio ? ` site:${sitio}` : ""}`;
  return `https://www.google.com/search?q=${encodeURIComponent(consulta)}`;
}

export function TrophyGuideModal({
  gameTitle,
  gameId,
  trophy,
  esMio,
  isPinned,
  onClose,
}: {
  gameTitle: string;
  gameId?: string;
  trophy: Trophy;
  esMio?: boolean;
  isPinned?: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("Biblioteca");
  const [isPending, startTransition] = useTransition();
  const [videos, setVideos] = useState<string[]>([]);
  const [indice, setIndice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pestaña, setPestaña] = useState<"video" | "guia">("video");
  // "¿Qué te falta?": búsqueda con el texto de la persona (no se guarda).
  const [textoInput, setTextoInput] = useState("");
  const [textoActivo, setTextoActivo] = useState<string | null>(null);
  const [errorTexto, setErrorTexto] = useState<string | null>(null);
  const [sinResultadosTexto, setSinResultadosTexto] = useState(false);

  async function cargarGenerales() {
    setLoading(true);
    // Con gameId: varios vídeos en el idioma de la interfaz, cacheados por
    // trofeo e idioma. Sin él (juego manual sin id real) se busca uno en vivo.
    const ids = gameId
      ? await videosGuiaAction(gameId, trophy.id)
      : await searchTrophyGuideAction(gameTitle, trophy.name, gameId, trophy.id).then((id) => (id ? [id] : []));
    setVideos(ids);
    setIndice(0);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial al abrir el modal; la respuesta llega después, asíncrona.
    cargarGenerales();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir (o cambiar de trofeo), no con cada render de cargarGenerales.
  }, [gameTitle, trophy.name, gameId, trophy.id]);

  function buscarConTexto(e: React.FormEvent) {
    e.preventDefault();
    const texto = textoInput.trim();
    if (!texto || !gameId) return;
    setErrorTexto(null);
    setSinResultadosTexto(false);
    setLoading(true);
    startTransition(async () => {
      try {
        const r = await videosGuiaTextoAction(gameId, trophy.id, texto);
        if (r.error) {
          setErrorTexto(
            r.error === "ofensivo"
              ? t("TrophyGuideModal.offensive")
              : r.error === "limite"
                ? t("TrophyGuideModal.limit")
                : r.error === "sesion"
                  ? t("TrophyGuideModal.needLogin")
                  : null,
          );
        } else {
          setVideos(r.videos);
          setIndice(0);
          setTextoActivo(texto);
          setSinResultadosTexto(r.videos.length === 0);
        }
      } catch {
        // `requireUserId` lanza sin sesión.
        setErrorTexto(t("TrophyGuideModal.needLogin"));
      } finally {
        setLoading(false);
      }
    });
  }

  function volverALaGeneral() {
    setTextoActivo(null);
    setTextoInput("");
    setSinResultadosTexto(false);
    setErrorTexto(null);
    startTransition(() => {
      cargarGenerales();
    });
  }

  const videoId = videos[indice] ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-[24px] shadow-2xl"
        style={{ background: "var(--background)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between border-b border-border p-4 px-6">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 truncate font-heading text-[1.125rem] font-bold text-foreground">
              {t("TrophyGuideModal.title", { name: trophy.name })}
              {(() => {
                const tipo = clasificarTrofeo(trophy);
                return tipo ? (
                  <span className="shrink-0 text-muted">
                    <TrophyTypeIcon tipo={tipo} size={15} />
                  </span>
                ) : null;
              })()}
            </h2>
            <p className="truncate text-[0.8125rem] text-muted">
              {gameTitle}
            </p>
          </div>

          <div className="flex items-center">
            {esMio && gameId && (
              <button
                onClick={() => {
                  startTransition(async () => {
                    await pinTrophyAction(gameId, trophy.id);
                  });
                }}
                disabled={isPending}
                title={isPinned ? t("TrophyGuideModal.unpin") : t("TrophyGuideModal.pin")}
                className={`ml-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${isPinned ? "bg-[rgb(var(--accent-rgb))] text-black" : "hover:bg-white/10 text-muted hover:text-white"}`}
              >
                {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
              </button>
            )}
            <button
              onClick={onClose}
              className="ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10 text-muted hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 border-b border-border px-6 py-2.5">
          {(
            [
              { value: "video", label: t("TrophyGuideModal.tabVideo") },
              { value: "guia", label: t("TrophyGuideModal.tabWrittenGuide") },
            ] as const
          ).map((t) => (
            <button
              key={t.value}
              onClick={() => setPestaña(t.value)}
              className="rounded-lg px-3 py-1.5 text-[0.8125rem] font-semibold transition-colors hover:text-foreground"
              style={
                pestaña === t.value
                  ? { background: "rgb(var(--accent-rgb) / 0.14)", color: "var(--accent-text)" }
                  : { color: "var(--muted)" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {pestaña === "video" ? (
          <>
            <div className="relative aspect-video w-full bg-black">
              {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent" />
                  <p className="text-sm">{textoActivo !== null || isPending ? t("TrophyGuideModal.missingSearching") : t("TrophyGuideModal.searchingBest")}</p>
                </div>
              ) : videoId ? (
                <iframe
                  key={videoId}
                  className="absolute inset-0 h-full w-full border-0"
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-muted">
                  <p className="mb-2 text-lg">{sinResultadosTexto ? t("TrophyGuideModal.noResultsText") : t("TrophyGuideModal.noVideoFound")}</p>
                  {!sinResultadosTexto && <p className="text-sm">{t("TrophyGuideModal.noVideoFoundDetail")}</p>}
                </div>
              )}

              {videos.length > 1 && !loading && (
                <button
                  onClick={() => setIndice((i) => (i + 1) % videos.length)}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-black/80"
                  style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(6px)" }}
                  title={t("TrophyGuideModal.wrongVideoHint")}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 4l10 8-10 8V4zM19 5v14" />
                  </svg>
                  {t("TrophyGuideModal.nextVideo")}
                </button>
              )}
            </div>

            {videos.length > 1 && !loading && (
              <div className="flex gap-2 overflow-x-auto border-b border-border px-6 py-3" role="tablist">
                {videos.map((id, n) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={n === indice}
                    aria-label={t("TrophyGuideModal.videoN", { n: n + 1 })}
                    onClick={() => setIndice(n)}
                    className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md transition-opacity hover:opacity-100"
                    style={{ opacity: n === indice ? 1 : 0.6, outline: n === indice ? "2px solid var(--accent)" : "none", outlineOffset: 1 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {gameId && (
              <form onSubmit={buscarConTexto} className="border-b border-border px-6 py-3">
                <label htmlFor="guia-que-falta" className="text-[0.8125rem] font-bold">
                  {t("TrophyGuideModal.missingLabel")}
                </label>
                <p className="text-xs text-muted">{t("TrophyGuideModal.missingHelp")}</p>
                <div className="mt-2 flex gap-2">
                  <input
                    id="guia-que-falta"
                    value={textoInput}
                    onChange={(e) => setTextoInput(e.target.value)}
                    maxLength={80}
                    placeholder={t("TrophyGuideModal.missingPlaceholder")}
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-lg border border-border bg-[var(--surface)] px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
                  />
                  <button
                    type="submit"
                    disabled={isPending || !textoInput.trim()}
                    className="rounded-lg px-4 py-2 text-[0.8125rem] font-bold text-background transition-all hover:brightness-110 disabled:opacity-50"
                    style={{ background: "var(--accent-grad)" }}
                  >
                    {isPending ? t("TrophyGuideModal.missingSearching") : t("TrophyGuideModal.missingButton")}
                  </button>
                </div>
                {errorTexto && <p role="alert" className="mt-2 text-xs font-semibold text-danger">{errorTexto}</p>}
                {textoActivo !== null && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    <span>{t("TrophyGuideModal.missingResults", { texto: textoActivo })}</span>
                    <button type="button" onClick={volverALaGeneral} className="rounded-md px-1 font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-soft)] hover:underline">
                      {t("TrophyGuideModal.backToGeneral")}
                    </button>
                  </p>
                )}
              </form>
            )}
          </>
        ) : (
          <GuiaEscritaTab gameId={gameId} gameTitle={gameTitle} trophy={trophy} t={t} />
        )}

        <div className="p-4 px-6 text-[0.8125rem] text-muted flex justify-between items-end">
          <p className="max-w-[80%]">{trophy.detail || t("TrophyGuideModal.noDescription")}</p>
          {trophy.earnedAt && (
            <p className="flex items-center gap-1.5 font-semibold text-accent-text bg-accent-text/10 px-2 py-1 rounded-md text-[0.6875rem] uppercase tracking-wider">
              <TrophyIcon grade={trophy.grade ?? "bronze"} size={14} />
              {t("TrophyGuideModal.earnedOn", { date: new Date(trophy.earnedAt).toLocaleDateString() })}
            </p>
          )}
        </div>

        {esMio && gameId && !trophy.earned && !trophy.progress && (
          <ContadorManual gameId={gameId} trophy={trophy} />
        )}
      </div>
    </div>
  );
}

/**
 * Contador manual +/- para trofeos que ni PSN ni Steam desglosan ("gana 50
 * partidas", "encuentra las 100 plumas") — a diferencia de `trophy.progress`
 * (arriba, cuando la propia plataforma sí lo da), este lo lleva la persona a
 * mano. Solo se enseña sin ese progreso nativo y con el trofeo sin conseguir
 * todavía: una vez lo tienes, contar ya no aporta nada.
 */
function ContadorManual({ gameId, trophy }: { gameId: string; trophy: Trophy }) {
  const t = useTranslations("Biblioteca");
  const [manual, setManual] = useState(trophy.manualProgress ?? null);
  const [metaEnCurso, setMetaEnCurso] = useState("");
  const [configurando, setConfigurando] = useState(false);
  const [isPending, startTransition] = useTransition();

  function guardar(current: number, target: number | null) {
    startTransition(async () => {
      const res = await actualizarContadorManualAction(gameId, trophy.id, current, target);
      if (!res.error) {
        setManual(target != null ? { current, target } : null);
        setConfigurando(false);
      }
    });
  }

  if (!manual) {
    return (
      <div className="border-t border-border px-6 py-3.5">
        {configurando ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const meta = Number(metaEnCurso);
              if (meta > 0) guardar(0, meta);
            }}
            className="flex items-center gap-2.5"
          >
            <label className="text-xs font-semibold text-muted">{t("TrophyGuideModal.manualCounter.goalLabel")}</label>
            <input
              type="number"
              min={1}
              autoFocus
              value={metaEnCurso}
              onChange={(e) => setMetaEnCurso(e.target.value)}
              placeholder={t("TrophyGuideModal.manualCounter.goalPlaceholder")}
              className="w-20 rounded-lg px-2.5 py-1.5 text-sm font-semibold outline-none"
              style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
            />
            <button type="submit" disabled={isPending} className="rounded-lg px-3 py-1.5 text-xs font-bold text-background disabled:opacity-50" style={{ background: "var(--accent-grad)" }}>
              {t("TrophyGuideModal.manualCounter.create")}
            </button>
            <button type="button" onClick={() => setConfigurando(false)} className="text-xs font-semibold text-muted hover:text-foreground">
              {t("TrophyGuideModal.manualCounter.cancel")}
            </button>
          </form>
        ) : (
          <button onClick={() => setConfigurando(true)} className="text-xs font-semibold text-accent hover:underline">
            {t("TrophyGuideModal.manualCounter.start")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3.5 border-t border-border px-6 py-3.5">
      <div className="flex items-center gap-2">
        <button
          onClick={() => guardar(Math.max(0, manual.current - 1), manual.target)}
          disabled={isPending || manual.current <= 0}
          className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition-colors hover:text-foreground disabled:opacity-30"
          style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
        >
          −
        </button>
        <span className="min-w-[64px] text-center text-sm font-bold tabular-nums">
          {manual.current}/{manual.target}
        </span>
        <button
          onClick={() => guardar(Math.min(manual.target, manual.current + 1), manual.target)}
          disabled={isPending || manual.current >= manual.target}
          className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition-colors hover:text-foreground disabled:opacity-30"
          style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
        >
          +
        </button>
      </div>
      <div className="h-1.5 flex-1 max-w-[200px] overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full" style={{ width: `${Math.round((manual.current / manual.target) * 100)}%`, background: "var(--gold)" }} />
      </div>
      <button onClick={() => guardar(0, null)} disabled={isPending} className="text-xs font-semibold text-muted hover:text-danger">
        {t("TrophyGuideModal.manualCounter.remove")}
      </button>
    </div>
  );
}

function Submit({ children }: { children: React.ReactNode }) {
  return (
    <button
      className="rounded-[10px] px-4 py-2 text-[0.8125rem] font-bold transition-all hover:-translate-y-0.5"
      style={{ background: "var(--accent-grad)", color: "var(--background)" }}
    >
      {children}
    </button>
  );
}

/**
 * La pestaña "Guía escrita": guías reales de gente de aquí, con hueco para
 * escribir/editar la tuya. Sin `gameId` (fichas sin juego vinculado en la
 * base) no hay dónde guardar nada, así que directamente no se ofrece
 * escribir — solo quedan los enlaces de búsqueda de siempre.
 */
function GuiaEscritaTab({ gameId, gameTitle, trophy, t }: { gameId?: string; gameTitle: string; trophy: Trophy; t: ReturnType<typeof useTranslations> }) {
  const idioma = useLocale();
  const [datos, setDatos] = useState<{ guides: TrophyGuideRow[]; currentUserId: string | null } | null>(null);
  const [editando, setEditando] = useState(false);
  const [state, action] = useActionState(saveTrophyGuideAction, EMPTY);

  useEffect(() => {
    if (!gameId) return;
    getTrophyGuidesAction(gameId, trophy.id).then(setDatos);
  }, [gameId, trophy.id]);

  // Tras publicar con éxito, se recarga la lista y se cierra el formulario.
  useEffect(() => {
    if (state.success && gameId) {
      getTrophyGuidesAction(gameId, trophy.id).then(setDatos);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- cierra el formulario cuando la acción de publicar termina bien.
      setEditando(false);
    }
  }, [state.success, gameId, trophy.id]);

  const mia = datos?.currentUserId ? datos.guides.find((g) => g.authorId === datos.currentUserId) : undefined;
  const deOtros = datos?.guides.filter((g) => g.id !== mia?.id) ?? [];

  return (
    <div className="max-h-[60vh] overflow-y-auto p-6">
      {!gameId ? (
        <p className="mb-4 text-sm text-muted">{t("TrophyGuideModal.writtenGuide.notLinked")}</p>
      ) : !datos ? (
        <p className="text-sm text-muted">{t("TrophyGuideModal.writtenGuide.loading")}</p>
      ) : (
        <>
          {datos.guides.length === 0 && (
            <p className="mb-4 text-sm text-muted">{t("TrophyGuideModal.writtenGuide.empty")}</p>
          )}

          {mia && !editando && (
            <div className="mb-3 rounded-xl p-4" style={{ border: "1px solid rgb(var(--accent-rgb) / 0.35)", background: "rgb(var(--accent-rgb) / 0.08)" }}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-accent-text">{t("TrophyGuideModal.writtenGuide.yours")}</span>
                <div className="flex gap-3">
                  <button onClick={() => setEditando(true)} className="text-xs font-semibold text-muted hover:text-foreground">
                    {t("TrophyGuideModal.writtenGuide.edit")}
                  </button>
                  <ConfirmForm
                    action={deleteTrophyGuideAction}
                    hidden={{ gameId, trophyId: trophy.id }}
                    title={t("TrophyGuideModal.writtenGuide.deleteConfirmTitle")}
                    message={t("TrophyGuideModal.writtenGuide.deleteConfirmMessage")}
                    confirmLabel={t("TrophyGuideModal.writtenGuide.deleteConfirmLabel")}
                    triggerClassName="text-xs font-semibold text-muted hover:text-danger"
                  >
                    {t("TrophyGuideModal.writtenGuide.delete")}
                  </ConfirmForm>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground/90">{mia.body}</p>
            </div>
          )}

          {datos.currentUserId && (!mia || editando) && (
            <form action={action} className="mb-4">
              <input type="hidden" name="gameId" value={gameId} />
              <input type="hidden" name="trophyId" value={trophy.id} />
              <textarea
                name="body"
                defaultValue={mia?.body ?? ""}
                rows={4}
                maxLength={4000}
                placeholder={t("TrophyGuideModal.writtenGuide.placeholder")}
                className="w-full resize-none rounded-xl p-3.5 text-sm outline-none placeholder:text-muted"
                style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
              />
              <div className="mt-2 flex items-center gap-3">
                <Submit>{mia ? t("TrophyGuideModal.writtenGuide.saveChanges") : t("TrophyGuideModal.writtenGuide.publish")}</Submit>
                {editando && (
                  <button type="button" onClick={() => setEditando(false)} className="text-xs font-semibold text-muted hover:text-foreground">
                    {t("TrophyGuideModal.writtenGuide.cancel")}
                  </button>
                )}
                {state.error && <p className="text-xs text-danger">{state.error}</p>}
              </div>
            </form>
          )}

          {!datos.currentUserId && (
            <p className="mb-4 text-xs text-muted">
              {t.rich("TrophyGuideModal.writtenGuide.signInToWrite", {
                link: (chunks) => (
                  <Link href="/entrar" className="font-semibold text-accent hover:underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          )}

          {deOtros.length > 0 && (
            <div className="space-y-3">
              {deOtros.map((g) => (
                <div key={g.id} className="rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div className="mb-2 flex items-center gap-2.5">
                    <Avatar src={g.authorImage} name={g.authorName ?? g.authorHandle ?? "?"} size={24} />
                    {g.authorHandle ? (
                      <Link href={`/u/${g.authorHandle}`} className="text-[0.8125rem] font-semibold hover:underline">
                        {g.authorName ?? `@${g.authorHandle}`}
                      </Link>
                    ) : (
                      <span className="text-[0.8125rem] font-semibold">{g.authorName ?? t("TrophyGuideModal.writtenGuide.someone")}</span>
                    )}
                    <span className="text-xs text-muted">{relativeDate(g.updatedAt, idioma)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">{g.body}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-6 border-t border-border pt-4">
        <p className="mb-2.5 text-xs text-muted">{t("TrophyGuideModal.writtenGuide.searchElsewhere")}</p>
        <div className="flex flex-wrap gap-2">
          {FUENTES_GUIA.map((f) => (
            <a
              key={f.label}
              href={urlBusquedaGuia(gameTitle, trophy.name, f.sitio, t("TrophyGuideModal.writtenGuide.searchTerm"))}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-foreground"
              style={{ border: "1px solid var(--border)" }}
            >
              {t("TrophyGuideModal.writtenGuide.searchOn", { site: f.label })}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
