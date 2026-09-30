"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { toPng } from "html-to-image";
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const nombreMostrado = nombre.trim() || t("builderNombrePorDefecto");

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        style: { transform: "none" }, // Aseguramos que no haya tilt activo
      });
      const link = document.createElement("a");
      link.download = `tarjeta-${nombreMostrado.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Error exporting image:", error);
    } finally {
      setIsExporting(false);
    }
  };

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

            <div className="mt-2 flex gap-3">
              <a
                href="/entrar"
                className="flex-1 inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-[0.9375rem] font-bold text-background transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgb(var(--accent-rgb) / 0.5)]"
                style={{ background: "var(--accent-grad)" }}
              >
                {t("builderCTA")}
              </a>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                className="inline-flex items-center justify-center rounded-xl px-4 py-3.5 text-[0.9375rem] font-bold transition-all duration-300 hover:bg-white/5 disabled:opacity-50"
                style={{ border: "1px solid var(--border)" }}
                title="Descargar imagen (PNG)"
              >
                {isExporting ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-foreground" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" x2="12" y1="15" y2="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[360px]" ref={cardRef}>
          <TiltCard
            href="/entrar"
            className="block rounded-[22px] border"
            innerClassName="relative overflow-hidden rounded-[22px]"
            style={{
              borderColor: "rgb(var(--accent-rgb) / 0.4)",
              background: "var(--surface)",
              boxShadow: "0 28px 60px -26px rgb(var(--accent-rgb) / 0.55)",
            }}
          >
            <div className="relative aspect-[16/10] bg-cover bg-center" style={{ backgroundImage: `url(${juego.cover})` }}>
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, var(--surface) 2%, transparent 55%)" }} />
              <span
                className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide"
                style={{ background: "rgb(0 0 0 / 0.55)", color: "var(--platinum)", backdropFilter: "blur(6px)" }}
              >
                <TrophyIcon grade="platinum" size={14} />
                {t("builderPlatinoLabel")}
              </span>
            </div>
            <div className="relative px-6 pb-6 pt-1">
              <p className="truncate font-heading text-2xl font-bold leading-tight">{nombreMostrado}</p>
              <p className="mt-1 truncate text-sm text-muted">{juego.title}</p>

              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[0.6875rem] font-semibold text-muted">{t("builderPlatinoFecha")}</p>
                  <p className="font-heading text-lg font-bold text-platinum">100%</p>
                </div>
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full"
                  style={{ background: "radial-gradient(circle at 35% 30%, #eaf6fc, #9fd4ec 45%, #4d8fae)", boxShadow: "0 6px 18px -6px rgb(159 212 236 / 0.8)" }}
                >
                  <TrophyIcon grade="platinum" size={22} />
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div className="h-full w-full rounded-full" style={{ background: "var(--accent-grad-h)" }} />
              </div>
            </div>
          </TiltCard>
        </div>
      </div>
    </section>
  );
}
