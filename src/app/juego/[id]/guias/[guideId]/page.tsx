import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { RespuestaGuiaForm } from "@/components/RespuestaGuiaForm";
import { BackButton } from "@/components/BackButton";
import { deleteGuideAction } from "@/app/actions";
import { getGuide } from "@/lib/guides";
import { relativeDate } from "@/lib/design";

export async function generateMetadata({ params }: { params: Promise<{ guideId: string }> }) {
  const { guideId } = await params;
  const guide = await getGuide(guideId);
  return { title: guide ? `${guide.title} · Paragon` : "Guía · Paragon" };
}

export default async function GuiaPage({
  params,
}: {
  params: Promise<{ id: string; guideId: string }>;
}) {
  const { id, guideId } = await params;
  const gameId = decodeURIComponent(id);

  const [guide, session] = await Promise.all([getGuide(guideId), auth()]);
  if (!guide || guide.gameId !== gameId) notFound();

  const esAutor = session?.user?.id === guide.authorId;

  return (
    <div className="mx-auto max-w-[820px]">
      <BackButton fallbackHref={`/juego/${encodeURIComponent(gameId)}/guias`} label="Todas las guías" />

      <article className="mt-4">
        <h1 className="font-heading text-[28px] font-bold leading-tight">{guide.title}</h1>

        <div className="mt-3 flex items-center gap-2.5">
          <Avatar src={guide.authorImage} name={guide.authorName ?? guide.authorHandle ?? "?"} size={28} />
          <span className="text-sm font-semibold">{guide.authorName ?? `@${guide.authorHandle}`}</span>
          <span className="text-xs text-muted">· {relativeDate(guide.createdAt)}</span>

          {esAutor && (
            <form action={deleteGuideAction.bind(null, guide.id, gameId)} className="ml-auto">
              <button className="text-xs font-semibold text-muted hover:text-danger">Borrar guía</button>
            </form>
          )}
        </div>

        <p className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
          {guide.body}
        </p>
      </article>

      <section className="mt-9">
        <h2 className="font-heading mb-3.5 text-lg font-bold uppercase tracking-wide">
          {guide.replies.length === 0 ? "Respuestas" : `${guide.replies.length} ${guide.replies.length === 1 ? "respuesta" : "respuestas"}`}
        </h2>

        <div className="flex flex-col gap-3">
          {guide.replies.map((r) => (
            <div key={r.id} className="flex gap-3 rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
              <Avatar src={r.authorImage} name={r.authorName ?? r.authorHandle ?? "?"} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{r.authorName ?? `@${r.authorHandle}`}</span>
                  <span className="text-xs text-muted">{relativeDate(r.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{r.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          {session?.user ? (
            <RespuestaGuiaForm guideId={guide.id} gameId={gameId} />
          ) : (
            <p className="rounded-xl border border-border bg-surface px-4 py-4 text-center text-sm text-muted">
              <Link href="/entrar" className="font-semibold text-accent hover:underline">Entra</Link> para responder.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
