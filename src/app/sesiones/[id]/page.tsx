import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { BackButton } from "@/components/BackButton";
import { listarSesiones } from "@/lib/sesiones";
import { idiomaActual } from "@/lib/trofeosIdioma";
import { AccionesSesion } from "../AccionesSesion";
import { Plazas } from "../Plazas";

export const metadata = { title: "Sesión · Paragon" };


/**
 * Ficha de una sesión: todo lo que hace falta para decidir si unirte (juego y
 * consola, trofeo, cuándo, quién organiza, quién está dentro y cuántas
 * plazas quedan) y el botón para hacerlo.
 */
export default async function SesionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const t = await getTranslations("Shell.Sesiones");
  const locale = await getLocale();

  const [s] = await listarSesiones(userId, await idiomaActual(), id).catch(() => []);
  if (!s) notFound();

  const ahora = new Date().getTime();
  const empezada = s.fechaHora.getTime() <= ahora;
  const terminada = s.fechaHora.getTime() < ahora - 2 * 60 * 60 * 1000;
  const nombreDe = (p: { name: string | null; handle: string | null }) => p.name?.trim().split(/\s+/)[0] || (p.handle ? `@${p.handle}` : "?");
  const personas = [{ ...s.anfitrion, organiza: true }, ...s.participantes.map((p) => ({ ...p, organiza: false }))];

  const estado = s.cancelada ? t("cancelada") : terminada ? t("terminada") : empezada ? t("empezada") : null;

  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      <BackButton fallbackHref="/sesiones" />

      <header className="flex gap-4 rounded-[18px] border border-border bg-surface p-4 sm:p-5">
        <Link href={`/juego/${s.juego.id}`} className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
          {s.juego.iconUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.juego.iconUrl} alt="" className="h-full w-full object-cover" />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            <Link href={`/juego/${s.juego.id}`} className="hover:underline">
              {s.juego.titulo}
            </Link>{" "}
            · <span className="rounded border border-border px-1.5 py-0.5">{s.juego.deviceLabel}</span>
          </p>
          <h1 className="mt-1.5 flex items-start gap-2 font-heading text-2xl font-bold leading-tight">
            {s.trofeoInfo?.iconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.trofeoInfo.iconUrl} alt="" className="mt-0.5 h-8 w-8 shrink-0 rounded" />
            )}
            <span>{s.trofeo}</span>
          </h1>
          {s.trofeoInfo?.detail && <p className="mt-1 text-sm text-muted">{s.trofeoInfo.detail}</p>}
          <p className="mt-2 text-sm font-semibold">
            📅{" "}
            {s.fechaHora.toLocaleString(locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })}
            {estado && <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{estado}</span>}
          </p>
        </div>
      </header>

      {s.descripcion && (
        <section className="rounded-[18px] border border-border bg-surface p-4 sm:p-5">
          <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">{t("detalles")}</h2>
          <p className="whitespace-pre-line text-sm">{s.descripcion}</p>
        </section>
      )}

      <section className="rounded-[18px] border border-border bg-surface p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">{t("quienEsta")}</h2>
          <span className="flex items-center gap-2">
            <Plazas ocupadas={s.ocupadas} total={s.plazasTotales} grande />
            <span className="text-sm text-muted">· {t("plazasLibres", { libres: s.libres })}</span>
          </span>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {personas.map((p) => (
            <li key={p.userId}>
              <Link
                href={p.handle ? `/u/${p.handle}` : "#"}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2 transition-colors hover:border-accent/60"
              >
                <Avatar src={p.image} name={nombreDe(p)} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {nombreDe(p)}
                    {p.userId === userId && <span className="ml-1 font-normal text-muted">({t("tu")})</span>}
                  </span>
                  {p.handle && <span className="block truncate text-xs text-muted">@{p.handle}</span>}
                </span>
                {"ayuda" in p && p.ayuda && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[0.6875rem] font-bold text-muted">{t("ayuda")}</span>
                )}
                {p.organiza && (
                  <span className="rounded-full px-2 py-0.5 text-[0.6875rem] font-bold text-[var(--accent-text)]" style={{ background: "rgb(var(--accent-rgb) / 0.14)" }}>
                    {t("anfitrion")}
                  </span>
                )}
              </Link>
            </li>
          ))}
          {Array.from({ length: s.libres }, (_, i) => (
            <li
              key={`libre-${i}`}
              className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-border" aria-hidden>
                ＋
              </span>
              {t("plazaLibre")}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border bg-surface p-4 sm:p-5">
        {!userId ? (
          <p className="text-sm text-muted">{t("entra")}</p>
        ) : s.cancelada || empezada ? (
          <p className="text-sm text-muted">{t("yaNoAbierta")}</p>
        ) : (
          <>
            <p className="text-sm text-muted">
              {s.soyAnfitrion
                ? t("eresAnfitrion")
                : s.estoyApuntado
                  ? t("estasDentro")
                  : s.libres === 0
                    ? t("sinPlazas")
                    : s.yaLoTengo
                      ? t("yaLoTienesAyuda")
                      : s.loTengo
                      ? t("puedesUnirte")
                      : t("noLoTienes", { consola: s.juego.deviceLabel })}
            </p>
            <AccionesSesion sessionId={s.id} soyAnfitrion={s.soyAnfitrion} estoyApuntado={s.estoyApuntado} llena={s.libres === 0} paraAyudar={s.yaLoTengo} />
          </>
        )}
      </section>
    </div>
  );
}
