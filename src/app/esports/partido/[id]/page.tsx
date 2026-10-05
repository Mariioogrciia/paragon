import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { SiKick, SiTwitch, SiYoutube } from "@icons-pack/react-simple-icons";
import { auth } from "@/auth";
import { BackButton } from "@/components/BackButton";
import { Dorsal } from "@/components/carreras/Dorsal";
import { Escudo } from "@/components/esports/Escudo";
import { EstrellaFavorito, FavoritosProvider } from "@/components/esports/Favoritos";
import { CuentaAtras, FechaLocal } from "@/components/esports/FechaLocal";
import { DirectoIncrustado } from "@/components/esports/DirectoIncrustado";
import { comoFavorito, hrefPartido } from "@/components/esports/util";
import { getFavoritos } from "@/lib/esportsFavoritos";
import { getPandaScoreMatchDetail, type EsportsMatchDetail, type EsportsStream, type EsportsTeamDetail } from "@/lib/pandascore";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPandaScoreMatchDetail(id);
  return { title: p ? `${p.teams[0].name} vs ${p.teams[1].name} · ${p.league} · Paragon` : "eSports · Paragon" };
}

const ICONO_PLATAFORMA = {
  twitch: { Icono: SiTwitch, color: "#9146FF", nombre: "Twitch" },
  youtube: { Icono: SiYoutube, color: "#FF0033", nombre: "YouTube" },
  kick: { Icono: SiKick, color: "#53FC18", nombre: "Kick" },
} as const;

const fechaIcs = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Evento .ics de un partido por jugar; dura una hora por partida posible. */
function calendarioIcs(p: EsportsMatchDetail, url: string): string | null {
  const inicio = p.scheduledAt ?? p.beginAt;
  if (!inicio) return null;
  const empieza = new Date(inicio);
  const acaba = new Date(empieza.getTime() + Math.max(1, p.numberOfGames) * 3_600_000);
  const texto = (s: string) => s.replace(/([,;\\])/g, "\\$1");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Paragon//eSports//ES",
    "BEGIN:VEVENT",
    `UID:pandascore-${p.id}@paragon`,
    `DTSTAMP:${fechaIcs(new Date())}`,
    `DTSTART:${fechaIcs(empieza)}`,
    `DTEND:${fechaIcs(acaba)}`,
    `SUMMARY:${texto(`${p.teams[0].name} vs ${p.teams[1].name} · ${p.game}`)}`,
    `DESCRIPTION:${texto([p.league, p.serie, p.tournament].filter(Boolean).join(" · "))}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** URL de inserción del directo; Twitch exige el dominio que lo incrusta. */
function urlIncrustada(s: EsportsStream, host: string): string | null {
  if (!s.embedUrl) return null;
  if (s.plataforma === "twitch") return `${s.embedUrl}&parent=${host}&autoplay=false`;
  if (s.plataforma === "youtube" || s.plataforma === "kick") return s.embedUrl;
  return null;
}

function Equipo({ e, lado, juego, pierde, pais }: { e: EsportsTeamDetail; lado: "izq" | "der"; juego: string; pierde: boolean; pais: string | null }) {
  const fav = comoFavorito({ id: e.id, name: e.name, acronym: e.acronym, logo: e.logo }, juego);
  return (
    <div className={`flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:gap-5 ${lado === "der" ? "sm:flex-row-reverse sm:text-right" : "sm:text-left"} ${pierde ? "opacity-60" : ""}`}>
      <Escudo logo={e.logo} name={e.name} size={88} />
      <div className="w-full min-w-0 sm:w-auto">
        {/* En móvil, alto fijo (2 líneas de nombre y 2 de país): las estrellas de los dos lados quedan a la misma altura. */}
        <p className="line-clamp-2 min-h-[2lh] font-heading text-lg font-bold leading-tight sm:min-h-0 sm:text-2xl">{e.name}</p>
        <p className="mt-1 line-clamp-2 min-h-[2lh] text-xs font-bold uppercase tracking-wider text-muted sm:min-h-0">
          {[e.acronym, pais].filter(Boolean).join(" · ")}
        </p>
        {fav && (
          <div className={`mt-2 flex justify-center ${lado === "der" ? "sm:justify-end" : "sm:justify-start"}`}>
            <EstrellaFavorito equipo={fav} size="md" />
          </div>
        )}
      </div>
    </div>
  );
}

const duracion = (seg: number) => `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;

export default async function PartidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPandaScoreMatchDetail(id);
  if (!p) notFound();

  const t = await getTranslations("Descubrir.EsportsPartido");
  const locale = await getLocale();
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const favoritos = userId ? await getFavoritos(userId) : [];
  const idsFavoritos = new Set(favoritos.map((f) => f.teamId));

  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost").split(":")[0];
  const urlFicha = `https://${h.get("x-forwarded-host") ?? h.get("host") ?? "localhost"}${hrefPartido(p.id)}`;

  const region = new Intl.DisplayNames([locale], { type: "region" });
  const idioma = new Intl.DisplayNames([locale], { type: "language" });
  const pais = (code: string | null) => {
    if (!code) return null;
    try {
      return region.of(code.toUpperCase()) ?? code;
    } catch {
      return code;
    }
  };
  const nombreIdioma = (code: string | null) => {
    if (!code) return t("idiomaDesconocido");
    try {
      const n = idioma.of(code) ?? code;
      return n.charAt(0).toLocaleUpperCase(locale) + n.slice(1);
    } catch {
      return code;
    }
  };

  const [a, b] = p.teams;
  const enVivo = p.status === "running";
  const terminado = p.status === "past";
  const cancelado = p.statusRaw === "canceled" || p.statusRaw === "postponed";
  const ganador = p.winnerId === a.id ? a : p.winnerId === b.id ? b : null;
  const mapaEnJuego = p.games.find((g) => g.status === "running");
  const inicio = p.scheduledAt ?? p.beginAt;
  const ics = !enVivo && !terminado && !cancelado ? calendarioIcs(p, urlFicha) : null;
  const directo = enVivo ? p.streams.map((s) => ({ s, url: urlIncrustada(s, host) })).find((x) => x.url) : undefined;
  const equipoPorId = new Map([a, b].map((e) => [e.id, e]));
  const otros = [
    ...p.otros.filter((m) => m.status === "running"),
    ...p.otros.filter((m) => m.status === "upcoming"),
    ...p.otros.filter((m) => m.status === "past").reverse(),
  ].slice(0, 10);

  return (
    <FavoritosProvider iniciales={favoritos} logueado={!!userId}>
      <div className="mx-auto max-w-[1240px] px-7 py-12">
        <BackButton fallbackHref="/esports" />

        {/* Ruta del torneo */}
        <nav aria-label={t("rutaTorneo")} className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Dorsal id={p.game} texto={p.game} />
          <ol className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm font-semibold">
            {[p.league, p.serie, p.tournament].filter(Boolean).map((paso, i, todos) => (
              <li key={i} className={`flex items-center gap-2 ${i === todos.length - 1 ? "text-foreground" : "text-muted"}`}>
                {i > 0 && <span aria-hidden="true" className="text-muted/50">›</span>}
                {i === 0 && p.leagueUrl ? (
                  <a href={p.leagueUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-4 transition-colors hover:text-foreground hover:underline">
                    {paso}
                  </a>
                ) : (
                  paso
                )}
              </li>
            ))}
          </ol>
        </nav>
        <ul className="mt-3 flex flex-wrap gap-2 text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
          {p.tier && <li className="rounded border border-border px-2 py-1">{t("nivel", { tier: p.tier.toUpperCase() })}</li>}
          {p.modalidad && (
            <li className="rounded border border-border px-2 py-1">
              {p.modalidad === "offline" ? t("presencial") : t("online")}
              {p.modalidad === "offline" && p.pais && ` · ${pais(p.pais)}`}
            </li>
          )}
          {p.region && <li className="rounded border border-border px-2 py-1">{t("region", { region: p.region })}</li>}
          <li className="rounded border border-border px-2 py-1">{t("formato", { n: p.numberOfGames })}</li>
          {p.rescheduled && p.originalScheduledAt && (
            <li className="rounded border border-[color-mix(in_srgb,var(--gold)_45%,transparent)] px-2 py-1 text-[var(--gold)]">
              {t("aplazado")} <FechaLocal iso={p.originalScheduledAt} opciones={{ hour: "2-digit", minute: "2-digit" }} />
            </li>
          )}
        </ul>

        {/* Marcador */}
        <section aria-label={t("marcador")} className="mt-8 overflow-hidden rounded-3xl border border-border bg-surface">
          <div className="carreras-banda" style={{ ["--librea" as string]: enVivo ? "var(--danger)" : "var(--accent)", ["--librea-tinta" as string]: "var(--surface)" }} aria-hidden="true" />
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4 px-5 py-8 sm:items-center sm:gap-8 sm:px-10 sm:py-10">
            <Equipo e={a} lado="izq" juego={p.game} pierde={!!(terminado && ganador && ganador.id !== a.id)} pais={pais(a.location)} />
            <div className="flex h-[88px] flex-col items-center justify-center sm:h-auto">
              {enVivo || terminado ? (
                <div className="carreras-cifra flex items-center gap-3 text-5xl leading-none sm:text-7xl">
                  <span className={terminado && ganador?.id === a.id ? "text-[var(--accent-text)]" : ""}>{a.score}</span>
                  <span className="text-2xl text-muted/50 sm:text-4xl">:</span>
                  <span className={terminado && ganador?.id === b.id ? "text-[var(--accent-text)]" : ""}>{b.score}</span>
                </div>
              ) : (
                <span className="font-heading text-2xl font-bold uppercase text-muted sm:text-4xl">{t("vs")}</span>
              )}
            </div>
            <Equipo e={b} lado="der" juego={p.game} pierde={!!(terminado && ganador && ganador.id !== b.id)} pais={pais(b.location)} />
          </div>

          <div className="flex flex-col items-center gap-3 border-t border-border bg-surface-2/40 px-5 py-4 text-sm sm:flex-row sm:justify-center sm:gap-6">
            {cancelado ? (
              <span className="font-bold uppercase text-muted">{p.statusRaw === "canceled" ? t("cancelado") : t("pospuesto")}</span>
            ) : enVivo ? (
              <span className="flex items-center gap-2 font-bold uppercase text-[var(--danger)]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--danger)] motion-reduce:animate-none" aria-hidden="true" />
                {mapaEnJuego ? t("enDirectoMapa", { n: mapaEnJuego.position }) : t("enDirecto")}
              </span>
            ) : terminado ? (
              <span className="font-bold">
                {p.draw ? t("empate") : ganador ? t("gano", { equipo: ganador.name }) : t("final")}
                {p.forfeit && <span className="ml-2 font-normal text-muted">{t("porIncomparecencia")}</span>}
                {p.endAt && (
                  <span className="ml-2 font-normal text-muted">
                    · <FechaLocal iso={p.endAt} opciones={{ day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }} />
                  </span>
                )}
              </span>
            ) : inicio ? (
              <>
                <span className="font-bold">
                  <FechaLocal iso={inicio} opciones={{ weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }} className="first-letter:uppercase" />
                </span>
                <span className="carreras-cifra text-[var(--accent-text)]">
                  <CuentaAtras iso={inicio} />
                </span>
                {ics && (
                  <a
                    href={`data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`}
                    download={`${a.name}-vs-${b.name}.ics`.replace(/[^\w.-]+/g, "-")}
                    className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5 hover:border-[rgb(var(--accent-rgb)/0.5)] hover:bg-surface-2"
                  >
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M16 3v4M8 3v4M3 10h18M12 14v4M10 16h4" />
                    </svg>
                    {t("anadirCalendario")}
                  </a>
                )}
              </>
            ) : (
              <span className="text-muted">{t("sinFecha")}</span>
            )}
          </div>
        </section>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-10">
            {/* Clasificación */}
            {p.standings.length > 0 && (
              <section aria-labelledby="partido-clasificacion">
                <h2 id="partido-clasificacion" className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">
                  {t("clasificacion")}
                  {p.tournament && <span className="ml-2 text-sm font-semibold normal-case tracking-normal text-muted">{p.tournament}</span>}
                </h2>
                <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
                  <table className="w-full min-w-[26rem] text-sm">
                    <thead>
                      <tr className="border-b border-border text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
                        <th scope="col" className="w-12 px-4 py-2.5 text-right">#</th>
                        <th scope="col" className="px-2 py-2.5 text-left">{t("equipo")}</th>
                        <th scope="col" className="px-2 py-2.5 text-right" title={t("victorias")}>{t("victoriasAbr")}</th>
                        <th scope="col" className="px-2 py-2.5 text-right" title={t("derrotas")}>{t("derrotasAbr")}</th>
                        <th scope="col" className="px-4 py-2.5 text-right" title={t("mapasGanadosPerdidos")}>{t("mapas")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.standings.map((s) => {
                        const juega = equipoPorId.has(s.teamId);
                        const fav = idsFavoritos.has(s.teamId);
                        return (
                          <tr
                            key={s.teamId}
                            className={`border-b border-border last:border-0 ${juega ? "bg-[rgb(var(--accent-rgb)/0.10)]" : fav ? "bg-[color-mix(in_srgb,var(--gold)_8%,transparent)]" : ""}`}
                          >
                            <td className="carreras-cifra px-4 py-2.5 text-right text-muted">{s.rank}</td>
                            <td className="px-2 py-2.5">
                              <span className="flex items-center gap-2.5">
                                <Escudo logo={s.logo} name={s.name} size={22} />
                                <span className={`truncate ${juega ? "font-bold" : ""} ${fav ? "text-[var(--gold)]" : ""}`}>{s.name}</span>
                                {juega && <span className="shrink-0 rounded bg-[rgb(var(--accent-rgb)/0.18)] px-1.5 py-0.5 text-[0.625rem] font-bold uppercase text-[var(--accent-text)]">{t("juegaAqui")}</span>}
                              </span>
                            </td>
                            <td className="carreras-cifra px-2 py-2.5 text-right">{s.wins}</td>
                            <td className="carreras-cifra px-2 py-2.5 text-right text-muted">{s.losses}</td>
                            <td className="carreras-cifra px-4 py-2.5 text-right text-muted">
                              {s.gameWins}-{s.gameLosses}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Mapas */}
            <section aria-labelledby="partido-mapas">
              <h2 id="partido-mapas" className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">{t("mapasTitulo")}</h2>
              {p.games.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">{t("sinMapas")}</p>
              ) : (
                <ol className="overflow-hidden rounded-2xl border border-border bg-surface">
                  {p.games.map((g) => {
                    const gana = g.winnerId != null ? equipoPorId.get(g.winnerId) : undefined;
                    return (
                      <li key={g.position} className="flex items-center gap-4 border-b border-border px-5 py-3.5 last:border-0">
                        <span className="carreras-cifra w-8 shrink-0 text-2xl text-muted/70">{g.position}</span>
                        <span className="min-w-0 flex-1">
                          {g.status === "running" ? (
                            <span className="flex items-center gap-2 font-bold text-[var(--danger)]">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--danger)] motion-reduce:animate-none" aria-hidden="true" />
                              {t("enJuego")}
                            </span>
                          ) : gana ? (
                            <span className="flex items-center gap-2.5">
                              <Escudo logo={gana.logo} name={gana.name} size={24} />
                              <span className="truncate font-bold">{gana.name}</span>
                              {g.forfeit && <span className="text-xs text-muted">{t("porIncomparecencia")}</span>}
                            </span>
                          ) : g.status === "finished" ? (
                            <span className="text-muted">{t("final")}</span>
                          ) : (
                            <span className="text-muted">{g.status === "not_played" ? t("noSeJugo") : t("porJugar")}</span>
                          )}
                        </span>
                        {g.length != null && g.length > 0 && <span className="carreras-cifra shrink-0 text-sm text-muted" title={t("duracion")}>{duracion(g.length)}</span>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            {/* Plantillas */}
            <section aria-labelledby="partido-plantillas">
              <h2 id="partido-plantillas" className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">{t("plantillas")}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[a, b].map((e) => (
                  <div key={e.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
                    <div className="flex items-center gap-3 border-b border-border bg-surface-2/50 px-4 py-3">
                      <Escudo logo={e.logo} name={e.name} size={28} />
                      <span className="min-w-0 flex-1 truncate font-bold">{e.name}</span>
                    </div>
                    {e.players.length === 0 ? (
                      <p className="px-4 py-5 text-sm text-muted">{t("sinPlantilla")}</p>
                    ) : (
                      <ul>
                        {e.players.map((j) => (
                          <li key={j.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0">
                            <Escudo logo={j.foto || null} name={j.nick} size={36} redondo />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-bold">{j.nick}</span>
                              {(j.nombre || j.rol) && <span className="block truncate text-xs text-muted">{[j.nombre, j.rol].filter(Boolean).join(" · ")}</span>}
                            </span>
                            <span className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-muted">
                              {j.nacionalidad && (
                                <span className="rounded border border-border px-1.5 py-0.5 font-bold" title={pais(j.nacionalidad) ?? undefined}>
                                  {j.nacionalidad.toUpperCase()}
                                </span>
                              )}
                              {j.edad != null && <span>{t("anos", { n: j.edad })}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="flex min-w-0 flex-col gap-10">
            {directo?.url && (
              <section aria-labelledby="partido-directo">
                <h2 id="partido-directo" className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">{t("verAqui")}</h2>
                <DirectoIncrustado src={directo.url} titulo={t("directoDe", { a: a.name, b: b.name })} />
              </section>
            )}

            <section aria-labelledby="partido-streams">
              <h2 id="partido-streams" className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">{t("dondeVerlo")}</h2>
              {p.streams.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">{t("sinStreams")}</p>
              ) : (
                <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
                  {p.streams.map((s) => {
                    const plat = s.plataforma === "otra" ? null : ICONO_PLATAFORMA[s.plataforma];
                    return (
                      <li key={s.url} className="border-b border-border last:border-0">
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2" style={plat ? { color: plat.color } : undefined}>
                            {plat ? (
                              <plat.Icono size={16} />
                            ) : (
                              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <path d="M10 9l5 3-5 3z" />
                              </svg>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{nombreIdioma(s.language)}</span>
                            <span className="block truncate text-xs text-muted">{plat?.nombre ?? new URL(s.url).hostname}</span>
                          </span>
                          {s.main && <span className="shrink-0 rounded bg-[rgb(var(--accent-rgb)/0.16)] px-1.5 py-0.5 text-[0.625rem] font-bold uppercase text-[var(--accent-text)]">{t("principal")}</span>}
                          {s.official && !s.main && <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[0.625rem] font-bold uppercase text-muted">{t("oficial")}</span>}
                          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                            <path d="M7 17L17 7M8 7h9v9" />
                          </svg>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {otros.length > 0 && (
              <section aria-labelledby="partido-otros">
                <h2 id="partido-otros" className="mb-4 font-heading text-xl font-bold uppercase tracking-wide">{t("otrosPartidos")}</h2>
                <ol className="overflow-hidden rounded-2xl border border-border bg-surface">
                  {otros.map((m) => (
                    <li key={m.id} className="border-b border-border last:border-0">
                      <Link href={hrefPartido(m.id)} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60">
                        <span className="w-14 shrink-0 text-xs">
                          {m.status === "running" ? (
                            <span className="font-bold uppercase text-[var(--danger)]">{t("enVivo")}</span>
                          ) : m.status === "past" ? (
                            <span className="font-bold uppercase text-muted">{t("final")}</span>
                          ) : (
                            <FechaLocal iso={m.date} opciones={{ day: "numeric", month: "short" }} className="font-semibold text-[var(--accent-text)]" />
                          )}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                          {[m.team1, m.team2].map((e, i) => (
                            <span key={i} className="flex items-center gap-2">
                              <Escudo logo={e.logo} name={e.name} size={18} />
                              <span className="min-w-0 flex-1 truncate">{e.name}</span>
                              {m.status !== "upcoming" && <span className="carreras-cifra text-muted">{e.score}</span>}
                            </span>
                          ))}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </aside>
        </div>
      </div>
    </FavoritosProvider>
  );
}
