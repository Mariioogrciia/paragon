import Link from "next/link";
import { getFeed } from "@/lib/feed";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { addActivityCommentAction, toggleActivityReactionAction } from "@/app/actions";

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 mt-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={star <= rating ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={star <= rating ? "text-yellow-500" : "text-muted"}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      ))}
    </div>
  );
}

export function ActivityFeed({ activities, currentUserId }: { activities: any[], currentUserId: string | null }) {

  if (activities.length === 0) {
    return (
      <div className="py-12 text-center border rounded-xl bg-card/50 text-muted border-border/50">
        <p>No hay actividad reciente.</p>
        <p className="mt-2 text-sm">Añade amigos para ver su actividad aquí.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 mt-8">
      <h2 className="text-xl font-bold tracking-tight">Actividad Reciente</h2>
      
      <div className="flex flex-col gap-4">
        {activities.map((activity) => {
          let actionText = "";
          if (activity.type === "rating") actionText = "puntuó";
          else if (activity.type === "review") actionText = "escribió una reseña de";
          else if (activity.type === "favorite") actionText = "añadió a favoritos";
          else if (activity.type === "platinum") actionText = "consiguió el platino en";
          else if (activity.type === "new_game") actionText = "añadió a su biblioteca";
          else actionText = "jugó a";

          return (
            <div key={activity.id} className="flex gap-4 p-4 transition-colors border rounded-xl bg-card hover:bg-accent/5">
              {activity.user.image ? (
                <img src={activity.user.image} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="flex items-center justify-center w-10 h-10 font-bold rounded-full bg-accent/20 text-accent">
                  {activity.user.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              
              <div className="flex-1">
                <div className="text-sm">
                  <Link href={`/u/${activity.user.handle}`} className="font-semibold hover:underline">
                    {activity.user.name}
                  </Link>{" "}
                  <span className="text-muted">{actionText}</span>{" "}
                  <Link href={`/u/${activity.user.handle}/${activity.game.id}`} className="font-semibold hover:underline">
                    {activity.game.title}
                  </Link>
                </div>
                
                <div className="mt-0.5 text-xs text-muted/60">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: es })}
                </div>

                {activity.type === "rating" && activity.rating && (
                  <RatingStars rating={activity.rating} />
                )}

                {activity.type === "review" && activity.review && (
                  <div className="p-3 mt-3 text-sm italic border-l-2 bg-muted/20 border-accent/50 rounded-r-md text-foreground/80">
                    &quot;{activity.review}&quot;
                  </div>
                )}

                <div className="mt-3 flex items-center gap-3">
                  <form action={toggleActivityReactionAction}>
                    <input type="hidden" name="activityId" value={activity.id} />
                    <button className={`text-xs font-semibold ${activity.reacted ? "text-accent" : "text-muted hover:text-foreground"}`}>
                      {activity.reacted ? "Aplaudido" : "Aplaudir"} · {activity.reactions}
                    </button>
                  </form>
                  <span className="text-xs text-muted">{activity.comments.length} comentarios</span>
                </div>
                <form action={addActivityCommentAction} className="mt-2 flex gap-2">
                  <input type="hidden" name="activityId" value={activity.id} />
                  <input type="text" name="comment" placeholder="Añadir un comentario..." className="flex-1 bg-transparent border-b border-border/50 text-xs px-2 py-1.5 focus:outline-none focus:border-accent transition-colors" />
                </form>
                {activity.comments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {activity.comments.map((comment: any, index: number) => (
                      <div key={index} className="text-xs bg-muted/10 p-2 rounded-lg">
                        <span className="font-semibold">{comment.userName || "Alguien"}</span>: {comment.body}
                        <div className="text-[10px] text-muted/60 mt-0.5">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: es })}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {activity.game.iconUrl && (
                <Link href={`/u/${activity.user.handle}/${activity.game.id}`} className="shrink-0">
                  <img src={activity.game.iconUrl} alt="" className="w-12 h-12 rounded-md shadow-sm" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
