"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TiltCard } from "@/components/TiltCard";
import { TrophyIcon } from "@/components/TrophyIcon";

interface SampleGame {
  title: string;
  cover: string;
}

/**
 * "Crea tu primera tarjeta" — bloque interactivo de la landing, del
 * brainstorm de mejoras. Deja tocar el resultado en vez de solo describirlo:
 * el visitante escribe su nombre, elige un juego de muestra, y ve al momento
 * la tarjeta de platino que tendría en su perfil real. El CTA de abajo lleva
 * a /entrar — el propio div de la tarjeta también, vía TiltCard.
 *
 * A propósito NO llama a ninguna API ni genera nada de verdad (no hay sesión
 * todavía) — todo el cálculo es local, con los juegos de muestra que ya usa
 * el marquee de la landing.
 */
export function CardBuilder({ games }: { games: SampleGame[] }) {
  const t = useTranslations("Shell.Home");
  const [nombre, setNombre] = useState("");
  const [juego, setJuego] = useState(games[0]);

  const nombreMostrado = nombre.trim() || t("builderNombrePorDefecto");

  return (
    <section className="pt-[72px]">
      <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="font-heading text-[2.125rem] font-bold uppercase leading-tight tracking-[-0.01em]">
            {t("builderTitulo")}
          </h2>
          <p className="mt-2 max-w-[480px] text-base text-muted">{t("builderDescripcion")}</p>

          <div className="mt-7 flex flex-col gap-4 max-w-[380px]">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted">
                {t("builderNombreLabel")}
              </span>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value.slice(0, 20))}
                placeholder={t("builderNombrePorDefecto")}
                className="rounded-xl px-4 py-3 text-[0.9375rem] font-semibold outline-none transition-colors focus:border-[rgb(var(--accent-rgb))]"
                style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)" }}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted">
                {t("builderJuegoLabel")}
              </span>
              <select
                value={juego.title}
                onChange={(e) => setJuego(games.find((g) => g.title === e.target.value) ?? games[0])}
                className="rounded-xl px-4 py-3 text-[0.9375rem] font-semibold outline-none transition-colors focus:border-[rgb(var(--accent-rgb))]"
                style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)" }}
              >
                {games.map((g) => (
                  <option key={g.title} value={g.title}>
                    {g.title}
                  </option>
                ))}
              </select>
            </label>

            <a
              href="/entrar"
              className="mt-2 inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-[0.9375rem] font-bold text-background transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgb(var(--accent-rgb) / 0.5)]"
              style={{ background: "var(--accent-grad)" }}
            >
              {t("builderCTA")}
            </a>
          </div>
        </div>

        <TiltCard
          href="/entrar"
          className="relative mx-auto w-full max-w-[360px] cursor-pointer overflow-hidden rounded-[22px]"
          style={{ border: "1px solid #232c3d", background: "linear-gradient(#141b28, #0f141d)", boxShadow: "0 30px 80px rgba(0, 0, 0, 0.5)" }}
        >
          <div
            className="relative h-[200px] bg-cover bg-center"
            style={{ backgroundImage: `url(${juego.cover})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f141d] via-[#0f141d]/20 to-transparent" />
          </div>
          <div className="relative -mt-10 p-6">
            <p className="truncate font-heading text-xl font-bold">{nombreMostrado}</p>
            <p className="mt-0.5 truncate text-sm text-muted">{juego.title}</p>

            <div className="mt-5 flex items-center gap-2.5">
              <TrophyIcon grade="platinum" size={26} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-platinum">{t("builderPlatinoLabel")}</p>
                <p className="text-[0.6875rem] text-muted">{t("builderPlatinoFecha")}</p>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full w-full rounded-full" style={{ background: "var(--accent-grad-h)" }} />
            </div>
            <p className="mt-2 text-right text-xs font-bold" style={{ color: "var(--accent-text)" }}>
              100%
            </p>
          </div>
        </TiltCard>
      </div>
    </section>
  );
}
