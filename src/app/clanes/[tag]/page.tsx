import { getClanByTag, getClanLeaderboard, getClanActivity, getInvitableFriends } from "@/lib/clans";
import { notFound } from "next/navigation";
import { ClanActions } from "./ClanActions";
import { InviteFriendsButton } from "./InviteFriendsButton";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { ClanActivityFeed } from "@/components/ClanActivityFeed";

const MEDALLA: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

export default async function ClanPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const clan = await getClanByTag(tag);

  if (!clan) notFound();

  const session = await auth();
  const userId = session?.user?.id;

  const [leaderboard, actividad] = await Promise.all([
    getClanLeaderboard(clan.id),
    getClanActivity(clan.id),
  ]);
  const score = leaderboard.reduce((sum, m) => sum + m.score, 0);

  const amIMember = leaderboard.some(m => m.userId === userId);
  const amIOwner = clan.ownerId === userId;

  // Solo se calcula si hace falta: nadie más lo va a ver.
  const invitables = amIOwner && userId ? await getInvitableFriends(userId, clan.id) : [];

  return (
    <div className="mx-auto max-w-[1240px] px-7 py-12">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded bg-[var(--accent-rgb)]/10 px-3 py-1.5 text-lg font-bold text-[var(--accent-text)]">
              [{clan.tag}]
            </span>
            <h1 className="font-heading text-4xl font-bold uppercase">{clan.name}</h1>
          </div>
          <p className="text-muted mt-4 max-w-xl">{clan.description}</p>
          <div className="mt-4 flex gap-6">
            <div>
              <p className="text-xs text-muted uppercase tracking-wider">XP Total del Clan</p>
              <p className="text-2xl font-bold font-mono text-[var(--accent-text)]">
                {score.toLocaleString()} XP
              </p>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider">Miembros</p>
              <p className="text-2xl font-bold font-mono">{leaderboard.length}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          {amIOwner && <InviteFriendsButton clanId={clan.id} friends={invitables} />}
          {userId && (
            <ClanActions
              clanId={clan.id}
              amIMember={amIMember}
              amIOwner={amIOwner}
            />
          )}
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <h2 className="font-heading text-2xl font-bold mb-6">Actividad del Clan</h2>
          <ClanActivityFeed items={actividad} />
        </div>

        <div className="min-w-0">
          <h2 className="font-heading text-2xl font-bold mb-6">Ranking ({leaderboard.length})</h2>
          <div className="grid gap-2">
            {leaderboard.map((m, i) => (
              <a
                key={m.userId}
                href={`/u/${m.handle}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:border-[var(--accent)] transition-colors"
              >
                <span className="w-5 shrink-0 text-center text-sm font-bold text-muted">
                  {MEDALLA[i] ?? i + 1}
                </span>
                <Avatar src={m.image} name={m.name ?? m.handle ?? "?"} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{m.name || m.handle}</p>
                  <p className="text-xs text-muted">
                    {m.role === "owner" ? "Líder" : "Miembro"} · {m.trofeos} trofeos
                  </p>
                </div>
                <span className="shrink-0 text-right font-mono text-sm font-bold text-[var(--accent-text)]">
                  {m.score.toLocaleString()}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
