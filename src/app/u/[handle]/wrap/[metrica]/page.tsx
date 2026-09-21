import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackButton } from "@/components/BackButton";
import { coverGradient } from "@/lib/design";
import { getLibrary, getProfileByHandle } from "@/lib/profiles";
import {
  desdeDeRango,
  rankingGeneros,
  rankingHoras,
  rankingTrofeosPorJuego,
  type RangoFecha,
} from "@/lib/personalRankings";

const METRICAS = ["horas", "trofeos", "generos"] as const;
type Metrica = (typeof METRICAS)[number];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; metrica: string }>;
}) {
  const { metrica } = await params;
  const m = METRICAS.includes(metrica as Metrica) ? (metrica as Metrica) : "trofeos";
  const t = await getTranslations("Perfil");
  const titulos: Record<Metrica, string> = {
    horas: t("WrapRankingPage.tituloHoras"),
    trofeos: t("WrapRankingPage.tituloTrofeos"),
    generos: t("WrapRankingPage.tituloGeneros"),
  };
  return { title: `${titulos[m]} · Paragon` };
}

export default async function WrapRankingPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string; metrica: string }>;
  searchParams: Promise<{ rango?: string }>;
}) {
  const { handle, metrica } = await params;
  if (!METRICAS.includes(metrica as Metrica)) notFound();
  const m = metrica as Metrica;
  const t = await getTranslations("Perfil");

  const TITULO: Record<Metrica, string> = {
    horas: t("WrapRankingPage.tituloHoras"),
    trofeos: t("WrapRankingPage.tituloTrofeos"),
    generos: t("WrapRankingPage.tituloGeneros"),
  };

  const RANGOS: { valor: RangoFecha; etiqueta: string }[] = [
    { valor: "7d", etiqueta: t("WrapRankingPage.rango7d") },
    { valor: "30d", etiqueta: t("WrapRankingPage.rango30d") },
    { valor: "90d", etiqueta: t("WrapRankingPage.rango90d") },
    { valor: "anio", etiqueta: t("WrapRankingPage.rangoAnio") },
    { valor: "todo", etiqueta: t("WrapRankingPage.rangoTodo") },
  ];

  const { rango: rangoParam } = await searchParams;
  const rango: RangoFecha = (RANGOS.find((r) => r.valor === rangoParam)?.valor ?? "todo") as RangoFecha;
  const desde = desdeDeRango(rango);

  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  let filas: { clave: string; etiqueta: string; valor: number; iconUrl?: string; href?: string }[] = [];
  let unidad = "";

  if (m === "horas") {
    const { games } = await getLibrary(profile);
    filas = rankingHoras(games, desde).map((f) => ({
      clave: f.gameId,
      etiqueta: f.titulo,
      valor: f.valor,
      iconUrl: f.iconUrl,
      href: `/u/${handle}/${f.gameId}`,
    }));
    unidad = t("WrapRankingPage.unidadHoras");
  } else if (m === "trofeos") {
    const filas2 = await rankingTrofeosPorJuego(profile.userId, desde);
    filas = filas2.map((f) => ({
      clave: f.gameId,
      etiqueta: f.titulo,
      valor: f.valor,
      iconUrl: f.iconUrl,
      href: `/u/${handle}/${f.gameId}`,
    }));
    unidad = t("WrapRankingPage.unidadTrofeos");
  } else {
    const filas3 = await rankingGeneros(profile.userId, desde);
    filas = filas3.map((f) => ({ clave: f.genero, etiqueta: f.genero, valor: f.valor }));
    unidad = t("WrapRankingPage.unidadTrofeos");
  }

  const max = filas[0]?.valor ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <BackButton fallbackHref={`/u/${handle}`} label={t("WrapRankingPage.volverAlPerfil")} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-[2rem] font-bold uppercase leading-none">{TITULO[m]}</h1>
          <div className="flex flex-wrap gap-1.5">
            {METRICAS.map((otra) => (
              <Link
                key={otra}
                href={`/u/${handle}/wrap/${otra}${rango !== "todo" ? `?rango=${rango}` : ""}`}
                className={`rounded-full border px-3 py-1.5 text-[0.6875rem] font-bold uppercase tracking-wide transition-colors ${
                  otra === m
                    ? "border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.14)] text-[var(--accent-text)] hover:bg-[rgb(var(--accent-rgb)/0.22)]"
                    : "border-[var(--border)] text-muted hover:text-foreground"
                }`}
              >
                {otra === "horas" ? t("WrapRankingPage.pestañaHoras") : otra === "trofeos" ? t("WrapRankingPage.pestañaTrofeos") : t("WrapRankingPage.pestañaGeneros")}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {RANGOS.map((r) => (
            <Link
              key={r.valor}
              href={`/u/${handle}/wrap/${m}${r.valor !== "todo" ? `?rango=${r.valor}` : ""}`}
              className={`rounded-full border px-3 py-1.5 text-[0.6875rem] font-bold uppercase tracking-wide transition-all ${
                r.valor === rango
                  ? "border-transparent text-[var(--background)] hover:-translate-y-0.5"
                  : "border-[var(--border)] text-muted hover:text-foreground"
              }`}
              style={r.valor === rango ? { background: "var(--accent-grad)" } : undefined}
            >
              {r.etiqueta}
            </Link>
          ))}
        </div>

        {m === "horas" && (
          <p className="mt-3 text-xs text-muted">
            {t("WrapRankingPage.notaHoras")}
          </p>
        )}
      </div>

      {filas.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          {t("WrapRankingPage.vacio")}
        </p>
      ) : (
        <ol className="space-y-2">
          {filas.map((f, i) => (
            <li key={f.clave} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <span className="w-6 shrink-0 text-center font-heading text-sm font-bold text-muted">{i + 1}</span>

              {m !== "generos" && (
                <span
                  className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-cover bg-center"
                  style={{ background: f.iconUrl ? `url(${f.iconUrl}) center/cover` : coverGradient(f.clave) }}
                />
              )}

              <div className="min-w-0 flex-1">
                {f.href ? (
                  <Link href={f.href} className="block truncate text-[0.875rem] font-semibold hover:underline" title={f.etiqueta}>
                    {f.etiqueta}
                  </Link>
                ) : (
                  <span className="block truncate text-[0.875rem] font-semibold" title={f.etiqueta}>
                    {f.etiqueta}
                  </span>
                )}
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${max > 0 ? Math.round((f.valor / max) * 100) : 0}%`, background: "var(--accent-grad-h)" }}
                  />
                </div>
              </div>

              <span className="shrink-0 font-heading text-sm font-bold">
                {f.valor.toLocaleString("es-ES")} {unidad}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
