"use client";

import { createContext, useContext, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { alternarFavoritoAction } from "@/app/esports/actions";
import type { EquipoFavorito } from "@/lib/esportsFavoritos";

interface FavoritosCtx {
  favoritos: EquipoFavorito[];
  esFavorito: (teamId: number) => boolean;
  alternar: (equipo: EquipoFavorito) => void;
  logueado: boolean;
}

const Ctx = createContext<FavoritosCtx | null>(null);

export function useFavoritos(): FavoritosCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFavoritos fuera de <FavoritosProvider>");
  return ctx;
}

/**
 * Estado de los equipos seguidos en toda la página: todas las estrellas
 * cambian a la vez y al momento (optimista); si el servidor falla, vuelve
 * atrás y lo dice.
 */
export function FavoritosProvider({
  iniciales,
  logueado,
  children,
}: {
  iniciales: EquipoFavorito[];
  logueado: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("Descubrir.EsportsHub");
  const router = useRouter();
  const [favoritos, setFavoritos] = useState(iniciales);
  const [aviso, setAviso] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(id);
  }, [aviso]);

  const alternar = (equipo: EquipoFavorito) => {
    if (!logueado) {
      router.push("/entrar");
      return;
    }
    const antes = favoritos;
    const seguia = antes.some((f) => f.teamId === equipo.teamId);
    setFavoritos(seguia ? antes.filter((f) => f.teamId !== equipo.teamId) : [...antes, equipo]);
    setAviso(seguia ? t("dejasDeSeguir", { equipo: equipo.nombre }) : t("ahoraSigues", { equipo: equipo.nombre }));

    startTransition(async () => {
      const r = await alternarFavoritoAction(equipo);
      if ("error" in r) {
        setFavoritos(antes);
        setAviso(r.error === "limite" ? t("limiteFavoritos") : r.error === "login" ? t("entraParaSeguir") : t("errorFavorito"));
      }
    });
  };

  return (
    <Ctx.Provider value={{ favoritos, esFavorito: (id) => favoritos.some((f) => f.teamId === id), alternar, logueado }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        {aviso && (
          <p className="esports-aviso rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold shadow-[0_14px_30px_-12px_rgb(0_0_0/0.7)]">
            {aviso}
          </p>
        )}
      </div>
    </Ctx.Provider>
  );
}

/** Estrella de seguir / dejar de seguir un equipo. */
export function EstrellaFavorito({ equipo, size = "sm" }: { equipo: EquipoFavorito; size?: "sm" | "md" }) {
  const t = useTranslations("Descubrir.EsportsHub");
  const { esFavorito, alternar } = useFavoritos();
  const activo = esFavorito(equipo.teamId);
  const lado = size === "md" ? "h-9 w-9" : "h-7 w-7";
  const icono = size === "md" ? 18 : 14;

  return (
    <button
      type="button"
      aria-pressed={activo}
      aria-label={activo ? t("dejarDeSeguir", { equipo: equipo.nombre }) : t("seguir", { equipo: equipo.nombre })}
      title={activo ? t("dejarDeSeguir", { equipo: equipo.nombre }) : t("seguir", { equipo: equipo.nombre })}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        alternar(equipo);
      }}
      className={`relative z-10 inline-flex shrink-0 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-surface-2 active:scale-95 ${lado} ${
        activo ? "text-[var(--gold)]" : "text-muted/70 hover:text-foreground"
      }`}
    >
      <svg width={icono} height={icono} viewBox="0 0 24 24" fill={activo ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
      </svg>
    </button>
  );
}
