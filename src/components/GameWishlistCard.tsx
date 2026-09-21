"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { addToWishlistAction } from "@/app/actions";

/**
 * "Añadir a deseados" en la propia ficha de juego — antes solo se podía
 * desde las tarjetas de Descubrir/Próximos lanzamientos, nunca desde aquí.
 * Solo se pinta cuando de verdad hace falta (lib/juego/[id]/page.tsx):
 * sesión iniciada, el juego no está ya en tu biblioteca/deseados, y tiene
 * `igdbId` (la acción lo necesita, los juegos manuales legacy no sirven).
 */
export function GameWishlistCard({
  igdbId,
  title,
  coverUrl,
  genres,
  developer,
  publisher,
}: {
  igdbId: number;
  title: string;
  coverUrl?: string;
  genres: string[];
  developer?: string;
  publisher?: string;
}) {
  const t = useTranslations("Biblioteca");
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-5"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <div>
        <h2 className="font-heading text-lg font-bold">{t("GameWishlistCard.title")}</h2>
        <p className="mt-0.5 text-xs text-muted">{t("GameWishlistCard.subtitle")}</p>
      </div>
      <button
        disabled={isPending || added}
        onClick={() => {
          startTransition(async () => {
            await addToWishlistAction({
              igdbId,
              title,
              coverUrl: coverUrl ?? "",
              genres,
              developer,
              publisher,
              deviceLabel: "Deseados",
              completed: false,
            });
            setAdded(true);
          });
        }}
        className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5 disabled:pointer-events-none ${
          added ? "text-good" : "text-background hover:shadow-[0_0_16px_rgb(var(--accent-rgb)/0.4)]"
        }`}
        style={added ? { background: "rgba(78, 201, 138, 0.14)", border: "1px solid rgba(78, 201, 138, 0.3)" } : { background: "var(--accent-grad)" }}
      >
        {isPending ? t("GameWishlistCard.adding") : added ? t("GameWishlistCard.added") : t("GameWishlistCard.add")}
      </button>
    </div>
  );
}
