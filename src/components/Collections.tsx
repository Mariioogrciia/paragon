import { getTranslations } from "next-intl/server";
import { deleteCollectionAction, toggleGameCollectionAction } from "@/app/actions";
import type { Collection } from "@/lib/collections";
import { NewCollectionForm } from "./forms/Forms";
import { ConfirmForm } from "./ui/ConfirmForm";

const CARD = { border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" };

const DENTRO_CLASE =
  "border-[rgb(var(--accent-rgb)/0.32)] bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent-text)] hover:bg-[rgb(var(--accent-rgb)/0.22)]";

const FUERA_CLASE =
  "border-[var(--border)] bg-[var(--surface)] text-muted hover:bg-[var(--surface-2)] hover:text-foreground";

/**
 * Carpetas de un juego: se marca y se desmarca desde la propia ficha.
 *
 * Son botones de formulario, no casillas con JavaScript: cada pulsación es una
 * acción de servidor y el estado vive en la base, así que funciona igual con la
 * pestaña recién abierta o con dos abiertas a la vez.
 */
export async function CollectionPicker({
  collections,
  gameId,
}: {
  collections: Collection[];
  gameId: string;
}) {
  const t = await getTranslations("Biblioteca.Collections");
  return (
    <section className="rounded-[18px] p-6" style={CARD}>
      <h2 className="font-heading text-[1.0625rem] font-bold tracking-[0.03em]">{t("titulo")}</h2>
      <p className="mb-4 mt-2 text-[0.8125rem] text-muted">
        {t("subtitulo")}
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
                  className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[0.8125rem] font-semibold transition-colors ${dentro ? DENTRO_CLASE : FUERA_CLASE}`}
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
export async function CollectionManager({ collections }: { collections: Collection[] }) {
  const t = await getTranslations("Biblioteca.Collections");

  if (collections.length === 0) {
    return (
      <p className="text-sm text-muted">
        {t("sinCarpetas")}
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
          <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">
            {carpeta.name}
          </span>
          <span className="shrink-0 text-xs text-muted">
            {t("juegosCantidad", { cantidad: carpeta.gameIds.length })}
          </span>
          <ConfirmForm
            action={deleteCollectionAction}
            hidden={{ collectionId: carpeta.id }}
            title={t("confirmarBorrarTitulo")}
            message={t("confirmarBorrarMensaje", { nombre: carpeta.name, cantidad: carpeta.gameIds.length })}
            confirmLabel={t("confirmarBorrarBoton")}
            triggerClassName="text-[0.8125rem] font-semibold text-muted hover:text-danger"
          >
            {t("borrar")}
          </ConfirmForm>
        </li>
      ))}
    </ul>
  );
}
