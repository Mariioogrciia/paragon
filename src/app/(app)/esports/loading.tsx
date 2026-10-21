import { getTranslations } from "next-intl/server";

/**
 * /esports espera a PandaScore (tres listados y varias tablas): sin esto,
 * entrar desde el menú parecía no hacer nada. Misma forma que la página:
 * cabecera con filtros, franja de directos y bloques de competición.
 */
export default async function EsportsLoading() {
  const t = await getTranslations("Descubrir.EsportsPage");
  return (
    <div className="mx-auto max-w-[1240px] animate-pulse px-7 py-12 motion-reduce:animate-none" role="status" aria-busy="true">
      <span className="sr-only">{t("cargando")}</span>
      <div className="mb-6 h-3 w-16 rounded bg-surface-2/60" />
      <div className="mb-8 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 w-24 rounded-lg bg-surface-2/60" />
        ))}
      </div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="h-11 w-80 max-w-full rounded bg-surface-2/70" />
          <div className="h-4 w-64 max-w-full rounded bg-surface-2/50" />
        </div>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-20 rounded-full bg-surface-2/60" />
          ))}
        </div>
      </div>
      <div className="mt-8 mb-4 h-6 w-40 rounded bg-surface-2/60" />
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 w-[17.5rem] shrink-0 rounded-2xl border border-border bg-surface" />
        ))}
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="mt-7 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="h-12 border-b border-border bg-surface-2/50" />
          <div className="grid md:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              {[0, 1, 2].map((j) => (
                <div key={j} className="flex items-center gap-3 border-b border-border px-5 py-4 last:border-0">
                  <div className="h-8 w-12 rounded bg-surface-2/60" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 rounded bg-surface-2/60" />
                    <div className="h-4 w-2/5 rounded bg-surface-2/50" />
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden border-l border-border md:block" />
          </div>
        </div>
      ))}
    </div>
  );
}
