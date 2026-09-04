import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  dlcs: { name: string; coverUrl?: string; releaseDate?: string }[];
}

export function GameDlcs({ dlcs }: Props) {
  if (dlcs.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="text-xl font-bold mb-4">Contenido adicional</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
        {dlcs.map((dlc) => (
          <div key={dlc.name} className="w-[180px] shrink-0 snap-start flex flex-col gap-2">
            <div className="w-full aspect-[3/4] rounded-lg overflow-hidden border border-border shadow-md bg-muted/20 relative">
              {dlc.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dlc.coverUrl} alt={dlc.name} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-muted">
                  Sin portada
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm truncate" title={dlc.name}>{dlc.name}</span>
              {dlc.releaseDate && (
                <span className="text-xs text-muted capitalize">
                  {format(new Date(dlc.releaseDate), "d 'de' MMMM", { locale: es })}...
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
