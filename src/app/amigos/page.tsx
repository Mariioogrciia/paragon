import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { acceptFriendAction, removeFriendAction } from "@/app/actions";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { AddFriendForm } from "@/components/forms/Forms";
import { TrophyIcon } from "@/components/TrophyIcon";
import {
  getProfileByUserId,
  listFriends,
  listPendingRequests,
} from "@/lib/profiles";
import { getParagonLevels } from "@/lib/paragonLevel";
import { paragonLevelFromXp } from "@/lib/level";
import { clasificacionAmigos, getPeriodRankings } from "@/lib/rankings";
import { BackButton } from "@/components/BackButton";
import { PLATFORM_LABEL } from "@/lib/types";
import { ConfirmForm } from "@/components/ui/ConfirmForm";

import { juegosEnComun, misRetos } from "@/lib/coop";
import { PlatinarJuntos } from "@/components/PlatinarJuntos";
import { misRetosAmigos } from "@/lib/retosAmigos";
import { RetosAmigos } from "@/components/RetosAmigos";

export const metadata = { title: "Amigos · Paragon" };


export default async function AmigosPage() {
  const t = await getTranslations("Perfil");
  const locale = await getLocale();
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const [mio, amigos, pendientes] = await Promise.all([
    getProfileByUserId(session.user.id),
    listFriends(session.user.id),
    listPendingRequests(session.user.id),
  ]);

  // Clasificación: yo y cada rival con alguna cuenta vinculada, por platinos.
  const tengoCuenta = (mio?.accounts.length ?? 0) > 0;
  const contendientes = [
    ...(tengoCuenta ? [session.user.id] : []),
    ...amigos.map((a) => a.userId),
  ];

  // Tres consultas para TODA la clasificacion, independientemente de cuanta
  // gente haya. Antes esto cargaba, por cada participante, su perfil + su
  // biblioteca ENTERA + su nivel: del orden de 25-30 consultas para 5
  // personas, lanzadas todas a la vez contra un pool de 5 conexiones. Era la
  // pagina con mas papeletas de atascarlo (ver db/index.ts).
  const [filasClasificacion, niveles, periodos] = await Promise.all([
    clasificacionAmigos(contendientes),
    getParagonLevels(contendientes),
    getPeriodRankings(contendientes),
  ]);
  // "Platinar juntos" solo tiene sentido con amigos: vivía en el
  // Planificador, lejos de ellos. Si la tabla fallara, la página sale igual.
  const [retos, comunes, retosAmigos] = await Promise.all([
    misRetos(session.user.id).catch(() => []),
    juegosEnComun(session.user.id).catch(() => []),
    misRetosAmigos(session.user.id).catch(() => []),
  ]);

  const ranking = filasClasificacion
    .map((fila) => ({
      userId: fila.userId,
      handle: fila.handle,
      name: fila.name ?? fila.handle ?? t("AmigosPage.sinNombre"),
      avatarUrl: fila.avatarUrl ?? undefined,
      trophyLevel: fila.trophyLevel ?? undefined,
      esMio: fila.userId === session.user!.id,
      stats: {
        platinos: fila.platinos,
        trofeos: fila.trofeos,
        juegos: fila.juegos,
        completadoMedio: fila.completadoMedio,
      },
      paragon: niveles.get(fila.userId) ?? paragonLevelFromXp(0),
    }))
    .sort((a, b) => b.paragon.xp - a.paragon.xp);

  // Marcador de estadio (rediseño del 1 oct 2026): mismas secciones y
  // acciones que antes; los bloques son paneles negros de marcador
  // (`.marcador`, una isla oscura que redefine los tokens) y las cifras van
  // en puntos luminosos solo cuando son números.
  const periodosMarcador = [
    { title: t("AmigosPage.periodoSemanal"), rows: periodos.semanal },
    { title: t("AmigosPage.periodoMensual"), rows: periodos.mensual },
  ];

  return (
    <div>
      <BackButton fallbackHref="/" />
      <h1 className="font-heading text-[clamp(2rem,6vw,2.625rem)] font-bold uppercase leading-none">{t("AmigosPage.titulo")}</h1>
      <p className="mt-2.5 text-[0.9375rem] text-muted">{t("AmigosPage.subtitulo")}</p>

      <div className={`mt-7 grid grid-cols-1 gap-4 ${pendientes.length > 0 ? "lg:grid-cols-[1fr_420px]" : ""}`}>
        <section className="marcador marcador-panel p-[22px]">
          <h2 className="marcador-rotulo mb-3.5">{t("AmigosPage.añadirTitulo")}</h2>
          <AddFriendForm />
          <p className="mt-3 text-[0.8125rem] text-muted">{t("AmigosPage.añadirAyuda")}</p>
        </section>

        {pendientes.length > 0 && (
          <section className="marcador marcador-panel p-[22px]">
            <h2 className="marcador-rotulo mb-3.5 flex items-center gap-2.5">
              {t("AmigosPage.solicitudesTitulo")}
              <span className="marcador-led text-2xl leading-none">{pendientes.length}</span>
            </h2>

            <ul className="space-y-3">
              {pendientes.map((p) => (
                <li key={p.userId} className="flex items-center gap-3">
                  <Avatar src={p.avatarUrl ?? p.image} name={p.handle ?? "?"} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">@{p.handle}</p>
                    {p.trophyLevel !== null && (
                      <p className="mt-0.5 text-xs text-muted">{t("AmigosPage.solicitudNivel", { nivel: p.trophyLevel })}</p>
                    )}
                  </div>

                  <form action={acceptFriendAction}>
                    <input type="hidden" name="requesterId" value={p.userId} />
                    <button
                      className="rounded-[9px] px-3.5 py-2 text-[0.8125rem] font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb)/0.4)]"
                      style={{ background: "var(--accent-grad)" }}
                    >
                      {t("AmigosPage.aceptar")}
                    </button>
                  </form>

                  <form action={removeFriendAction}>
                    <input type="hidden" name="friendId" value={p.userId} />
                    <button className="rounded-md px-1.5 py-1 text-[0.8125rem] font-semibold text-muted transition-colors hover:bg-[var(--surface-2)] hover:text-foreground">
                      {t("AmigosPage.rechazar")}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <section className="marcador marcador-panel mt-6 overflow-hidden" aria-labelledby="marcador-clasificacion">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <h2 id="marcador-clasificacion" className="marcador-rotulo text-lg">{t("AmigosPage.clasificacionTitulo")}</h2>
          <span className="text-[0.8125rem] text-muted">
            {t("AmigosPage.clasificacionSubtitulo", { n: ranking.length - (tengoCuenta ? 1 : 0) })}
          </span>
        </div>

        {ranking.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">{t("AmigosPage.clasificacionVacia")}</p>
        ) : (
          <>
            <div className="marcador-fila marcador-cabecera" aria-hidden="true">
              <span>{t("AmigosPage.colPos")}</span>
              <span className="col-span-2">{t("AmigosPage.colJugador")}</span>
              <span className="text-right">{t("AmigosPage.colXp")}</span>
              <span className="text-right">{t("AmigosPage.statPlatinos")}</span>
              <span className="text-right">{t("AmigosPage.statTrofeos")}</span>
              <span className="text-right">{t("AmigosPage.statMedio")}</span>
              <span />
            </div>
            <ol>
              {ranking.map((r, i) => (
                <li key={r.userId} className="marcador-fila" data-mio={r.esMio || undefined}>
                  <span className={`marcador-led text-[1.75rem] leading-none sm:text-[2rem] ${i === 0 ? "marcador-led-oro" : ""}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <Avatar src={r.avatarUrl} name={r.name} size={44} />

                  <div className="min-w-0">
                    <p className="flex min-w-0 items-center gap-2 text-[0.9375rem] font-semibold">
                      <span className="truncate">{r.name}</span>
                      {r.esMio && <span className="marcador-tu shrink-0">{t("AmigosPage.tuEtiqueta")}</span>}
                    </p>
                    {r.handle && (
                      <p className="mt-0.5 truncate text-xs text-muted">
                        @{r.handle} · {t("AmigosPage.solicitudNivel", { nivel: r.paragon.level })}
                      </p>
                    )}
                  </div>

                  <div className="marcador-cifras">
                    <span className="marcador-dato">
                      <span className="marcador-led text-[1.125rem] leading-none sm:text-[1.625rem]">{r.paragon.xp.toLocaleString(locale)}</span>
                      <span className="marcador-etiqueta sm:hidden">{t("AmigosPage.colXp")}</span>
                    </span>
                    <span className="marcador-dato">
                      <span className="marcador-led marcador-led-platino flex items-center gap-1.5 text-[1.125rem] leading-none sm:text-[1.625rem]">
                        {r.stats.platinos}
                      </span>
                      <span className="marcador-etiqueta flex items-center gap-1 sm:hidden">
                        <TrophyIcon grade="platinum" size={11} /> {t("AmigosPage.statPlatinos")}
                      </span>
                    </span>
                    <span className="marcador-dato">
                      <span className="font-heading text-[1.0625rem] font-bold tabular-nums">{r.stats.trofeos.toLocaleString(locale)}</span>
                      <span className="marcador-etiqueta sm:hidden">{t("AmigosPage.statTrofeos")}</span>
                    </span>
                    <span className="marcador-dato">
                      <span className="font-heading text-[1.0625rem] font-bold tabular-nums">{r.stats.completadoMedio}%</span>
                      <span className="marcador-etiqueta sm:hidden">{t("AmigosPage.statMedio")}</span>
                    </span>
                  </div>

                  <div className="marcador-acciones">
                    {!r.esMio && r.handle && (
                      <>
                        <Link
                          href={`/comparar/${r.handle}`}
                          className="rounded-[9px] border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2 text-[0.8125rem] font-semibold text-[var(--accent-text)] transition-colors hover:border-[rgb(var(--accent-rgb)/0.5)]"
                        >
                          {t("AmigosPage.comparar")}
                        </Link>
                        <Link
                          href={`/u/${r.handle}`}
                          className="rounded-md px-1.5 py-2 text-[0.8125rem] font-semibold text-muted transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
                        >
                          {t("AmigosPage.perfil")}
                        </Link>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <p className="border-t border-[var(--border)] px-5 py-2.5 text-right text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted sm:px-6">
              {t("AmigosPage.marcadorPie")}
            </p>
          </>
        )}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {periodosMarcador.map((periodo) => (
          <div key={periodo.title} className="marcador marcador-panel p-5">
            <h2 className="marcador-rotulo mb-3">{periodo.title}</h2>
            {periodo.rows.length === 0 ? (
              <p className="text-sm text-muted">{t("AmigosPage.periodoVacio")}</p>
            ) : (
              <ol className="divide-y divide-[var(--border)]">
                {periodo.rows.map((row, index) => (
                  <li key={row.userId} className="flex items-center gap-3 py-2 text-sm">
                    <span className={`marcador-led w-8 text-lg leading-none ${index === 0 ? "marcador-led-oro" : ""}`}>{String(index + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{row.name ?? `@${row.handle ?? "usuario"}`}</span>
                    <span className="flex items-baseline gap-1.5">
                      <span className="marcador-led text-xl leading-none">{row.total}</span>
                      <span className="marcador-etiqueta">{t("AmigosPage.statTrofeos")}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </section>

      {amigos.length > 0 && (
        <div className="mt-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <section className="marcador marcador-panel p-5">
            <div className="mb-3.5">
              <h2 className="marcador-rotulo">{t("AmigosPage.tusAmigosTitulo")}</h2>
              <p className="mt-1 text-[0.8125rem] text-muted">{t("AmigosPage.tusAmigosAyuda")}</p>
            </div>

            {/*
              Formulario GET, pero SIN envolver la lista: cada casilla se
              asocia con `form="comparar-grupo"` en vez de ser descendiente de
              este `<form>`, porque cada fila también tiene su propio
              formulario pequeño para "Quitar" (`removeFriendAction`), y HTML
              no admite formularios anidados. El atributo `form` en el input
              es justo lo que existe para este caso: lo suma a la petición de
              un formulario que no es su ancestro.

              Con una sola casilla marcada, /comparar redirige a la
              comparativa 1 a 1 de siempre; con dos o más, a la de grupo.
            */}
            <form id="comparar-grupo" action="/comparar" method="get" />

            <ul className="divide-y divide-[var(--border)]">
              {amigos.map((a) => (
                <li key={a.userId} className="flex items-center gap-3 py-3">
                  {a.handle && (
                    <input
                      type="checkbox"
                      form="comparar-grupo"
                      name="con"
                      value={a.handle}
                      className="h-4 w-4 shrink-0 accent-accent"
                      aria-label={t("AmigosPage.checkboxAria", { handle: a.handle })}
                    />
                  )}

                  <Avatar src={a.avatarUrl ?? a.image} name={a.handle ?? "?"} />

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/u/${a.handle}`}
                      // `block`: `truncate` (overflow-hidden + ellipsis +
                      // nowrap) NO recorta en un elemento inline, y un <a> lo
                      // es por defecto. Sin esto un nombre largo se salia de la
                      // tarjeta (medido: 42px fuera con "Mario Garcia Romero").
                      className="block truncate text-sm font-semibold hover:text-[var(--accent-text)]"
                    >
                      {a.displayName ?? `@${a.handle}`}
                    </Link>
                    <p className="text-xs text-muted">
                      @{a.handle}
                      {a.trophyLevel !== null && t("AmigosPage.amigoNivel", { nivel: a.trophyLevel })}
                    </p>
                    {a.accounts.length > 0 && (
                      <p className="mt-0.5 truncate text-[0.6875rem] text-muted/80">
                        {a.accounts.map((acc) => `${PLATFORM_LABEL[acc.platform]}: ${acc.username}`).join(" · ")}
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/comparar/${a.handle}`}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-[rgb(var(--accent-rgb)/0.5)] hover:bg-[var(--surface-2)]"
                  >
                    {t("AmigosPage.comparar")}
                  </Link>

                  <ConfirmForm
                    action={removeFriendAction}
                    hidden={{ friendId: a.userId }}
                    title={t("AmigosPage.quitarTitulo")}
                    message={t("AmigosPage.quitarMensaje", { nombre: a.displayName ?? `@${a.handle}` })}
                    confirmLabel={t("AmigosPage.quitarConfirmar")}
                    triggerClassName="rounded-md px-1.5 py-1 text-sm text-muted transition-colors hover:bg-[var(--surface-2)] hover:text-danger"
                  >
                    {t("AmigosPage.quitar")}
                  </ConfirmForm>
                </li>
              ))}
            </ul>

            <button
              type="submit"
              form="comparar-grupo"
              className="mt-3 rounded-[10px] px-4 py-2.5 text-[0.8125rem] font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgb(var(--accent-rgb)/0.4)]"
              style={{ background: "var(--accent-grad)" }}
            >
              {t("AmigosPage.compararSeleccionados")}
            </button>
          </section>

          <div className="marcador marcador-envoltura">
            <RetosAmigos
              retos={retosAmigos}
              miId={session.user.id}
              amigos={amigos.map((a) => ({
                userId: a.userId,
                nombre: a.displayName?.trim().split(/\s+/)[0] || `@${a.handle ?? "?"}`,
                handle: a.handle,
                avatar: a.avatarUrl ?? a.image,
              }))}
            />
          </div>
        </div>
      )}

      {amigos.length > 0 && (
        <div className="marcador marcador-envoltura mt-6">
          <PlatinarJuntos retos={retos} comunes={comunes} />
        </div>
      )}
    </div>
  );
}
