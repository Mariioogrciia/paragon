"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  searchTrophyGuideAction,
  rebuscarVideoGuiaAction,
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

function urlBusquedaGuia(gameTitle: string, trophyName: string, sitio: string | null) {
  const consulta = `${gameTitle} "${trophyName}" guía trofeo${sitio ? ` site:${sitio}` : ""}`;
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
  const [isPending, startTransition] = useTransition();
  const [videoId, setVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rebuscando, setRebuscando] = useState(false);
  const [pestaña, setPestaña] = useState<"video" | "guia">("video");

  useEffect(() => {
    setLoading(true);
    // gameId/trophy.id dejan que la acción cachee el resultado en
    // game_trophy — sin ellos (juego manual sin gameId real) busca en vivo
    // igual, solo que sin guardar para la próxima vez.
    searchTrophyGuideAction(gameTitle, trophy.name, gameId, trophy.id).then((id) => {
      setVideoId(id);
      setLoading(false);
    });
  }, [gameTitle, trophy.name, gameId, trophy.id]);

  // "Buscar otro" — el vídeo cacheado puede no ser el correcto (la caché
  // guarda "el primero" de esta misma sesión, no una comprobación de que
  // sea el trofeo de verdad). Solo tiene sentido con `gameId` real: sin él
  // no hay dónde guardar el resultado, y `rebuscarVideoGuiaAction` lo exige.
  function buscarOtro() {
    if (!gameId) return;
    setRebuscando(true);
    startTransition(async () => {
      try {
        const id = await rebuscarVideoGuiaAction(gameId, trophy.id, gameTitle, trophy.name);
        setVideoId(id);
      } catch {
        // Sin sesión (requireUserId lanza) u otro fallo — se queda el vídeo
        // que ya había, sin romper el modal.
      } finally {
        setRebuscando(false);
      }
    });
  }

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
              Guía de trofeo: {trophy.name}
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
                title={isPinned ? "Quitar de la vitrina" : "Fijar en tu vitrina de perfil"}
                className={`ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${isPinned ? "bg-[rgb(var(--accent-rgb))] text-black" : "hover:bg-white/10 text-muted hover:text-white"}`}
              >
                {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
              </button>
            )}
            <button
              onClick={onClose}
              className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10 text-muted hover:text-white"
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
              { value: "video", label: "Vídeo" },
              { value: "guia", label: "Guía escrita" },
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
          <div className="relative aspect-video w-full bg-black">
            {loading || rebuscando ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent" />
                <p className="text-sm">{rebuscando ? "Buscando otro vídeo..." : "Buscando la mejor guía en YouTube..."}</p>
              </div>
            ) : videoId ? (
              <iframe
                className="absolute inset-0 h-full w-full border-0"
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted p-8 text-center">
                <p className="text-lg mb-2">No se encontró vídeo</p>
                <p className="text-sm">No pudimos encontrar una guía en YouTube para este trofeo de manera automática.</p>
              </div>
            )}

            {/* Solo en tu propia ficha: el vídeo es una búsqueda automática,
                no una comprobación humana de que sea el trofeo correcto —
                sin este botón, un acierto malo de la primera búsqueda se
                queda cacheado mal para todo el mundo, para siempre. */}
            {esMio && gameId && !loading && !rebuscando && (
              <button
                onClick={buscarOtro}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-black/80"
                style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(6px)" }}
                title={videoId ? "¿No es el vídeo correcto? Busca otro." : "Buscar de nuevo"}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                {videoId ? "No es este — buscar otro" : "Buscar de nuevo"}
              </button>
            )}
          </div>
        ) : (
          <GuiaEscritaTab gameId={gameId} gameTitle={gameTitle} trophy={trophy} />
        )}

        <div className="p-4 px-6 text-[0.8125rem] text-muted flex justify-between items-end">
          <p className="max-w-[80%]">{trophy.detail || "Trofeo sin descripción adicional."}</p>
          {trophy.earnedAt && (
            <p className="flex items-center gap-1.5 font-semibold text-accent-text bg-accent-text/10 px-2 py-1 rounded-md text-[0.6875rem] uppercase tracking-wider">
              <TrophyIcon grade={trophy.grade ?? "bronze"} size={14} />
              Conseguido el {new Date(trophy.earnedAt).toLocaleDateString()}
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
            <label className="text-xs font-semibold text-muted">Meta:</label>
            <input
              type="number"
              min={1}
              autoFocus
              value={metaEnCurso}
              onChange={(e) => setMetaEnCurso(e.target.value)}
              placeholder="ej. 50"
              className="w-20 rounded-lg px-2.5 py-1.5 text-sm font-semibold outline-none"
              style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
            />
            <button type="submit" disabled={isPending} className="rounded-lg px-3 py-1.5 text-xs font-bold text-background disabled:opacity-50" style={{ background: "var(--accent-grad)" }}>
              Crear contador
            </button>
            <button type="button" onClick={() => setConfigurando(false)} className="text-xs font-semibold text-muted hover:text-foreground">
              Cancelar
            </button>
          </form>
        ) : (
          <button onClick={() => setConfigurando(true)} className="text-xs font-semibold text-accent hover:underline">
            + Llevar la cuenta tú mismo (contador manual)
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
        Quitar
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
function GuiaEscritaTab({ gameId, gameTitle, trophy }: { gameId?: string; gameTitle: string; trophy: Trophy }) {
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
      setEditando(false);
    }
  }, [state.success, gameId, trophy.id]);

  const mia = datos?.currentUserId ? datos.guides.find((g) => g.authorId === datos.currentUserId) : undefined;
  const deOtros = datos?.guides.filter((g) => g.id !== mia?.id) ?? [];

  return (
    <div className="max-h-[60vh] overflow-y-auto p-6">
      {!gameId ? (
        <p className="mb-4 text-sm text-muted">Esta ficha no está vinculada a un juego, así que aquí no se puede guardar nada.</p>
      ) : !datos ? (
        <p className="text-sm text-muted">Cargando...</p>
      ) : (
        <>
          {datos.guides.length === 0 && (
            <p className="mb-4 text-sm text-muted">Nadie de aquí ha escrito todavía una guía de este trofeo. Sé el primero.</p>
          )}

          {mia && !editando && (
            <div className="mb-3 rounded-xl p-4" style={{ border: "1px solid rgb(var(--accent-rgb) / 0.35)", background: "rgb(var(--accent-rgb) / 0.08)" }}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-accent-text">Tu guía</span>
                <div className="flex gap-3">
                  <button onClick={() => setEditando(true)} className="text-xs font-semibold text-muted hover:text-foreground">
                    Editar
                  </button>
                  <form action={deleteTrophyGuideAction}>
                    <input type="hidden" name="gameId" value={gameId} />
                    <input type="hidden" name="trophyId" value={trophy.id} />
                    <button className="text-xs font-semibold text-muted hover:text-danger">Borrar</button>
                  </form>
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
                placeholder="Explica cómo se consigue este trofeo — qué falla, qué hay que evitar, un truco que no sea obvio..."
                className="w-full resize-none rounded-xl p-3.5 text-sm outline-none placeholder:text-muted"
                style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
              />
              <div className="mt-2 flex items-center gap-3">
                <Submit>{mia ? "Guardar cambios" : "Publicar guía"}</Submit>
                {editando && (
                  <button type="button" onClick={() => setEditando(false)} className="text-xs font-semibold text-muted hover:text-foreground">
                    Cancelar
                  </button>
                )}
                {state.error && <p className="text-xs text-danger">{state.error}</p>}
              </div>
            </form>
          )}

          {!datos.currentUserId && (
            <p className="mb-4 text-xs text-muted">
              <Link href="/entrar" className="font-semibold text-accent hover:underline">Entra</Link> para escribir tu propia guía.
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
                      <span className="text-[0.8125rem] font-semibold">{g.authorName ?? "Alguien"}</span>
                    )}
                    <span className="text-xs text-muted">{relativeDate(g.updatedAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">{g.body}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-6 border-t border-border pt-4">
        <p className="mb-2.5 text-xs text-muted">¿Prefieres buscarla fuera? Se abre en una pestaña nueva.</p>
        <div className="flex flex-wrap gap-2">
          {FUENTES_GUIA.map((f) => (
            <a
              key={f.label}
              href={urlBusquedaGuia(gameTitle, trophy.name, f.sitio)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-foreground"
              style={{ border: "1px solid var(--border)" }}
            >
              Buscar en {f.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
