import { getClanByTag, getClanScore, getClanMembers, getClanActivity } from "@/lib/clans";
import { notFound } from "next/navigation";
import { ClanActions } from "./ClanActions";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { Avatar } from "@/components/Avatar";
import { avatarUrlSql } from "@/lib/avatarSql";
import { ClanActivityFeed } from "@/components/ClanActivityFeed";

export default async function ClanPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const clan = await getClanByTag(tag);

  if (!clan) notFound();

  const session = await auth();
  const userId = session?.user?.id;

  const [score, members, actividad] = await Promise.all([
    getClanScore(clan.id),
    getClanMembers(clan.id),
    getClanActivity(clan.id),
  ]);

  const amIMember = members.some(m => m.userId === userId);
  const amIOwner = clan.ownerId === userId;

  const userIds = members.map(m => m.userId);
  const memberProfiles = await db
    .select({
      id: users.id,
      handle: users.handle,
      name: users.name,
      image: avatarUrlSql(users.id, users.image, users.avatarPersonalizado),
    })
    .from(users)
    .where(inArray(users.id, userIds));

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
              <p className="text-2xl font-bold font-mono">{members.length}</p>
            </div>
          </div>
        </div>

        {userId && (
          <ClanActions 
            clanId={clan.id} 
            amIMember={amIMember} 
            amIOwner={amIOwner} 
          />
        )}
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <h2 className="font-heading text-2xl font-bold mb-6">Actividad del Clan</h2>
          <ClanActivityFeed items={actividad} />
        </div>

        <div className="min-w-0">
          <h2 className="font-heading text-2xl font-bold mb-6">Miembros ({members.length})</h2>
          <div className="grid gap-3">
            {memberProfiles.map(p => {
              const membership = members.find(m => m.userId === p.id);
              return (
                <a
                  key={p.id}
                  href={`/u/${p.handle}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 hover:border-[var(--accent)] transition-colors"
                >
                  <Avatar src={p.image} name={p.name ?? p.handle ?? "?"} size={40} />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{p.name || p.handle}</p>
                    <p className="text-xs text-muted">
                      {membership?.role === 'owner' ? "🏆 Líder" : "Miembro"}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
