import { deleteCollectionAction, toggleGameCollectionAction } from "@/app/actions";
import type { Collection } from "@/lib/collections";
import { NewCollectionForm } from "./forms/Forms";

const CARD = { border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" };

const DENTRO = {
  background: "rgb(var(--accent-rgb) / 0.14)",
  border: "1px solid rgb(var(--accent-rgb) / 0.32)",
  color: "var(--accent-text)",
};

const FUERA = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  color: "var(--muted)",
};

/**
 * Carpetas de un juego: se marca y se desmarca desde la propia ficha.
 *
 * Son botones de formulario, no casillas con JavaScript: cada pulsación es una
 * acción de servidor y el estado vive en la base, así que funciona igual con la
 * pestaña recién abierta o con dos abiertas a la vez.
 */
export function CollectionPicker({
  collections,
  gameId,
}: {
  collections: Collection[];
  gameId: string;
}) {
  return (
    <section className="rounded-[18px] p-6" style={CARD}>
      <h2 className="font-heading text-[17px] font-bold tracking-[0.03em]">Carpetas</h2>
      <p className="mb-4 mt-2 text-[13px] text-muted">
        Tus propias agrupaciones, para lo que no se puede ordenar solo.
      </p>

      {collections.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {collections.map((carpeta) => {
            const dentro = carpeta.gameIds.includes(gameId);

            return (
              <form key={carpeta.id} action={toggleGameCollectionAction}>
                <input type="hidden" name="collectionId" value={carpeta.id} />
                <input type="hidden" name="gameId" value={gameId} />
                <button
                  className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold"
                  style={dentro ? DENTRO : FUERA}
                >
                  <span aria-hidden="true">{dentro ? "✓" : "+"}</span>
                  {carpeta.name}
                </button>
              </form>
            );
          })}
        </div>
      )}

      <NewCollectionForm gameId={gameId} />
    </section>
  );
}

/** Listado con borrado, para ajustes. */
export function CollectionManager({ collections }: { collections: Collection[] }) {
  if (collections.length === 0) {
    return (
      <p className="text-sm text-muted">
        Todavía no tienes carpetas. Se crean desde la ficha de cualquier juego.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {collections.map((carpeta) => (
        <li
          key={carpeta.id}
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ border: "1px solid var(--border)", background: "var(--background)" }}
        >
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
            {carpeta.name}
          </span>
          <span className="shrink-0 text-xs text-muted">
            {carpeta.gameIds.length} juegos
          </span>
          <form action={deleteCollectionAction}>
            <input type="hidden" name="collectionId" value={carpeta.id} />
            <button className="text-[13px] font-semibold text-muted hover:text-danger">
              Borrar
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
