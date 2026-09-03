import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLibrary, getProfileByUserId, listFriends } from "@/lib/profiles";
import { getParagonLevel } from "@/lib/paragonLevel";
import { getPeriodRankings } from "@/lib/rankings";

export const metadata = { title: "Rankings · Paragon" };

export default async function RankingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const [profile, friends] = await Promise.all([
    getProfileByUserId(session.user.id),
    listFriends(session.user.id),
  ]);
  if (!profile) redirect("/bienvenida");

  const userIds = [session.user.id, ...friends.map((friend) => friend.userId)];
  const [periods, allTime] = await Promise.all([
    getPeriodRankings(userIds),
    Promise.all(userIds.map(async (userId) => {
      const friendProfile = userId === session.user.id ? profile : await getProfileByUserId(userId);
      if (!friendProfile) return null;
      const library = await getLibrary(friendProfile);
      const level = await getParagonLevel(userId);
      return { userId, name: library.player.name, handle: friendProfile.handle, level };
    })),
  ]);

  const general = allTime.filter((row): row is NonNullable<typeof row> => row !== null).sort((a, b) => b.level.xp - a.level.xp);
  const bloques = [
    { title: "Esta semana", rows: periods.semanal.map((row) => ({ ...row, label: "trofeos" })) },
    { title: "Este mes", rows: periods.mensual.map((row) => ({ ...row, label: "trofeos" })) },
    { title: "XP Paragon", rows: general.map((row) => ({ userId: row.userId, name: row.name, handle: row.handle, total: row.level.xp, label: "XP" })) },
  ];

  return (
    <div className="space-y-7">
      <div>
        <Link href="/amigos" className="text-xs font-semibold text-muted hover:text-foreground">← Volver a Amigos</Link>
        <h1 className="font-heading mt-3 text-[42px] font-bold uppercase leading-none">Rankings</h1>
        <p className="mt-2 text-sm text-muted">Compite con tus amigos por actividad reciente y progreso acumulado.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {bloques.map((bloque) => (
          <section key={bloque.title} className="rounded-[18px] border border-border bg-surface p-5">
            <h2 className="font-heading mb-4 text-lg font-bold uppercase tracking-wide">{bloque.title}</h2>
            {bloque.rows.length === 0 ? <p className="text-sm text-muted">Todavía no hay datos.</p> : <ol className="space-y-3">{bloque.rows.map((row, index) => <li key={row.userId} className="flex items-center gap-3"><span className="w-5 text-xs font-bold text-muted">{index + 1}</span><span className="min-w-0 flex-1 truncate"><span className="block truncate text-sm font-semibold">{row.name ?? `@${row.handle ?? "usuario"}`}</span>{row.handle && <span className="block truncate text-[11px] text-muted">@{row.handle}</span>}</span><span className="shrink-0 font-heading text-sm font-bold text-accent">{row.total.toLocaleString("es-ES")} {row.label}</span></li>)}</ol>}
          </section>
        ))}
      </div>
    </div>
  );
}
