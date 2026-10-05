"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import type { EsportsMatch, EsportsStanding } from "@/lib/pandascore";
import { Dorsal } from "@/components/carreras/Dorsal";
import { Escudo } from "@/components/esports/Escudo";
import { EstrellaFavorito, useFavoritos } from "@/components/esports/Favoritos";
import { comoFavorito, hrefPartido } from "@/components/esports/util";

const LOCALE_TAGS: Record<string, string> = { es: "es-ES", en: "en-US", de: "de-DE", fr: "fr-FR" };
const ORDEN_NIVEL: Record<string, number> = { s: 0, a: 1, b: 2, c: 3, d: 4 };
const nivelDe = (tier: string | null | undefined) => ORDEN_NIVEL[tier ?? ""] ?? 5;

interface Competicion {
  clave: string;
  juego: string;
  liga: string;
  nivel: number;
  tier: string | null;
  enDirecto: EsportsMatch[];
  proximos: EsportsMatch[];
  pasados: EsportsMatch[];
  /** Torneo (fase) que manda: el del directo, si no el del próximo. */
  torneoId: number | null;
  torneo: string | null;
  conFavorito: boolean;
}

function chip(activo: boolean) {
  return `shrink-0 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5 ${
    activo
      ? "border-transparent text-background"
      : "border-border bg-surface text-muted hover:border-[rgb(var(--accent-rgb)/0.5)] hover:bg-surface-2 hover:text-foreground"
  }`;
}

const ESTRELLA = "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z";

export function EsportsHub({
  live,
  upcoming,
  past,
  standings,
  cabecera,
}: {
  live: EsportsMatch[];
  upcoming: EsportsMatch[];
  past: EsportsMatch[];
  standings: Record<number, EsportsStanding[]>;
  /** Título y subtítulo de la página: en escritorio comparten fila con los filtros. */
  cabecera?: React.ReactNode;
}) {
  const t = useTranslations("Descubrir.EsportsHub");
  const locale = useLocale();
  const localeTag = LOCALE_TAGS[locale] ?? "es-ES";
  const { favoritos, esFavorito, logueado } = useFavoritos();
  // null = todos los juegos.
  const [juego, setJuego] = useState<string | null>(null);
  const [soloMios, setSoloMios] = useState(false);

  const juegos = Array.from(new Set([...live, ...upcoming, ...past].map((m) => m.game))).sort();
  const deFavorito = (m: EsportsMatch) => (m.team1.id != null && esFavorito(m.team1.id)) || (m.team2.id != null && esFavorito(m.team2.id));
  const pasa = (m: EsportsMatch) => (juego === null || m.game === juego) && (!soloMios || deFavorito(m));

  const enDirecto = live.filter(pasa);
  const proximos = upcoming.filter(pasa);
  const pasados = past.filter(pasa);

  // Competiciones: juego + liga. Dentro, directo → próximos → resultados.
  const mapa = new Map<string, Competicion>();
  const meter = (m: EsportsMatch, donde: "enDirecto" | "proximos" | "pasados") => {
    const clave = `${m.game}|${m.league}`;
    let c = mapa.get(clave);
    if (!c) {
      c = { clave, juego: m.game, liga: m.league, nivel: 5, tier: null, enDirecto: [], proximos: [], pasados: [], torneoId: null, torneo: null, conFavorito: false };
      mapa.set(clave, c);
    }
    c[donde].push(m);
    if (nivelDe(m.tier) < c.nivel) {
      c.nivel = nivelDe(m.tier);
      c.tier = m.tier ?? null;
    }
    if (c.torneoId == null && m.tournamentId != null && donde !== "pasados") {
      c.torneoId = m.tournamentId;
      c.torneo = m.tournament ?? null;
    }
    if (deFavorito(m)) c.conFavorito = true;
  };
  enDirecto.forEach((m) => meter(m, "enDirecto"));
  proximos.forEach((m) => meter(m, "proximos"));
  pasados.forEach((m) => meter(m, "pasados"));
  for (const c of mapa.values()) {
    if (c.torneoId == null && c.pasados[0]?.tournamentId != null) {
      c.torneoId = c.pasados[0].tournamentId;
      c.torneo = c.pasados[0].tournament ?? null;
    }
  }

  const competiciones = Array.from(mapa.values()).sort(
    (a, b) =>
      Number(b.conFavorito) - Number(a.conFavorito) ||
      Number(b.enDirecto.length > 0) - Number(a.enDirecto.length > 0) ||
      a.nivel - b.nivel ||
      (a.proximos[0]?.date ?? "9").localeCompare(b.proximos[0]?.date ?? "9"),
  );
  // Las de nivel bajo sin directo ni favoritos van plegadas al final.
  const principales = competiciones.filter((c) => c.nivel <= 2 || c.enDirecto.length > 0 || c.conFavorito);
  const resto = competiciones.filter((c) => !principales.includes(c));

  const hoy = new Date().toDateString();
  // eslint-disable-next-line react-hooks/purity -- "mañana" depende de la hora actual a propósito.
  const manana = new Date(Date.now() + 86400000).toDateString();
  const hora = (iso: string) => new Date(iso).toLocaleTimeString(localeTag, { hour: "2-digit", minute: "2-digit" });
  const dia = (iso: string) => {
    const d = new Date(iso).toDateString();
    if (d === hoy) return t("hoy");
    if (d === manana) return t("manana");
    return new Date(iso).toLocaleDateString(localeTag, { weekday: "short", day: "numeric", month: "short" });
  };

  return (
    <div className="flex flex-col gap-7">
      {/* Cabecera + filtros: juego y todos / mis equipos */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        {cabecera && <div className="min-w-0 shrink-0">{cabecera}</div>}
        <div className="flex min-w-0 flex-col gap-3 lg:items-end">
        <div role="group" aria-label={t("filtrarPor")} className="-mx-4 -my-3 flex min-w-0 max-w-full items-center gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:justify-end lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
          <button type="button" aria-pressed={juego === null} onClick={() => setJuego(null)} className={chip(juego === null)} style={juego === null ? { background: "var(--accent-grad)" } : undefined}>
            {t("todos")}
          </button>
          {juegos.map((g) => (
            <button key={g} type="button" aria-pressed={juego === g} onClick={() => setJuego(g)} className={chip(juego === g)} style={juego === g ? { background: "var(--accent-grad)" } : undefined}>
              {g}
            </button>
          ))}
        </div>

        <div role="group" aria-label={t("misEquipos")} className="flex shrink-0 self-start rounded-full border border-border bg-surface p-1 lg:self-end">
          {[false, true].map((mios) => (
            <button
              key={String(mios)}
              type="button"
              aria-pressed={soloMios === mios}
              onClick={() => setSoloMios(mios)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                soloMios === mios ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2/60 hover:text-foreground"
              }`}
            >
              {mios ? (
                <>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-[var(--gold)]">
                    <path d={ESTRELLA} />
                  </svg>
                  {t("misEquipos")}
                  {favoritos.length > 0 && <span className="carreras-cifra text-muted">{favoritos.length}</span>}
                </>
              ) : (
                t("todos")
              )}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Tus equipos */}
      {favoritos.length > 0 ? (
        <section aria-labelledby="esports-tus-equipos">
          <h2 id="esports-tus-equipos" className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">{t("tusEquipos")}</h2>
          <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]">
            {favoritos.map((f) => {
              const juega = (m: EsportsMatch) => m.team1.id === f.teamId || m.team2.id === f.teamId;
              const ahora = live.find(juega);
              const siguiente = upcoming.find(juega);
              const ultimo = past.find(juega);
              const partido = ahora ?? siguiente ?? ultimo;
              const rival = partido ? (partido.team1.id === f.teamId ? partido.team2 : partido.team1) : null;
              const propio = partido ? (partido.team1.id === f.teamId ? partido.team1 : partido.team2) : null;
              return (
                <li key={f.teamId} className="relative flex w-64 shrink-0 flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-[rgb(var(--accent-rgb)/0.5)] hover:bg-surface-2/40">
                  {partido && (
                    <Link
                      href={hrefPartido(partido.id)}
                      aria-label={t("verPartido", { a: partido.team1.name, b: partido.team2.name })}
                      className="absolute inset-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                    />
                  )}
                  <div className="flex items-center gap-3">
                    <Escudo logo={f.logo} name={f.nombre} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{f.nombre}</span>
                      {f.juego && <span className="block text-[0.6875rem] font-bold uppercase tracking-wider text-muted">{f.juego}</span>}
                    </span>
                    <EstrellaFavorito equipo={f} />
                  </div>
                  <div className="flex items-center gap-2 border-t border-border pt-3 text-sm">
                    {ahora && propio && rival ? (
                      <>
                        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--danger)] motion-reduce:animate-none" aria-hidden="true" />
                        <span className="font-bold text-[var(--danger)]">{t("estadoEnDirecto")}</span>
                        <span className="min-w-0 flex-1 truncate text-muted">
                          {t("vs")} {rival.name}
                        </span>
                        <span className="carreras-cifra">
                          {propio.score}:{rival.score}
                        </span>
                      </>
                    ) : siguiente && rival ? (
                      <>
                        <span className="carreras-cifra shrink-0 text-[var(--accent-text)]" suppressHydrationWarning>
                          {dia(siguiente.date)} {hora(siguiente.date)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-muted">
                          {t("vs")} {rival.name}
                        </span>
                      </>
                    ) : ultimo && propio && rival ? (
                      <>
                        <span className={`shrink-0 font-bold ${propio.score > rival.score ? "text-[var(--good)]" : propio.score < rival.score ? "text-[var(--danger)]" : "text-muted"}`}>
                          {propio.score > rival.score ? t("victoria") : propio.score < rival.score ? t("derrota") : t("empate")}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-muted">
                          {t("vs")} {rival.name}
                        </span>
                        <span className="carreras-cifra">
                          {propio.score}:{rival.score}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted">{t("sinPartidosEquipo")}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        soloMios && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
            <p className="font-heading text-lg font-bold">{t("sinFavoritosTitulo")}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">{t("sinFavoritosTexto")}</p>
            {!logueado && (
              <Link href="/entrar" className="mt-4 inline-flex rounded-xl px-5 py-2.5 text-sm font-bold text-background transition-transform hover:-translate-y-0.5" style={{ background: "var(--accent-grad)" }}>
                {t("entraParaSeguir")}
              </Link>
            )}
          </div>
        )
      )}

      {/* En directo */}
      <section aria-labelledby="esports-directo">
        <div className="mb-4 flex items-center gap-3">
          <span className="relative flex h-3 w-3" aria-hidden="true">
            {enDirecto.length > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--danger)] opacity-70 motion-reduce:animate-none" />}
            <span className={`relative inline-flex h-3 w-3 rounded-full ${enDirecto.length > 0 ? "bg-[var(--danger)]" : "bg-muted/50"}`} />
          </span>
          <h2 id="esports-directo" className="font-heading text-xl font-bold uppercase tracking-wide">
            {t("enDirecto")}
            {enDirecto.length > 0 && <span className="carreras-cifra ml-2 text-[var(--danger)]">{enDirecto.length}</span>}
          </h2>
        </div>
        {enDirecto.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-5 text-sm text-muted">
            {soloMios ? t("sinDirectoFavoritos") : t("sinPartidosDirecto", { juego: juego ?? t("ningunJuego") })}
          </p>
        ) : (
          <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]">
            {enDirecto.map((m) => (
              <li
                key={m.id}
                className="relative w-[17.5rem] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-[color-mix(in_srgb,var(--danger)_55%,transparent)] hover:bg-surface-2/40"
              >
                <Link
                  href={hrefPartido(m.id)}
                  aria-label={t("verPartido", { a: m.team1.name, b: m.team2.name })}
                  className="absolute inset-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)]"
                />
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <Dorsal id={m.game} texto={m.game} />
                  <span className="min-w-0 flex-1 truncate text-[0.6875rem] font-bold uppercase tracking-wider text-muted">{m.league}</span>
                  <span className="carreras-cifra text-[0.6875rem] text-muted">{m.format}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-4">
                  <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                    <Escudo logo={m.team1.logo} name={m.team1.name} size={40} />
                    <span className="line-clamp-1 w-full text-xs font-bold">{m.team1.acronym || m.team1.name}</span>
                  </div>
                  <div className="carreras-cifra flex items-center gap-1.5 text-3xl leading-none">
                    <span>{m.team1.score}</span>
                    <span className="text-lg text-muted/60">:</span>
                    <span>{m.team2.score}</span>
                  </div>
                  <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                    <Escudo logo={m.team2.logo} name={m.team2.name} size={40} />
                    <span className="line-clamp-1 w-full text-xs font-bold">{m.team2.acronym || m.team2.name}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Competiciones */}
      <section aria-labelledby="esports-competiciones" className="flex flex-col gap-6">
        <h2 id="esports-competiciones" className="sr-only">{t("competiciones")}</h2>
        {principales.length === 0 && resto.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
            {soloMios ? t("sinPartidosFavoritos") : t("sinPartidosProgramados")}
          </p>
        ) : (
          principales.map((c) => <BloqueCompeticion key={c.clave} c={c} tabla={c.torneoId != null ? standings[c.torneoId] ?? [] : []} hora={hora} dia={dia} />)
        )}

        {resto.length > 0 && (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-y border-border px-1 py-3.5 text-sm font-bold uppercase tracking-wide text-muted transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
              <span>{t("masCompeticiones", { n: resto.length })}</span>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <div className="flex flex-col gap-6 pt-6">
              {resto.map((c) => (
                <BloqueCompeticion key={c.clave} c={c} tabla={[]} hora={hora} dia={dia} />
              ))}
            </div>
          </details>
        )}
      </section>
    </div>
  );
}

function BloqueCompeticion({
  c,
  tabla,
  hora,
  dia,
}: {
  c: Competicion;
  tabla: EsportsStanding[];
  hora: (iso: string) => string;
  dia: (iso: string) => string;
}) {
  const t = useTranslations("Descubrir.EsportsHub");
  const { esFavorito } = useFavoritos();
  // De los resultados, solo los últimos: manda la competición, no el archivo.
  const partidos = [...c.enDirecto, ...c.proximos.slice(0, 8), ...c.pasados.slice(0, 3)];
  // Con pocos partidos, tabla corta (más los equipos que juegan aquí o sigues).
  const juegan = new Set(partidos.flatMap((m) => [m.team1.id, m.team2.id]));
  const limite = partidos.length <= 1 ? 2 : partidos.length <= 2 ? 4 : 8;
  const filasTabla = tabla.filter((s, i) => i < limite || juegan.has(s.teamId) || esFavorito(s.teamId));

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-surface-2/50 px-4 py-3 sm:px-5">
        <Dorsal id={c.juego} texto={c.juego} />
        <h3 className="font-heading text-lg font-bold leading-tight">{c.liga}</h3>
        {c.tier && <span className="rounded border border-border px-1.5 py-0.5 text-[0.6875rem] font-bold uppercase text-muted">{t("nivel", { tier: c.tier.toUpperCase() })}</span>}
        {c.enDirecto.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--danger)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" aria-hidden="true" />
            {t("enDirectoN", { n: c.enDirecto.length })}
          </span>
        )}
        {c.torneo && <span className="ml-auto max-w-full truncate text-xs text-muted">{c.torneo}</span>}
      </header>

      <div className={filasTabla.length > 0 ? "grid md:grid-cols-[minmax(0,1fr)_300px]" : ""}>
        <ol className="min-w-0">
          {partidos.map((m) => {
            const enVivo = m.status === "running";
            const jugado = m.status === "past";
            return (
              <li key={m.id} className="relative grid grid-cols-[3.75rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[4.25rem_minmax(0,1fr)] border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-surface-2/60 sm:px-5">
                <Link
                  href={hrefPartido(m.id)}
                  aria-label={t("verPartido", { a: m.team1.name, b: m.team2.name })}
                  className="absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)]"
                />
                <div className="flex flex-col text-xs">
                  {enVivo ? (
                    <span className="flex items-center gap-1.5 font-bold uppercase text-[var(--danger)]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--danger)] motion-reduce:animate-none" aria-hidden="true" />
                      {t("enVivo")}
                    </span>
                  ) : jugado ? (
                    <>
                      <span className="font-bold uppercase text-muted">{t("estadoFinal")}</span>
                      <span className="text-muted/80" suppressHydrationWarning>
                        {dia(m.date)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="carreras-cifra text-base text-[var(--accent-text)]" suppressHydrationWarning>
                        {hora(m.date)}
                      </span>
                      <span className="text-muted/80" suppressHydrationWarning>
                        {dia(m.date)}
                      </span>
                    </>
                  )}
                  <span className="carreras-cifra mt-0.5 text-[0.625rem] text-muted/70">{m.format}</span>
                </div>

                <div className="flex min-w-0 flex-col gap-1.5">
                  {[m.team1, m.team2].map((eq, i) => {
                    const otro = i === 0 ? m.team2 : m.team1;
                    const gana = jugado && eq.score > otro.score;
                    const pierde = jugado && eq.score < otro.score;
                    const fav = comoFavorito(eq, m.game);
                    return (
                      <div key={i} className="flex items-center gap-2.5">
                        <Escudo logo={eq.logo} name={eq.name} size={22} />
                        <span
                          className={`min-w-0 truncate text-sm ${gana ? "font-bold" : pierde ? "font-medium text-muted" : "font-semibold"} ${eq.id != null && esFavorito(eq.id) ? "text-[var(--gold)]" : ""}`}
                        >
                          <span className="sm:hidden" title={eq.name}>
                            {eq.acronym && eq.name.length > 10 ? eq.acronym : eq.name}
                          </span>
                          <span className="hidden sm:inline">{eq.name}</span>
                        </span>
                        {fav && <EstrellaFavorito equipo={fav} />}
                        {(enVivo || jugado) && <span className={`carreras-cifra ml-auto pl-2 text-base ${gana ? "text-[var(--accent-text)]" : pierde ? "text-muted" : ""}`}>{eq.score}</span>}
                      </div>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>

        {filasTabla.length > 0 && (
          <aside className="border-t border-border bg-background/30 md:border-l md:border-t-0">
            <h4 className="flex items-baseline justify-between gap-2 px-4 pb-2 pt-3 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
              <span>{t("clasificacion")}</span>
              <span className="tracking-normal">
                {t("victoriasAbr")}-{t("derrotasAbr")}
              </span>
            </h4>
            <ol>
              {filasTabla.map((s) => {
                const fav = esFavorito(s.teamId);
                return (
                  <li key={s.teamId} className={`flex items-center gap-2.5 px-4 py-1.5 text-sm ${fav ? "bg-[color-mix(in_srgb,var(--gold)_10%,transparent)]" : ""}`}>
                    <span className="carreras-cifra w-5 shrink-0 text-right text-muted">{s.rank}</span>
                    <Escudo logo={s.logo} name={s.name} size={18} />
                    <span className={`min-w-0 flex-1 truncate ${fav ? "font-bold text-[var(--gold)]" : ""}`}>{s.name}</span>
                    <span className="carreras-cifra shrink-0 text-muted">
                      {s.wins}-{s.losses}
                    </span>
                  </li>
                );
              })}
            </ol>
            {tabla.length > filasTabla.length && partidos[0] && (
              <Link
                href={hrefPartido(partidos[0].id)}
                className="mx-2 mb-2 mt-1 flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {t("yMas", { n: tabla.length - filasTabla.length })}
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            )}
          </aside>
        )}
      </div>
    </article>
  );
}
