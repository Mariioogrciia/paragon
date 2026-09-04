"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  createCollectionWithGamesAction,
  renameCollectionAction,
  deleteCollectionAction,
  addGamesToCollectionAction,
  removeGameFromCollectionAction,
  moveGameToCollectionAction,
  moveGameToNewCollectionAction,
  type ActionState,
} from "@/app/actions";
import type { Collection } from "@/lib/collections";
import type { Game } from "@/lib/types";

const EMPTY: ActionState = {};
const CARD = { border: "1px solid var(--border)", background: "var(--surface)" };
const FIELD = { border: "1px solid var(--border)", background: "var(--background)" };

function Submit({ children, small = false }: { children: React.ReactNode; small?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className={`shrink-0 rounded-lg font-bold text-background transition-opacity disabled:opacity-50 ${small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}`}
      style={{ background: "var(--accent-grad)" }}
    >
      {pending ? "…" : children}
    </button>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className="mt-2 text-xs text-danger">{state.error}</p>;
  if (state.success) return <p className="mt-2 text-xs text-good">{state.success}</p>;
  return null;
}

/** Checklist con filtro por texto — se repite igual al crear una carpeta y al añadir juegos a una ya existente. */
function GamePicker({ library, name, yaDentro = [] }: { library: Game[]; name: string; yaDentro?: string[] }) {
  const [filtro, setFiltro] = useState("");
  const disponibles = library.filter((g) => !g.isWishlist && !yaDentro.includes(g.id));
  const filtrados = filtro
    ? disponibles.filter((g) => g.title.toLowerCase().includes(filtro.toLowerCase()))
    : disponibles;

  return (
    <div className="mt-3">
      <input
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        placeholder="Buscar en tu biblioteca..."
        className="mb-2 w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:text-muted"
        style={FIELD}
      />
      <div className="max-h-56 overflow-y-auto rounded-lg" style={FIELD}>
        {filtrados.length === 0 ? (
          <p className="p-3 text-xs text-muted">Nada que coincida.</p>
        ) : (
          filtrados.map((g) => (
            <label key={g.id} className="flex cursor-pointer items-center gap-2.5 border-b border-border px-3 py-2 last:border-0 hover:bg-surface-2">
              <input type="checkbox" name={name} value={g.id} className="shrink-0" />
              <span className="h-8 w-6 shrink-0 overflow-hidden rounded bg-surface-2">
                {g.iconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.iconUrl} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{g.title}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

function NuevaCarpetaForm({ library, onClose }: { library: Game[]; onClose: () => void }) {
  const [state, action] = useActionState(createCollectionWithGamesAction, EMPTY);

  return (
    <form action={action} className="rounded-xl p-4" style={CARD}>
      <div className="flex gap-2.5">
        <input
          name="name"
          autoFocus
          placeholder="Nombre de la carpeta"
          maxLength={40}
          className="min-w-0 flex-1 rounded-lg px-3.5 py-2.5 text-sm outline-none placeholder:text-muted"
          style={FIELD}
        />
        <Submit>Crear</Submit>
        <button type="button" onClick={onClose} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-foreground">
          Cancelar
        </button>
      </div>
      <p className="mt-3 text-xs font-semibold text-muted">Añade juegos ahora mismo (opcional, se puede hacer luego):</p>
      <GamePicker library={library} name="gameIds" />
      <Feedback state={state} />
    </form>
  );
}

/** El desplegable de "mover a otra carpeta" — llama a la acción directamente (no es un <form>, `Dropdown` no dispara eventos de formulario) y ofrece crear una carpeta nueva en el mismo sitio. */
function MoverA({ juego, carpetaActual, otrasCarpetas }: { juego: Game; carpetaActual: string; otrasCarpetas: Collection[] }) {
  const [abierto, setAbierto] = useState(false);
  const [creandoNueva, setCreandoNueva] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [stateNueva, actionNueva] = useActionState(moveGameToNewCollectionAction, EMPTY);

  if (creandoNueva) {
    return (
      <form action={actionNueva} className="mt-2 flex gap-1.5">
        <input type="hidden" name="fromCollectionId" value={carpetaActual} />
        <input type="hidden" name="gameId" value={juego.id} />
        <input
          name="name"
          autoFocus
          placeholder="Nombre de la carpeta nueva"
          maxLength={40}
          className="min-w-0 flex-1 rounded-lg px-2.5 py-1.5 text-xs outline-none placeholder:text-muted"
          style={FIELD}
        />
        <Submit small>Mover</Submit>
        <button type="button" onClick={() => setCreandoNueva(false)} className="text-xs font-semibold text-muted hover:text-foreground">
          Cancelar
        </button>
        {stateNueva.error && <p className="text-xs text-danger">{stateNueva.error}</p>}
      </form>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        disabled={isPending}
        className="text-xs font-semibold text-muted hover:text-foreground disabled:opacity-50"
      >
        Mover a…
      </button>
      {abierto && (
        <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg shadow-lg" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
          {otrasCarpetas.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setAbierto(false);
                startTransition(async () => {
                  const fd = new FormData();
                  fd.set("fromCollectionId", carpetaActual);
                  fd.set("toCollectionId", c.id);
                  fd.set("gameId", juego.id);
                  await moveGameToCollectionAction(fd);
                });
              }}
              className="block w-full truncate px-3 py-2 text-left text-xs font-semibold hover:bg-surface-2"
            >
              {c.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setAbierto(false);
              setCreandoNueva(true);
            }}
            className="block w-full border-t border-border px-3 py-2 text-left text-xs font-bold text-accent hover:bg-surface-2"
          >
            + Nueva carpeta
          </button>
        </div>
      )}
    </div>
  );
}

function CarpetaCard({ collection, library, otrasCarpetas }: { collection: Collection; library: Game[]; otrasCarpetas: Collection[] }) {
  const [abierta, setAbierta] = useState(false);
  const [editando, setEditando] = useState(false);
  const [añadiendo, setAñadiendo] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [stateRename, actionRename] = useActionState(renameCollectionAction, EMPTY);

  const porId = useMemo(() => new Map(library.map((g) => [g.id, g])), [library]);
  const juegos = collection.gameIds.map((id) => porId.get(id)).filter((g): g is Game => g !== undefined);

  return (
    <div className="overflow-hidden rounded-xl" style={CARD}>
      <div className="flex items-center gap-3 p-4">
        <button type="button" onClick={() => setAbierta((v) => !v)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`shrink-0 text-muted transition-transform ${abierta ? "rotate-90" : ""}`}>
            <path d="m9 6 6 6-6 6" />
          </svg>
          <span className="min-w-0 truncate text-[15px] font-bold">{collection.name}</span>
          <span className="shrink-0 text-xs text-muted">{collection.gameIds.length}</span>
        </button>

        {!editando && (
          <div className="flex shrink-0 items-center gap-3">
            <button type="button" onClick={() => setEditando(true)} className="text-xs font-semibold text-muted hover:text-foreground">
              Renombrar
            </button>
            {confirmarBorrado ? (
              <form action={deleteCollectionAction} className="flex items-center gap-1.5">
                <input type="hidden" name="collectionId" value={collection.id} />
                <span className="text-xs text-muted">¿Seguro?</span>
                <button className="text-xs font-bold text-danger">Sí</button>
                <button type="button" onClick={() => setConfirmarBorrado(false)} className="text-xs font-semibold text-muted hover:text-foreground">
                  No
                </button>
              </form>
            ) : (
              <button type="button" onClick={() => setConfirmarBorrado(true)} className="text-xs font-semibold text-muted hover:text-danger">
                Eliminar
              </button>
            )}
          </div>
        )}
      </div>

      {editando && (
        <form
          action={actionRename}
          className="flex gap-2 px-4 pb-4"
          onSubmit={() => setEditando(false)}
        >
          <input type="hidden" name="collectionId" value={collection.id} />
          <input
            name="name"
            autoFocus
            defaultValue={collection.name}
            maxLength={40}
            className="min-w-0 flex-1 rounded-lg px-3 py-2 text-sm outline-none"
            style={FIELD}
          />
          <Submit small>Guardar</Submit>
          <button type="button" onClick={() => setEditando(false)} className="text-xs font-semibold text-muted hover:text-foreground">
            Cancelar
          </button>
          <Feedback state={stateRename} />
        </form>
      )}

      {abierta && (
        <div className="border-t border-border p-4">
          {juegos.length === 0 ? (
            <p className="text-sm text-muted">Ningún juego todavía.</p>
          ) : (
            <div className="space-y-1.5">
              {juegos.map((g) => (
                <div key={g.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                  <span className="h-9 w-7 shrink-0 overflow-hidden rounded bg-surface-2">
                    {g.iconUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.iconUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <Link href={`/juego/${g.igdbId ?? g.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">
                    {g.title}
                  </Link>
                  {otrasCarpetas.length > 0 && <MoverA juego={g} carpetaActual={collection.id} otrasCarpetas={otrasCarpetas} />}
                  <form action={removeGameFromCollectionAction}>
                    <input type="hidden" name="collectionId" value={collection.id} />
                    <input type="hidden" name="gameId" value={g.id} />
                    <button className="text-xs font-semibold text-muted hover:text-danger">Quitar</button>
                  </form>
                </div>
              ))}
            </div>
          )}

          {añadiendo ? (
            <form action={addGamesToCollectionAction} className="mt-4">
              <input type="hidden" name="collectionId" value={collection.id} />
              <GamePicker library={library} name="gameIds" yaDentro={collection.gameIds} />
              <div className="mt-2 flex gap-2">
                <Submit small>Añadir</Submit>
                <button type="button" onClick={() => setAñadiendo(false)} className="text-xs font-semibold text-muted hover:text-foreground">
                  Cerrar
                </button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => setAñadiendo(true)} className="mt-4 text-xs font-bold text-accent hover:underline">
              + Añadir juegos
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function CarpetasManager({ collections, library }: { collections: Collection[]; library: Game[] }) {
  const [creando, setCreando] = useState(false);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold uppercase tracking-wide">Tus carpetas</h2>
        {!creando && (
          <button
            type="button"
            onClick={() => setCreando(true)}
            className="rounded-lg px-4 py-2 text-sm font-bold text-background"
            style={{ background: "var(--accent-grad)" }}
          >
            + Nueva carpeta
          </button>
        )}
      </div>

      {creando && (
        <div className="mb-4">
          <NuevaCarpetaForm library={library} onClose={() => setCreando(false)} />
        </div>
      )}

      {collections.length === 0 && !creando ? (
        <p className="rounded-xl p-5 text-sm text-muted" style={CARD}>
          Todavía no tienes ninguna carpeta. Crea la primera para empezar a organizar tu biblioteca.
        </p>
      ) : (
        <div className="space-y-3">
          {collections.map((c) => (
            <CarpetaCard key={c.id} collection={c} library={library} otrasCarpetas={collections.filter((o) => o.id !== c.id)} />
          ))}
        </div>
      )}
    </section>
  );
}
