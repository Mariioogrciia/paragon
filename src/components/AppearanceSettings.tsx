"use client";

import { useTranslations } from "next-intl";
import { Check, Star } from "lucide-react";
import { ACENTOS, ESTILOS, MODOS, TAMANOS_TEXTO, TEMAS, nivelDeEstilo, useApariencia } from "@/lib/apariencia";
import { TrophyIcon } from "@/components/TrophyIcon";

export interface JuegoPaleta {
  id: string;
  titulo: string;
  portada: string;
  color: string;
  favorito: boolean;
}

const ELEGIDO = { background: "var(--accent)", color: "#061021" };
const SIN_ELEGIR = { background: "var(--surface-2)", color: "var(--muted)" };

/**
 * Panel de apariencia de verdad, para /ajustes/apariencia. Antes esto vivía
 * apretado en el desplegable de la navbar (ThemeCustomizer.tsx); ahora el
 * icono de la navbar solo enlaza aquí.
 *
 * Panel de control refinado (1 oct 2026): grupos separados por una línea en
 * vez de tarjetas, y una vista previa fija a la derecha que se repinta sola
 * (lee los mismos tokens que el resto de la app, así que cualquier cambio se
 * ve al momento sin pasarle nada). Nuevo grupo "Desde tu juego": la paleta
 * sale de la carátula (lib/paletaJuego.ts).
 */
export function AppearanceSettings({ nivel, juegosPaleta = [] }: { nivel: number; juegosPaleta?: JuegoPaleta[] }) {
  const t = useTranslations("Onboarding");
  const {
    montado,
    theme,
    setTheme,
    acento,
    acentoLibre,
    acentoJuego,
    estilo,
    tamanoTexto,
    elegirAcento,
    elegirAcentoLibre,
    elegirAcentoJuego,
    elegirEstilo,
    elegirTamanoTexto,
    elegirTema,
  } = useApariencia({ sincronizar: true });

  if (!montado) return null;

  const muestra = juegosPaleta.find((j) => j.id === acentoJuego) ?? juegosPaleta[0];

  return (
    <div className="ajustes-con-vista">
      <div className="flex min-w-0 flex-col gap-8">
        <div>
          <h1 className="font-heading text-2xl font-bold">{t("appearanceSettings.title")}</h1>
          <p className="mt-1.5 text-sm text-muted">{t("appearanceSettings.description")}</p>
        </div>

        <section className="ajustes-grupo">
          <h2>{t("appearanceSettings.modeTitle")}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MODOS.map((m) => (
              <button
                key={m.value}
                onClick={() => setTheme(m.value)}
                aria-pressed={theme === m.value}
                className="rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:text-foreground"
                style={theme === m.value ? ELEGIDO : SIN_ELEGIR}
              >
                {m.label}
              </button>
            ))}
          </div>
        </section>

        <section className="ajustes-grupo">
          <h2>{t("appearanceSettings.textSizeTitle")}</h2>
          <p className="ajustes-ayuda">{t("appearanceSettings.textSizeDescription")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TAMANOS_TEXTO.map((tam) => (
              <button
                key={tam.value || "normal"}
                onClick={() => elegirTamanoTexto(tam.value)}
                aria-pressed={tamanoTexto === tam.value}
                className="rounded-xl px-4 py-3 font-semibold transition-colors hover:text-foreground"
                // Cada boton se enseña al tamaño que aplica, para poder
                // elegirlo viendolo en vez de adivinando por el nombre.
                style={{
                  fontSize: `calc(0.875rem * ${parseFloat(tam.escala) / 100})`,
                  ...(tamanoTexto === tam.value ? ELEGIDO : SIN_ELEGIR),
                }}
              >
                {tam.label}
              </button>
            ))}
          </div>
        </section>

        <section className="ajustes-grupo">
          <h2>{t("appearanceSettings.accentTitle")}</h2>
          <div className="flex flex-wrap items-center gap-3">
            {ACENTOS.map((a) => {
              const activo = acento === a.value && !acentoLibre && !acentoJuego;
              return (
                <button
                  key={a.label}
                  onClick={() => elegirAcento(a.value)}
                  title={a.label}
                  aria-label={a.label}
                  aria-pressed={activo}
                  className="h-10 w-10 rounded-full transition-transform hover:scale-110"
                  style={{ background: a.color, outline: activo ? "2px solid var(--foreground)" : "none", outlineOffset: 2 }}
                />
              );
            })}
            <label
              title={t("appearanceSettings.freeColor")}
              aria-label={t("appearanceSettings.freeColor")}
              className="relative h-10 w-10 shrink-0 cursor-pointer rounded-full transition-transform hover:scale-110"
              style={{
                background: acentoLibre || "conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red)",
                outline: acentoLibre ? "2px solid var(--foreground)" : "none",
                outlineOffset: 2,
              }}
            >
              <input
                type="color"
                value={acentoLibre || "#7cc4e4"}
                onChange={(e) => elegirAcentoLibre(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <span className="text-xs text-muted">{t("appearanceSettings.freeColor")}</span>
          </div>
        </section>

        <section className="ajustes-grupo">
          <h2>{t("appearanceSettings.gameTitle")}</h2>
          <p className="ajustes-ayuda">{t("appearanceSettings.gameDescription")}</p>
          {juegosPaleta.length === 0 ? (
            <p className="text-sm text-muted">{t("appearanceSettings.gameEmpty")}</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
              {juegosPaleta.map((j) => {
                const activo = acentoJuego === j.id;
                return (
                  <li key={j.id}>
                    <button
                      type="button"
                      onClick={() => elegirAcentoJuego({ id: j.id, color: j.color })}
                      aria-pressed={activo}
                      title={j.titulo}
                      className="paleta-juego group block w-full rounded-xl text-left"
                      data-activo={activo || undefined}
                    >
                      <span className="relative block aspect-[3/4] overflow-hidden rounded-[10px] bg-[var(--surface-2)]">
                        <img src={j.portada} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        {j.favorito && (
                          <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60" title={t("appearanceSettings.gameFavorite")}>
                            <Star size={11} className="fill-[#e2b53e] text-[#e2b53e]" aria-label={t("appearanceSettings.gameFavorite")} />
                          </span>
                        )}
                        {activo && (
                          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "var(--accent)" }}>
                            <Check size={13} strokeWidth={3} className="text-[#061021]" aria-hidden="true" />
                          </span>
                        )}
                      </span>
                      <span className="mt-1.5 flex items-center gap-1.5">
                        <span className="h-3 w-3 shrink-0 rounded-full border border-[var(--border)]" style={{ background: j.color }} aria-hidden="true" />
                        <span className="truncate text-[0.6875rem] font-semibold text-muted group-hover:text-foreground">{j.titulo}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="ajustes-grupo">
          <h2>{t("appearanceSettings.styleTitle")}</h2>
          <p className="ajustes-ayuda">{t("appearanceSettings.styleDescription")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ESTILOS.map((e) => {
              const requisito = nivelDeEstilo(e.value);
              const bloqueado = requisito !== null && nivel < requisito;
              return (
                <button
                  key={e.value || "clasico"}
                  onClick={() => elegirEstilo(e.value)}
                  disabled={bloqueado}
                  aria-pressed={estilo === e.value}
                  title={e.desc}
                  className="rounded-xl px-3 py-3 text-left text-sm font-semibold transition-colors enabled:hover:text-foreground enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                  style={estilo === e.value ? ELEGIDO : SIN_ELEGIR}
                >
                  {bloqueado ? `🔒 ${e.label}` : e.label}
                  <span className="mt-0.5 block text-[0.6875rem] font-normal opacity-80">
                    {bloqueado ? t("appearanceSettings.styleLocked", { nivel: requisito }) : e.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="ajustes-grupo">
          <h2>{t("appearanceSettings.themesTitle")}</h2>
          <p className="ajustes-ayuda">{t("appearanceSettings.themesDescription")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TEMAS.map((tema) => (
              <button
                key={tema.label}
                onClick={() => elegirTema(tema)}
                className="rounded-xl px-3 py-3 text-sm font-semibold transition-colors hover:text-foreground"
                style={SIN_ELEGIR}
              >
                {tema.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <aside className="ajustes-vista" aria-label={t("appearanceSettings.previewTitle")}>
        <p className="ajustes-vista-rotulo">{t("appearanceSettings.previewTitle")}</p>
        <div className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--background)]" aria-hidden="true">
          <div className="flex items-center gap-1.5 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
            <span className="h-1.5 w-12 rounded-full bg-[var(--surface-2)]" />
            <span className="ml-auto h-1.5 w-6 rounded-full bg-[var(--surface-2)]" />
          </div>
          <div className="p-3">
            <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="flex gap-3">
                <span
                  className="h-16 w-12 shrink-0 rounded-md bg-[var(--surface-2)] bg-cover bg-center"
                  style={muestra ? { backgroundImage: `url(${muestra.portada})` } : undefined}
                />
                <div className="min-w-0">
                  <p className="text-[0.625rem] font-bold text-[var(--accent-text)]">{t("appearanceSettings.previewNext")}</p>
                  <p className="font-heading mt-0.5 truncate text-sm font-bold">{muestra?.titulo ?? "Elden Ring"}</p>
                  <p className="mt-1 flex items-center gap-1 text-[0.6875rem] text-muted">
                    <TrophyIcon grade="platinum" size={12} />
                    {t("appearanceSettings.previewLeft", { n: 7 })}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div className="h-full w-[72%] rounded-full" style={{ background: "var(--accent-grad-h)" }} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[0.6875rem] font-bold tabular-nums text-[var(--accent-text)]">72%</span>
                <span className="rounded-lg px-2.5 py-1 text-[0.6875rem] font-bold text-[var(--background)]" style={{ background: "var(--accent-grad)" }}>
                  {t("appearanceSettings.previewButton")}
                </span>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {[38, 12, 4].map((n, i) => (
                <div key={n} className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-2 py-2">
                  <p className="font-heading text-base font-bold leading-none tabular-nums" style={i === 0 ? { color: "var(--accent-text)" } : undefined}>
                    {n}
                  </p>
                  <span className="mt-1.5 block h-1 w-8 rounded-full bg-[var(--surface-2)]" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-2.5 text-xs text-muted">{t("appearanceSettings.previewHint")}</p>
      </aside>
    </div>
  );
}
