import { auth } from "@/auth";
import { getGlobalFeed } from "@/lib/feed";
import { ActivityFeed } from "@/components/ActivityFeed";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Muro Social - Paragon",
};

export default async function GlobalFeedPage() {
  const session = await auth();

  // Ya no pasamos activities, ActivityFeed lo carga por sí mismo.
  const activities = await getGlobalFeed(session?.user?.id);

  return (
    <div className="mx-auto max-w-[800px] px-7 py-12">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold mb-2">Comunidad</h1>
        <p className="text-muted">Descubre a qué está jugando la comunidad de Paragon.</p>
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
