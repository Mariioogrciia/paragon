import { auth } from "@/auth";
import { getFeed } from "@/lib/feed";
import { ActivityFeed } from "@/components/ActivityFeed";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/BackButton";

export const metadata = {
  title: "Comunidad - Paragon",
};

export default async function GlobalFeedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");

  // Antes `getGlobalFeed` (toda actividad de todo perfil público, sin
  // filtrar) — con más usuarios esa consulta escala mal y muestra ruido de
  // gente que no conoces. `getFeed` es exactamente lo que ya usa la app
  // nativa (GET /api/mobile/feed): propia + amigos, nada más.
  const activities = await getFeed(session.user.id);

  return (
    <div className="mx-auto max-w-[800px] px-7 py-12">
      <BackButton fallbackHref="/" />
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold mb-2">Comunidad</h1>
        <p className="text-muted">Actividad tuya y de tus amigos.</p>
      </div>

      {activities.length > 0 ? (
        <ActivityFeed activities={activities} currentUserId={session?.user?.id ?? null} />
      ) : (
        <div className="p-8 text-center border border-dashed rounded-xl border-border bg-surface text-muted text-sm">
          El muro está muy tranquilo. ¡Sé el primero en compartir algo!
        </div>
      )}
    </div>
  );
}
