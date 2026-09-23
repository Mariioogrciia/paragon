"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/Avatar";
import { relativeDate } from "@/lib/design";
import { getLigaMensualDesgloseAction } from "@/app/actions";
import type { LigaTrofeoDesglose } from "@/lib/ligas";

interface LigaUser {
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  points: number;
}

const COLOR_GRADO: Record<string, string> = {
  platinum: "var(--platinum)",
  gold: "var(--gold)",
  silver: "var(--silver)",
  bronze: "var(--bronze)",
};

/**
 * Fila de la clasificación de la Liga Mensual — la foto lleva al perfil, el
 * resto de la fila abre el desglose de puntos (qué trofeos concretos
 * suman esa cifra). Antes solo el nombre enlazaba al perfil y no había
 * forma de ver de dónde salían los puntos.
 */
export function LigaMensualFila({ user, index }: { user: LigaUser; index: number }) {
  const t = useTranslations("Perfil.LigasPage");
  const [abierto, setAbierto] = useState(false);
  const [desglose, setDesglose] = useState<LigaTrofeoDesglose[] | null>(null);
  const [cargando, setCargando] = useState(false);

  async function abrir() {
    setAbierto(true);
    if (desglose === null) {
      setCargando(true);
      try {
        const data = await getLigaMensualDesgloseAction(user.userId);
        setDesglose(data);
      } finally {
        setCargando(false);
      }
    }
  }

  return (
    <>
      <tr
        onClick={abrir}
        className={`cursor-pointer border-b border-border transition-colors hover:bg-black/10 ${index < 3 ? "bg-[rgb(var(--accent-rgb)/0.03)]" : ""}`}
      >
        <td className="p-4 text-center">
          <span
            className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
              index === 0 ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50" :
              index === 1 ? "bg-gray-400/20 text-gray-400 border border-gray-400/50" :
              index === 2 ? "bg-amber-700/20 text-amber-600 border border-amber-700/50" :
              "text-muted bg-surface-2"
            }`}
          >
            {index + 1}
          </span>
        </td>
        <td className="p-4">
          <div className="flex items-center gap-3">
            {user.handle ? (
              <Link
                href={`/u/${user.handle}`}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 transition-opacity hover:opacity-80"
              >
                <Avatar src={user.image} name={user.name ?? user.handle ?? "?"} size={36} />
              </Link>
            ) : (
              <Avatar src={user.image} name={user.name ?? "?"} size={36} />
            )}
            <span className="font-bold">{user.name ?? (user.handle ? `@${user.handle}` : t("alguien"))}</span>
          </div>
        </td>
        <td className="p-4 text-right">
          <span className="font-heading text-xl font-bold text-[rgb(var(--accent-rgb))]">
            {user.points.toLocaleString()}
          </span>
        </td>
      </tr>

      {abierto && (
        <tr>
          <td colSpan={3} className="p-0">
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setAbierto(false)}>
              <div
                className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar src={user.image} name={user.name ?? user.handle ?? "?"} size={40} />
                    <div>
                      <p className="font-bold">{user.name ?? `@${user.handle}`}</p>
                      <p className="text-xs text-muted">{t("puntosEsteMes", { puntos: user.points.toLocaleString() })}</p>
                    </div>
                  </div>
                  <button onClick={() => setAbierto(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-white/10 hover:text-foreground">
                    ✕
                  </button>
                </div>

                {cargando ? (
                  <p className="py-8 text-center text-sm text-muted">{t("cargandoDesglose")}</p>
                ) : !desglose || desglose.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted">{t("sinTrofeosEsteMes")}</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {desglose.map((tr, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-3">
                        {tr.gameIconUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={tr.gameIconUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{tr.trophyName}</p>
                          <p className="truncate text-xs text-muted">{tr.gameTitle} · {tr.earnedAt ? relativeDate(tr.earnedAt) : "—"}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {tr.grade && (
                            <span className="h-2 w-2 rounded-full" style={{ background: COLOR_GRADO[tr.grade] ?? "var(--muted)" }} />
                          )}
                          <span className="font-mono text-sm font-bold text-[rgb(var(--accent-rgb))]">+{tr.points}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
