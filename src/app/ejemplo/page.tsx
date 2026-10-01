import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Avatar } from "@/components/Avatar";
import { GameCard } from "@/components/GameCard";
import { ParagonWrap } from "@/components/ParagonWrap";
import { StatTile } from "@/components/StatTile";
import { TrophyCountRow } from "@/components/TrophyCounts";
import { DEMO_ANIO, DEMO_HANDLE, DEMO_JUEGOS, DEMO_JUGADOR } from "@/lib/demo";
import { CartaHolo } from "@/components/CartaHolo";
import { Badges } from "@/components/Badges";
import { coverGradient } from "@/lib/design";
import { gameProgress, summarise } from "@/lib/stats";
import { BackButton } from "@/components/BackButton";
import { AvatarFrame } from "@/components/AvatarFrame";
import { PlatformBanner } from "@/components/BannerPresets";

export const metadata = { title: "Perfil de ejemplo · Paragon" };

const DEMO_INSIGNIAS = ["first_blood", "cazador", "multiplataforma", "rolero", "joya_rara"].map((badgeId) => ({ badgeId, earnedAt: new Date("2026-09-01") }));

/**
 * El perfil de ejemplo de la portada.
 *
 * Se pinta con los MISMOS componentes que un perfil real (tarjetas, cifras,
 * fila de metales, Wrap) y datos inventados de `lib/demo`: si el ejemplo se
 * dibujara aparte, dejaría de parecerse a la app en cuanto alguien tocara la
 * de verdad.
 *
 * Las tarjetas llevan a registrarse en vez de a una ficha: la ficha necesita
 * un juego que exista en la base, y aquí no existe ninguno. Antes este botón
 * de la portada apuntaba a un perfil por handle que ya no está, así que daba
 * un 404 en la cara al primero que lo pulsara.
 */
export default async function EjemploPage() {
  const t = await getTranslations("Shell.Ejemplo");
  const stats = summarise(DEMO_JUEGOS);
  const favoritos = DEMO_JUEGOS.filter((g) => gameProgress(g).platinumEarned).slice(0, 4);

  return (
    <div className="-mx-4 -mt-9 sm:-mx-7">
      <div
        className="relative overflow-hidden border-b border-border"
        style={{
          background:
            "radial-gradient(700px 320px at 25% 0%, rgb(var(--accent-rgb) / 0.18), transparent 70%)",
        }}
      >
        {/* Banner y marco como un perfil real: es el escaparate de la
            portada, y sin ellos quedaba más pobre que cualquier perfil de
            verdad (auditoría, 28 sept 2026). Misma franja y mismo velo de
            contraste que /u/[handle]. */}
        <div className="absolute inset-x-0 top-0 z-0 h-[220px] overflow-hidden sm:h-[320px]">
          <PlatformBanner preset="paragon" className="absolute inset-0 h-full w-full" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.75) 100%)" }}
          />
        </div>
        <div className="relative z-10 mx-auto max-w-[1240px] px-7 pb-8 pt-8">
          <BackButton fallbackHref="/" dark />
          <div
            className="mb-6 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3"
            style={{
              border: "1px solid rgb(var(--accent-rgb) / 0.32)",
              background: "rgb(var(--accent-rgb) / 0.1)",
            }}
          >
            <span className="text-[0.8125rem] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--accent-text)" }}>
              {t("perfilDeEjemplo")}
            </span>
            <span className="text-[0.8125rem] text-muted">
              {t("datosInventados")}
            </span>
            <Link
              href="/entrar"
              className="ml-auto rounded-[10px] px-4 py-2 text-[0.8125rem] font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb) / 0.4)]"
              style={{ background: "var(--accent-grad)" }}
            >
              {t("crearElMio")}
            </Link>
          </div>

          {/* Misma cabecera que /u/[handle] desde el rediseño (1 oct 2026):
              la carta holográfica con avatar, nivel y las cuatro cifras. */}
          <div className="flex flex-col gap-6 md:flex-row md:items-end">
            <CartaHolo className="mx-auto w-full max-w-[300px] shrink-0 md:mx-0">
              <Link href="/entrar" className="carta-holo-cara block px-5 pb-5 pt-4" aria-label={t("crearElMio")}>
                <span className="flex items-center justify-between text-[0.6875rem] font-bold">
                  <span className="text-[var(--accent-text)]">PARAGON</span>
                  <span className="carreras-cifra rounded-full border border-[rgb(var(--accent-rgb)/0.4)] px-2 py-0.5 text-[var(--accent-text)]">
                    {t("nivel", { nivel: DEMO_JUGADOR.trophyLevel ?? 0 })}
                  </span>
                </span>
                <span className="mt-4 flex justify-center">
                  <AvatarFrame frame="cristal">
                    <Avatar src={null} name={DEMO_JUGADOR.name} size={104} />
                  </AvatarFrame>
                </span>
                <span className="mt-4 block text-center">
                  <span className="block truncate font-heading text-2xl font-bold uppercase leading-tight">{DEMO_JUGADOR.name}</span>
                  <span className="mt-1 block truncate text-xs text-muted">@{DEMO_HANDLE}</span>
                </span>
                <span className="mt-4 grid grid-cols-4 gap-1 border-t border-[var(--border)] pt-3 text-center">
                  {[
                    { v: stats.platinos, l: t("platinos"), c: "var(--platinum)" },
                    { v: stats.trofeos, l: t("trofeos") },
                    { v: stats.juegos, l: t("juegos") },
                    { v: `${stats.completadoMedio}%`, l: t("completadoMedio") },
                  ].map((s) => (
                    <span key={s.l} className="min-w-0">
                      <span className="carreras-cifra block text-lg leading-none" style={s.c ? { color: s.c } : undefined}>{s.v}</span>
                      <span className="mt-1 block text-[0.625rem] font-semibold leading-tight text-muted">{s.l}</span>
                    </span>
                  ))}
                </span>
              </Link>
            </CartaHolo>

            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted">{t("plataformasDemo")}</p>
              {/* Insignias como en un perfil real (ids reales de lib/logros). */}
              <Badges earnedBadges={DEMO_INSIGNIAS} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] space-y-9 px-7 pb-24 pt-6">
        <ParagonWrap
          games={DEMO_JUEGOS}
          esteAnio={DEMO_ANIO.trofeos}
          juegosEsteAnio={DEMO_ANIO.juegos}
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile value={stats.platinos} label={t("platinos")} accent="var(--platinum)" />
          <StatTile value={stats.trofeos} label={t("trofeos")} />
          <StatTile value={stats.juegos} label={t("juegos")} />
          <StatTile value={`${stats.completadoMedio}%`} label={t("completadoMedio")} />
        </div>

        <TrophyCountRow
          counts={stats.counts}
          summary={t("trofeosEnJuegos", { trofeos: stats.trofeos, juegos: stats.juegos })}
          tieneMetales={stats.tieneMetales}
          logrosSinMetal={stats.logrosSinMetal}
        />

        {favoritos.length > 0 && (
          <section>
            <h2 className="font-heading mb-4 text-xl font-bold uppercase tracking-wide text-muted">
              {t("juegosFavoritos")}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {favoritos.map((game) => (
                <GameCard key={game.id} game={game} href="/entrar" />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-4 flex flex-wrap items-center gap-3.5">
            <h2 className="font-heading text-2xl font-bold">{t("biblioteca")}</h2>
            <span className="text-[0.8125rem] text-muted">
              {t("juegosOrdenados", { n: DEMO_JUEGOS.length })}
            </span>
          </div>

          {/* Lomos de caja, la vista por defecto de la biblioteca: mismo
              cálculo que LibraryGrid (alto según horas, franja del metal
              alcanzado). Llevan a registrarse: aquí no hay fichas reales. */}
          <div className="flex flex-wrap items-end gap-y-8">
            {[...DEMO_JUEGOS]
              .sort((a, b) => (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""))
              .map((game) => {
                const pct = game.progressPercent ?? 0;
                const metal = pct >= 100 ? "#9fd4ec" : pct >= 75 ? "#e2b53e" : pct >= 40 ? "#b9c2cc" : pct > 0 ? "#c07b4a" : "var(--border)";
                const alto = Math.round(Math.min(300, 170 + Math.sqrt((game.playtimeMinutes ?? 0) / 60) * 9));
                return (
                  <div key={game.id} className="lomo-hueco">
                    <Link
                      href="/entrar"
                      className="lomo"
                      style={{ height: alto, ["--metal" as string]: metal, ...(game.iconUrl ? { ["--portada" as string]: `url(${game.iconUrl})` } : { background: coverGradient(game.id) }) }}
                      title={`${game.title} · ${pct}%`}
                    >
                      <span className="lomo-franja" aria-hidden="true" />
                      <span className="lomo-titulo">{game.title}</span>
                      <span className="lomo-pct">{pct}%</span>
                    </Link>
                    <div className="lomo-balda" aria-hidden="true" />
                  </div>
                );
              })}
          </div>
        </section>

        <div
          className="rounded-[18px] p-8 text-center"
          style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
        >
          <h2 className="font-heading text-2xl font-bold">{t("estoConTusJuegos")}</h2>
          <p className="mx-auto mt-2 max-w-[520px] text-[0.9375rem] text-muted">
            {t("vinculasTuId")}
          </p>
          <Link
            href="/entrar"
            className="mt-5 inline-block rounded-xl px-6 py-3.5 text-[0.9375rem] font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb) / 0.4)]"
            style={{ background: "var(--accent-grad)" }}
          >
            {t("empezarLaCaza")}
          </Link>
        </div>
      </div>
    </div>
  );
}
