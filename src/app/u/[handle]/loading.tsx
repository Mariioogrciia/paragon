export default function PerfilLoading() {
  return (
    <div className="-mx-7 -mt-9 animate-pulse">
      <div className="relative overflow-hidden border-b border-border bg-surface-2/30">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end gap-5 px-7 pb-8 pt-10">
          <div className="h-[92px] w-[92px] rounded-full bg-surface-2" />
          <div className="min-w-0 space-y-3 pb-2">
            <div className="h-8 w-48 rounded bg-surface-2" />
            <div className="h-4 w-32 rounded bg-surface-2" />
            <div className="h-3 w-20 rounded bg-surface-2" />
          </div>
          <div className="ml-auto h-10 w-32 rounded-[10px] bg-surface-2" />
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] space-y-9 px-7 pb-24 pt-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[104px] rounded-[18px] bg-surface-2/50" />
          ))}
        </div>

        <section>
          <div className="mb-4 flex flex-wrap items-center gap-3.5">
            <div className="h-8 w-40 rounded bg-surface-2/50" />
            <div className="h-4 w-64 rounded bg-surface-2/50" />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="h-10 flex-1 min-w-[220px] rounded-xl bg-surface-2/50" />
            <div className="h-10 w-48 rounded-xl bg-surface-2/50" />
            <div className="h-10 w-[38px] rounded-[9px] bg-surface-2/50" />
            <div className="h-10 w-20 rounded-[9px] bg-surface-2/50 ml-2" />
          </div>
          
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
             <div className="h-10 w-[300px] rounded-xl bg-surface-2/50" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-[280px] rounded-[18px] bg-surface-2/50" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
