/**
 * Esta ficha pide en paralelo hasta 9 fuentes (base propia, IGDB, ITAD,
 * reseñas, dificultad comunitaria...) — sin esqueleto, una conexión lenta
 * se veía como página congelada, no como página cargando. Misma forma que
 * el layout real (banner -mx-7 -mt-9, grid 1fr + sidebar de 300px) para que
 * no haya salto al llegar el contenido de verdad.
 */
export default function JuegoLoading() {
  return (
    <div className="-mx-7 -mt-9 animate-pulse">
      <div
        className="relative overflow-hidden border-b border-border"
        style={{ background: "linear-gradient(135deg, #2b1b3f 0%, #16233d 55%, #0b1018 100%)" }}
      >
        <div className="mx-auto max-w-[1240px] px-7 pb-9 pt-7">
          <div className="mb-4 h-3 w-16 rounded bg-white/10" />
          <div className="mt-2 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="h-11 w-72 max-w-full rounded bg-white/10" />
              <div className="flex flex-wrap gap-3">
                <div className="h-4 w-20 rounded bg-white/10" />
                <div className="h-4 w-24 rounded bg-white/10" />
                <div className="h-4 w-32 rounded bg-white/10" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <div className="h-6 w-16 rounded-full bg-white/10" />
                <div className="h-6 w-20 rounded-full bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] gap-9 px-7 pb-24 pt-6 lg:grid lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="min-w-0 space-y-9">
          <div className="space-y-2.5">
            <div className="h-4 w-full rounded bg-surface-2/60" />
            <div className="h-4 w-full rounded bg-surface-2/60" />
            <div className="h-4 w-2/3 rounded bg-surface-2/60" />
          </div>

          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[180px] w-[320px] shrink-0 rounded-[14px] bg-surface-2/60" />
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[104px] rounded-[20px] bg-surface-2/60" />
            ))}
          </div>

          <div className="h-[220px] rounded-[18px] bg-surface-2/60" />
        </div>

        <div className="mt-9 space-y-4 lg:mt-0">
          <div className="h-8 w-40 rounded bg-surface-2/60" />
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 w-full rounded bg-surface-2/60" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
