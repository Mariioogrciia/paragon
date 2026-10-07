import { db } from "@/db";
import { clans, clanMembers } from "@/db/schema";
import { sql, desc } from "drizzle-orm";
import Link from "next/link";
import { ClanCreateForm } from "./ClanCreateForm";
import { PendingClanInvites } from "./PendingClanInvites";
import { auth } from "@/auth";
import { getPendingInvites, getUserClan } from "@/lib/clans";

import { SeccionTabs } from "@/components/SeccionTabs";
import { BackButton } from "@/components/BackButton";
import { getTranslations } from "next-intl/server";
import { Dorsal } from "@/components/carreras/Dorsal";
import { EscudoClan } from "@/components/EscudoClan";
import { libreaDe } from "@/lib/librea";

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
        emblema: clans.logoUrl,
        memberCount: sql<number>`count(${clanMembers.userId})`.mapWith(Number),
      })
      .from(clans)
      .leftJoin(clanMembers, sql`${clans.id} = ${clanMembers.clanId}`)
      .groupBy(clans.id)
      .orderBy(desc(sql`count(${clanMembers.userId})`)),
    userId ? getPendingInvites(userId) : Promise.resolve([]),
    userId ? getUserClan(userId) : Promise.resolve(null),
  ]);

  const t = await getTranslations("Perfil");

  return (
    <div className="mx-auto max-w-[1240px] px-7 py-12">
      <BackButton fallbackHref="/" />
      <SeccionTabs seccion="comunidad" />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[clamp(1.875rem,5vw,2.75rem)] font-bold uppercase leading-tight">
            <span className="carreras-titulo">{t("ClanesPage.titulo")}</span>
          </h1>
          <p className="mt-2 text-muted">{t("ClanesPage.descripcion")}</p>
        </div>
        {session?.user &&
          (miClan ? (
            <Link
              href={`/clanes/${miClan.clan.tag.toLowerCase()}`}
              className="rounded-[10px] border border-border px-4 py-2 font-bold text-muted transition-colors hover:border-[var(--accent)] hover:text-foreground"
            >
              {t("ClanesPage.tuClan", { tag: miClan.clan.tag, nombre: miClan.clan.name })}
            </Link>
          ) : (
            <ClanCreateForm />
          ))}
      </div>

      {invitaciones.length > 0 && <PendingClanInvites invites={invitaciones} />}

      {allClanes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted">{t("ClanesPage.vacio")}</div>
      ) : (
        <ol className="overflow-hidden rounded-[18px] border border-border bg-surface">
          {allClanes.map((clan, i) => (
            <li key={clan.id} className="border-b border-border last:border-0">
              <Link
                href={`/clanes/${clan.tag.toLowerCase()}`}
                className="carreras-fila flex items-center gap-4 px-4 py-4 sm:px-5"
                style={{ ["--librea" as string]: libreaDe(clan.tag.toUpperCase()).fondo }}
              >
                <span className="carreras-cifra w-8 shrink-0 text-sm text-muted">P{i + 1}</span>
                <EscudoClan emblema={clan.emblema} size={40} />
                <Dorsal id={clan.tag.toUpperCase()} texto={clan.tag} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-heading text-lg font-bold uppercase tracking-wide">{clan.name}</span>
                  {clan.description && <span className="block truncate text-sm text-muted">{clan.description}</span>}
                </span>
                <span className="shrink-0 text-sm font-semibold text-muted">{t("ClanesPage.miembros", { n: clan.memberCount })}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
