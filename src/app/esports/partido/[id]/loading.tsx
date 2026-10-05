import { getTranslations } from "next-intl/server";

/**
 * La ficha pide cuatro cosas a PandaScore (partido, plantillas, tabla y
 * otros partidos): al pulsar un partido, esto responde al momento con la
 * forma de la ficha (ruta, marcador, tabla y columna lateral).
 */
export default async function PartidoLoading() {
  const t = await getTranslations("Descubrir.EsportsPage");
  return (
    <div className="mx-auto max-w-[1240px] animate-pulse px-7 py-12 motion-reduce:animate-none" role="status" aria-busy="true">
      <span className="sr-only">{t("cargando")}</span>
      <div className="mb-4 h-3 w-16 rounded bg-surface-2/60" />
      <div className="flex items-center gap-3">
        <div className="h-7 w-14 rounded bg-surface-2/70" />
        <div className="h-4 w-72 max-w-full rounded bg-surface-2/60" />
      </div>
      <div className="mt-3 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-6 w-24 rounded bg-surface-2/50" />
        ))}
      </div>
      <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 px-5 py-10 sm:px-10">
          <div className="flex items-center gap-5">
            <div className="h-[88px] w-[88px] shrink-0 rounded-lg bg-surface-2/70" />
            <div className="hidden h-6 w-40 rounded bg-surface-2/60 sm:block" />
          </div>
          <div className="h-14 w-28 rounded bg-surface-2/70" />
          <div className="flex flex-row-reverse items-center gap-5">
            <div className="h-[88px] w-[88px] shrink-0 rounded-lg bg-surface-2/70" />
            <div className="hidden h-6 w-40 rounded bg-surface-2/60 sm:block" />
          </div>
        </div>
        <div className="h-14 border-t border-border bg-surface-2/40" />
      </div>
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="h-80 rounded-2xl border border-border bg-surface" />
        <div className="space-y-10">
          <div className="aspect-video rounded-2xl border border-border bg-surface" />
          <div className="h-48 rounded-2xl border border-border bg-surface" />
        </div>
      </div>
    </div>
  );
}
