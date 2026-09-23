import { db } from "@/db";
import { clans, clanMembers } from "@/db/schema";
import { sql, desc } from "drizzle-orm";
import Link from "next/link";
import { ClanCreateForm } from "./ClanCreateForm";
import { PendingClanInvites } from "./PendingClanInvites";
import { auth } from "@/auth";
import { getPendingInvites, getUserClan } from "@/lib/clans";

export default async function ClanesPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [allClanes, invitaciones, miClan] = await Promise.all([
    // Obtener todos los clanes y contar sus miembros
    db
      .select({
        id: clans.id,
        name: clans.name,
        tag: clans.tag,
        description: clans.description,
        memberCount: sql<number>`count(${clanMembers.userId})`.mapWith(Number),
      })
      .from(clans)
      .leftJoin(clanMembers, sql`${clans.id} = ${clanMembers.clanId}`)
      .groupBy(clans.id)
      .orderBy(desc(sql`count(${clanMembers.userId})`)),
    userId ? getPendingInvites(userId) : Promise.resolve([]),
    userId ? getUserClan(userId) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-[1240px] px-7 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-4xl font-bold uppercase">Clanes de Cazadores</h1>
          <p className="text-muted mt-2">Únete a un clan y suma fuerzas para dominar Paragon.</p>
        </div>
        {session?.user && (
          miClan ? (
            <Link
              href={`/clanes/${miClan.clan.tag.toLowerCase()}`}
              className="rounded-[10px] border border-border px-4 py-2 font-bold text-muted transition-colors hover:border-[var(--accent)] hover:text-foreground"
            >
              Tu clan: [{miClan.clan.tag}] {miClan.clan.name}
            </Link>
          ) : (
            <ClanCreateForm />
          )
        )}
      </div>

      {invitaciones.length > 0 && <PendingClanInvites invites={invitaciones} />}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {allClanes.map((clan) => (
          <Link
            key={clan.id}
            href={`/clanes/${clan.tag.toLowerCase()}`}
            className="group block rounded-2xl border border-border bg-surface p-6 transition-all hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="rounded bg-[var(--accent-rgb)]/10 px-2 py-1 text-xs font-bold text-[var(--accent-text)]">
                [{clan.tag}]
              </span>
              <span className="text-sm font-medium text-muted">
                {clan.memberCount} {clan.memberCount === 1 ? "miembro" : "miembros"}
              </span>
            </div>
            <h2 className="mt-3 text-xl font-bold">{clan.name}</h2>
            <p className="mt-2 line-clamp-2 text-sm text-muted">{clan.description}</p>
          </Link>
        ))}
        {allClanes.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-12 text-center text-muted">
            Todavía no hay ningún clan. ¡Sé el primero en crear uno!
          </div>
        )}
      </div>
    </div>
  );
}
