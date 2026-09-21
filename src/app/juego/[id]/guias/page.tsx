import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { NuevaGuiaForm } from "@/components/NuevaGuiaForm";
import { BackButton } from "@/components/BackButton";
import { getGlobalGame } from "@/lib/community";
import { listGuides } from "@/lib/guides";
import { relativeDate } from "@/lib/design";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGlobalGame(decodeURIComponent(id));
  return { title: game ? `Guías de ${game.title} · Paragon` : "Guías · Paragon" };
}

/**
 * Guías escritas de un juego, como un foro: cada una es un hilo con
 * respuestas (ver lib/guides.ts sobre por qué esto es distinto de la
 * reseña express y del vídeo de un trofeo suelto).
 */
export default async function GuiasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gameId = decodeURIComponent(id);

  const [game, guias, session] = await Promise.all([
    getGlobalGame(gameId),
    listGuides(gameId),
    auth(),
  ]);

  if (!game) notFound();

  const t = await getTranslations("Biblioteca.GuiasPage");

  return (
    <div className="mx-auto max-w-[820px]">
      <BackButton fallbackHref={`/juego/${encodeURIComponent(gameId)}`} label={game.title} />

      <div className="mt-3 mb-7 flex flex-wrap items-baseline gap-3">
        <h1 className="font-heading text-[2rem] font-bold uppercase leading-none">{t("titulo")}</h1>
        <span className="text-[0.8125rem] text-muted">
          {t("guiasCount", { count: guias.length })}
        </span>
      </div>

      {session?.user ? (
        <div className="mb-7">
          <NuevaGuiaForm gameId={gameId} />
        </div>
      ) : (
        <p className="mb-7 rounded-xl border border-border bg-surface px-4 py-4 text-center text-sm text-muted">
          {t.rich("entraParaEscribir", {
            link: (chunks) => (
              <Link href="/entrar" className="font-semibold text-accent hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      )}

      {guias.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          {t("sinGuias")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {guias.map((g) => (
            <Link
              key={g.id}
              href={`/juego/${encodeURIComponent(gameId)}/guias/${g.id}`}
              className="block rounded-2xl p-5 transition-colors hover:bg-surface-2"
              style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
            >
              <h2 className="font-heading text-lg font-bold leading-tight">{g.title}</h2>
              <p className="mt-1.5 line-clamp-2 text-sm text-muted">{g.body}</p>
              <div className="mt-3 flex items-center gap-2.5">
                <Avatar src={g.authorImage} name={g.authorName ?? g.authorHandle ?? "?"} size={22} />
                <span className="text-xs font-semibold">{g.authorName ?? `@${g.authorHandle}`}</span>
                <span className="text-xs text-muted">· {relativeDate(g.createdAt)}</span>
                <span className="ml-auto text-xs font-bold text-accent">
                  {t("respuestasCount", { count: g.respuestas })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
