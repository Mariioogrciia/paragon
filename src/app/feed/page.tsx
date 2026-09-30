import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getFeed } from "@/lib/feed";
import { getDestacadosSemana, getHitos, type DestacadosSemana } from "@/lib/comunidad";
import { ActivityFeed } from "@/components/ActivityFeed";
import { BackButton } from "@/components/BackButton";
import { SeccionTabs } from "@/components/SeccionTabs";
import { TituloEspecial } from "@/components/TituloEspecial";
import { TrophyIcon } from "@/components/TrophyIcon";
import { VerMas, hrefPagina, paginaDe } from "@/components/VerMas";

export const metadata = {
  title: "Comunidad - Paragon",
};

const TARJETA = "w-[82vw] max-w-[320px] shrink-0 snap-start rounded-[18px] border border-border bg-surface p-4 lg:w-auto lg:max-w-none";
const POR_PAGINA = 20;

/**
 * Comunidad. Antes era solo un muro de reseñas (la tabla `activity` apenas
 * tenía otra cosa): ahora también entran los platinos (los apunta la
 * sincronización), las insignias y títulos de liga, una pestaña "Todos" para
 * quien aún no tiene amigos en Paragon, y una barra lateral con lo mejor de
 * la semana.
 */
export default async function GlobalFeedPage({ searchParams }: { searchParams: Promise<{ ver?: string; pagina?: string }> }) {
  const t = await getTranslations("Descubrir.FeedPage");
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");
  const userId = session.user.id;

  const params = await searchParams;
  const global = params.ver === "todos";
  const pagina = paginaDe(params.pagina);
  const cuantos = POR_PAGINA * pagina;

  // Se piden `cuantos + 1` de cada tipo, se mezclan por fecha y se corta:
  // así la página enseña exactamente las N más recientes de las dos cosas.
  const [todasActividades, todosHitos] = await Promise.all([
    getFeed(userId, { global, limite: cuantos + 1 }),
    getHitos(userId, { global, limite: cuantos + 1 }).catch(() => []),
  ]);
  const mezcla = [
    ...todasActividades.map((a) => ({ fecha: new Date(a.createdAt).getTime(), id: a.id })),
    ...todosHitos.map((h) => ({ fecha: new Date(h.createdAt).getTime(), id: h.id })),
  ].sort((a, b) => b.fecha - a.fecha);
  const visibles = new Set(mezcla.slice(0, cuantos).map((m) => m.id));
  const activities = todasActividades.filter((a) => visibles.has(a.id));
  const hitos = todosHitos.filter((h) => visibles.has(h.id));
  const hayMas = mezcla.length > cuantos;
  const destacados = await getDestacadosSemana().catch(() => null);

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-7">
      <BackButton fallbackHref="/" />
      <SeccionTabs seccion="comunidad" />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-2 font-heading text-3xl font-bold">{t("titulo")}</h1>
          <p className="text-muted">{global ? t("subtituloTodos") : t("subtitulo")}</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-border p-1">
          {[
            { valor: false, href: "/feed", label: t("verAmigos") },
            { valor: true, href: "/feed?ver=todos", label: t("verTodos") },
          ].map((op) => (
            <Link
              key={op.href}
              href={op.href}
              aria-current={op.valor === global ? "page" : undefined}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                op.valor === global ? "text-[var(--background)]" : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
              style={op.valor === global ? { background: "var(--accent-grad)" } : undefined}
            >
              {op.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {activities.length > 0 || hitos.length > 0 ? (
            <>
              <ActivityFeed activities={activities} hitos={hitos} currentUserId={userId} sinTitulo />
              {hayMas && <VerMas href={hrefPagina("/feed", params, pagina + 1)} />}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
              <p>{t("vacio")}</p>
              {!global && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Link href="/feed?ver=todos" className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition-colors hover:border-accent hover:text-[var(--accent-text)]">
                    {t("verTodos")}
                  </Link>
                  <Link href="/amigos" className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition-colors hover:border-accent hover:text-[var(--accent-text)]">
                    {t("anadirAmigos")}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {destacados && <BarraSemana destacados={destacados} t={t} />}
      </div>
    </div>
  );
}

function Autor({ user }: { user: { handle: string | null; name: string | null; image: string | null; titulo: string | null } }) {
  return (
    <Link href={`/u/${user.handle}`} className="flex min-w-0 items-center gap-2 hover:underline">
      {user.image ? (
        <img loading="lazy" decoding="async" src={user.image} alt="" className="h-7 w-7 shrink-0 rounded-full" />
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
          {user.name?.[0]?.toUpperCase() ?? "?"}
        </span>
      )}
      <span className="truncate text-sm font-semibold">{user.name ?? `@${user.handle}`}</span>
    </Link>
  );
}

function BarraSemana({ destacados, t }: { destacados: DestacadosSemana; t: Awaited<ReturnType<typeof getTranslations>> }) {
  const { platino, cazadores, tendencias, sesiones } = destacados;
  return (
    // En móvil va ARRIBA, como tira deslizable: debajo quedaba tras 20
    // publicaciones y no la veía nadie. En escritorio, columna lateral.
    <aside className="-mx-4 order-first flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-7 sm:px-7 lg:order-none lg:sticky lg:top-20 lg:mx-0 lg:self-start lg:flex-col lg:gap-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
      {platino && (
        <section
          className={TARJETA}
          style={{
            borderColor: "color-mix(in srgb, var(--platinum) 45%, transparent)",
            background: "linear-gradient(160deg, color-mix(in srgb, var(--platinum) 12%, var(--surface)), var(--surface))",
          }}
        >
          <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: "var(--platinum)" }}>
            <TrophyIcon grade="platinum" size={13} /> {t("platinoSemana")}
          </h2>
          <Link href={`/u/${platino.user.handle}/${platino.gameId}`} className="group flex items-center gap-3">
            {platino.iconUrl && <img loading="lazy" decoding="async" src={platino.iconUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg" />}
            <div className="min-w-0">
              <p className="truncate font-bold group-hover:underline">{platino.juego}</p>
              {platino.rareza !== null && (
                <p className="text-xs text-muted">{t("platinoSemanaRareza", { rareza: platino.rareza.toLocaleString("es-ES", { maximumFractionDigits: 1 }) })}</p>
              )}
            </div>
          </Link>
          <div className="mt-3 flex items-center gap-2">
            <Autor user={platino.user} />
            <TituloEspecial clave={platino.user.titulo} pequeno />
          </div>
        </section>
      )}

      <section className={TARJETA}>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted">{t("cazadoresSemana")}</h2>
        {cazadores.length === 0 ? (
          <p className="text-sm text-muted">{t("semanaVacia")}</p>
        ) : (
          <ol className="flex flex-col gap-2.5">
            {cazadores.map((c, i) => (
              <li key={c.user.id} className="flex items-center gap-2">
                <span className="w-4 shrink-0 text-center font-heading text-sm font-bold" style={{ color: i === 0 ? "var(--gold)" : "var(--muted)" }}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <Autor user={c.user} />
                </div>
                <span className="shrink-0 text-xs font-bold text-muted">{t("trofeosN", { n: c.trofeos })}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {tendencias.length > 0 && (
        <section className={TARJETA}>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted">{t("tendencias")}</h2>
          <ul className="flex flex-col gap-2.5">
            {tendencias.map((j) => (
              <li key={j.gameId}>
                <Link href={`/juego/${j.igdbId ?? j.gameId}`} className="group flex items-center gap-2.5">
                  {j.iconUrl ? (
                    <img loading="lazy" decoding="async" src={j.iconUrl} alt="" className="h-9 w-9 shrink-0 rounded-md" />
                  ) : (
                    <span className="h-9 w-9 shrink-0 rounded-md bg-surface-2" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold group-hover:underline">{j.juego}</span>
                  <span className="shrink-0 text-xs text-muted">{t("cazandoN", { n: j.cazadores })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={TARJETA}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{t("proximasSesiones")}</h2>
          <Link href="/sesiones" className="text-xs font-bold text-[var(--accent-text)] hover:underline">
            {t("verTodas")}
          </Link>
        </div>
        {sesiones.length === 0 ? (
          <p className="text-sm text-muted">
            {t("sinSesiones")}{" "}
            <Link href="/sesiones" className="font-semibold text-[var(--accent-text)] hover:underline">
              {t("organizar")}
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sesiones.map((s) => (
              <li key={s.id}>
                <Link href={`/sesiones#${s.id}`} className="group flex items-center gap-2.5">
                  {s.iconUrl && <img loading="lazy" decoding="async" src={s.iconUrl} alt="" className="h-9 w-9 shrink-0 rounded-md" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold group-hover:underline">{s.trofeo}</p>
                    <p className="truncate text-xs text-muted">
                      {s.juego} · {s.fechaHora.toLocaleString("es-ES", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })}
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.6875rem] font-bold text-muted">{t("plazasLibres", { n: s.plazasLibres })}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
