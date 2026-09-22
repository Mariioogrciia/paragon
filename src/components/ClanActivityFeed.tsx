import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar } from "@/components/Avatar";

type ClanActivityItem = {
  id: string;
  type: "review" | "rating" | "platinum" | "favorite" | "new_game";
  rating: number | null;
  createdAt: Date;
  user: { handle: string | null; name: string | null; image: string | null };
  game: { id: string; title: string; iconUrl: string | null };
};

const ACCION: Record<ClanActivityItem["type"], string> = {
  platinum: "consiguió el platino de",
  rating: "valoró",
  review: "reseñó",
  favorite: "marcó como favorito",
  new_game: "empezó",
};

/**
 * Escaparate de "el clan está vivo" en la página del clan — mismo origen de
 * datos que el feed de amigos (`getClanActivity`, `lib/clans.ts`), pero sin
 * reacciones ni comentarios a propósito: esto es un vistazo, no una segunda
 * bandeja de entrada. Para interactuar de verdad (aplaudir, comentar), el
 * feed de amigos de siempre sigue siendo el sitio.
 */
export function ClanActivityFeed({ items }: { items: ClanActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
        Sin actividad todavía. En cuanto alguien del clan platine algo o valore un juego, sale aquí.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5"
        >
          <Avatar src={item.user.image} name={item.user.name ?? item.user.handle ?? "?"} size={36} />

          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8125rem]">
              <Link href={`/u/${item.user.handle}`} className="font-bold hover:text-[var(--accent-text)]">
                {item.user.name ?? item.user.handle}
              </Link>{" "}
              <span className="text-muted">{ACCION[item.type]}</span>{" "}
              <Link href={`/u/${item.user.handle}/${item.game.id}`} className="font-semibold hover:text-[var(--accent-text)]">
                {item.game.title}
              </Link>
              {item.type === "rating" && item.rating && (
                <span className="ml-1.5 text-[var(--gold)]">{"★".repeat(item.rating)}</span>
              )}
            </p>
            <p className="text-[0.6875rem] text-muted">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: es })}
            </p>
          </div>

          {item.game.iconUrl && (
            <Link href={`/u/${item.user.handle}/${item.game.id}`} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.game.iconUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
