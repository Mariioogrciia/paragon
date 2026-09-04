/**
 * Único punto de entrada de toda la app sin loading.tsx propio: cubre la
 * portada (que encadena `getLibrary` + un `Promise.all` de 6 llamadas) y
 * de paso cualquier otra ruta que no tenga su propio esqueleto más
 * específico (ver `juego/[id]/loading.tsx` y `u/[handle]/loading.tsx` para
 * los que sí lo tienen). A propósito genérico — una forma de "tarjetas en
 * cuadrícula" que no desentona en ninguna página, no un calco exacto de la
 * portada.
 */
export default function RootLoading() {
  return (
    <div className="animate-pulse space-y-9">
      <div className="flex flex-wrap items-end gap-6">
        <div className="space-y-2.5">
          <div className="h-3 w-40 rounded bg-surface-2/60" />
          <div className="h-10 w-64 rounded bg-surface-2/60" />
        </div>
        <div className="ml-auto h-10 w-40 rounded-[10px] bg-surface-2/60" />
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[130px] rounded-[20px] bg-surface-2/60" />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[280px] rounded-[18px] bg-surface-2/50" />
        ))}
      </div>
    </div>
  );
}
