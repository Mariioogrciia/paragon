import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { getFeed } from "@/lib/feed";
import type { Hito } from "@/lib/comunidad";
import { formatDistanceToNow } from "date-fns";
import { localeFechas } from "@/lib/localeFechas";
import { addActivityCommentAction, toggleActivityReactionAction } from "@/app/actions";
import { REACCIONES } from "@/lib/reacciones";
import { AchievementIcon } from "@/components/AchievementIcon";
import { TituloEspecial } from "@/components/TituloEspecial";
import { TrophyIcon } from "@/components/TrophyIcon";
import { LOGRO_POR_ID } from "@/lib/logros";

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

type FeedActivity = Awaited<ReturnType<typeof getFeed>>[number];
type Autor = { handle: string | null; name: string | null; image: string | null; titulo?: string | null };

function AvatarAutor({ user }: { user: Autor }) {
  return user.image ? (
    <img loading="lazy" decoding="async" src={user.image} alt="" className="w-10 h-10 shrink-0 rounded-full" />
  ) : (
    <div className="flex shrink-0 items-center justify-center w-10 h-10 font-bold rounded-full bg-accent/20 text-accent">
      {user.name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function NombreAutor({ user }: { user: Autor }) {
  return (
    <>
      <Link href={`/u/${user.handle}`} className="font-semibold hover:underline">
        {user.name}
      </Link>{" "}
      {user.titulo && (
        <>
          <TituloEspecial clave={user.titulo} pequeno />{" "}
        </>
      )}
    </>
  );
}

function Hace({ fecha }: { fecha: Date }) {
  const locale = localeFechas(useLocale());
  return <div className="mt-0.5 text-xs text-muted/60">{formatDistanceToNow(new Date(fecha), { addSuffix: true, locale })}</div>;
}

function TarjetaHito({ hito }: { hito: Hito }) {
  const t = useTranslations("Analitica.activityFeed");
  const tp = useTranslations("Perfil");
  const ids = hito.tipo === "insignia" ? hito.insigniaIds.filter((id) => LOGRO_POR_ID.has(id)) : [];
  const logro = ids.length > 0 ? LOGRO_POR_ID.get(ids[0]) : undefined;
  if (hito.tipo === "insignia" && !logro) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-3 sm:gap-4 sm:px-4">
      <AvatarAutor user={hito.user} />
      <div className="min-w-0 flex-1 text-sm">
        <NombreAutor user={hito.user} />
        {hito.tipo === "insignia" ? (
          <>
            <span className="text-muted">{t("hitoInsignias", { n: ids.length })}</span>{" "}
            {ids.map((id, i) => (
              <span key={id}>
                {i > 0 && <span className="text-muted">{i === ids.length - 1 ? ` ${t("y")} ` : ", "}</span>}
                <span className="font-semibold">{tp(`Badges.items.${id}.name`)}</span>
              </span>
            ))}
          </>
        ) : (
          <span className="text-muted">{t("hitoCampeon", { titulo: hito.titulo })}</span>
        )}
        <Hace fecha={hito.createdAt} />
      </div>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: logro?.bg ?? "linear-gradient(135deg, #a16207, #fde047)" }}
      >
        {logro ? <AchievementIcon id={logro.id} size={18} /> : <AchievementIcon id="campeon" size={18} />}
      </span>
    </div>
  );
}

function TarjetaActividad({ activity }: { activity: FeedActivity }) {
  const t = useTranslations("Analitica.activityFeed");
  const fechas = localeFechas(useLocale());
  const esPlatino = activity.type === "platinum";

  let actionText = "";
  if (activity.type === "rating") actionText = t("accionRating");
  else if (activity.type === "review") actionText = t("accionReview");
  else if (activity.type === "favorite") actionText = t("accionFavorite");
  else if (activity.type === "platinum") actionText = t("accionPlatinum");
  else if (activity.type === "new_game") actionText = t("accionNewGame");
  else actionText = t("accionDefault");

  return (
    <div
      className="flex gap-3 p-3 transition-colors border rounded-xl bg-card hover:bg-accent/5 sm:gap-4 sm:p-4"
      style={
        esPlatino
          ? {
              borderColor: "color-mix(in srgb, var(--platinum) 45%, transparent)",
              background: "linear-gradient(135deg, color-mix(in srgb, var(--platinum) 10%, transparent), transparent 60%)",
            }
          : undefined
      }
    >
      <AvatarAutor user={activity.user} />

      <div className="min-w-0 flex-1">
        {esPlatino && (
          <span className="mb-1 inline-flex items-center gap-1 text-[0.625rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--platinum)" }}>
            <TrophyIcon grade="platinum" size={12} /> {t("platinoEtiqueta")}
          </span>
        )}
        <div className="text-sm">
          <NombreAutor user={activity.user} />
          <span className="text-muted">{actionText}</span>{" "}
          <Link href={`/u/${activity.user.handle}/${activity.game.id}`} className="font-semibold hover:underline">
            {activity.game.title}
          </Link>
        </div>

        <Hace fecha={activity.createdAt} />

        {activity.type === "rating" && activity.rating && <RatingStars rating={activity.rating} />}

        {activity.type === "review" && activity.review && (
          <div className="p-3 mt-3 text-sm italic border-l-2 bg-muted/20 border-accent/50 rounded-r-md text-foreground/80">
            &quot;{activity.review}&quot;
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {/* Una reacción por persona: pulsar otra la cambia, la misma la quita. */}
          {REACCIONES.map((r) => {
            const mia = activity.miReaccion === r.clave;
            const n = activity.porReaccion[r.clave] ?? 0;
            return (
              <form key={r.clave} action={toggleActivityReactionAction}>
                <input type="hidden" name="activityId" value={activity.id} />
                <input type="hidden" name="reaction" value={r.clave} />
                <button
                  aria-label={t(`reaccion.${r.clave}`)}
                  aria-pressed={mia}
                  title={t(`reaccion.${r.clave}`)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold transition-all hover:-translate-y-0.5 hover:border-accent ${
                    mia ? "border-accent bg-accent/15 text-[var(--accent-text)]" : n > 0 ? "border-border text-foreground" : "border-transparent text-muted opacity-60 hover:opacity-100"
                  }`}
                >
                  <span>{r.emoji}</span>
                  {n > 0 && <span className="tabular-nums">{n}</span>}
                </button>
              </form>
            );
          })}
          <span className="ml-1 text-xs text-muted">{t("comentarios", { count: activity.comments.length })}</span>
        </div>
        <form action={addActivityCommentAction} className="mt-2 flex items-center gap-2">
          <input type="hidden" name="activityId" value={activity.id} />
          {/* `min-w-0`: un <input> trae de serie un ancho minimo
              propio (~180px) que `flex-1` NO anula, asi que en un
              movil empujaba al boton "Enviar" fuera de la tarjeta. */}
          <input
            type="text"
            name="comment"
            placeholder={t("comentarioPlaceholder")}
            className="min-w-0 flex-1 bg-transparent border-b border-border/50 text-xs px-2 py-1.5 focus:outline-none focus:border-accent transition-colors"
          />
          <button type="submit" className="shrink-0 text-xs font-semibold text-muted transition-colors hover:text-accent">
            {t("enviar")}
          </button>
        </form>
        {activity.comments.length > 0 && (
          <div className="mt-3 space-y-2">
            {activity.comments.map((comment, index) => (
              <div key={index} className="text-xs bg-muted/10 p-2 rounded-lg">
                <span className="font-semibold">{comment.userName || t("alguien")}</span>: {comment.body}
                <div className="text-[0.625rem] text-muted/60 mt-0.5">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: fechas })}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activity.game.iconUrl && (
        <Link href={`/u/${activity.user.handle}/${activity.game.id}`} className="shrink-0">
          <img
            loading="lazy"
            decoding="async"
            src={activity.game.iconUrl}
            alt=""
            className={`rounded-md shadow-sm ${esPlatino ? "h-14 w-14 sm:h-16 sm:w-16" : "h-10 w-10 sm:h-12 sm:w-12"}`}
          />
        </Link>
      )}
    </div>
  );
}

/**
 * `hitos` (insignias, títulos de liga) se intercalan por fecha con la
 * actividad: no tienen aplausos ni comentarios porque no son una `activity`.
 * `sinTitulo`: Comunidad pone su propia cabecera.
 */
export function ActivityFeed({
  activities,
  hitos = [],
  sinTitulo = false,
}: {
  activities: FeedActivity[];
  hitos?: Hito[];
  currentUserId?: string | null;
  sinTitulo?: boolean;
}) {
  const t = useTranslations("Analitica.activityFeed");

  const elementos = [
    ...activities.map((a) => ({ clave: a.id, fecha: new Date(a.createdAt).getTime(), actividad: a, hito: null })),
    ...hitos.map((h) => ({ clave: h.id, fecha: new Date(h.createdAt).getTime(), actividad: null, hito: h })),
  ].sort((a, b) => b.fecha - a.fecha);

  if (elementos.length === 0) {
    return (
      <div className="py-12 text-center border rounded-xl bg-card/50 text-muted border-border/50">
        <p>{t("sinActividad")}</p>
        <p className="mt-2 text-sm">{t("anadeAmigos")}</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-6 ${sinTitulo ? "" : "mt-8"}`}>
      {!sinTitulo && <h2 className="text-xl font-bold tracking-tight">{t("titulo")}</h2>}

      <div className="flex flex-col gap-4">
        {elementos.map((e) =>
          e.actividad ? <TarjetaActividad key={e.clave} activity={e.actividad} /> : e.hito ? <TarjetaHito key={e.clave} hito={e.hito} /> : null,
        )}
      </div>
    </div>
  );
}
