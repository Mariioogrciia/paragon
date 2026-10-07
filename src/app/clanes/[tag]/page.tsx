import { getClanByTag, getClanLeaderboard, getClanActivity, getInvitableFriends } from "@/lib/clans";
import { notFound } from "next/navigation";
import { ClanActions } from "./ClanActions";
import { InviteFriendsButton } from "./InviteFriendsButton";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Dorsal } from "@/components/carreras/Dorsal";
import { libreaDe } from "@/lib/librea";
import { ClanActivityFeed } from "@/components/ClanActivityFeed";
import { BackButton } from "@/components/BackButton";
import { GuerraDeClanes } from "./GuerraDeClanes";
import { EditorEscudo } from "./EditorEscudo";
import { EscudoClan } from "@/components/EscudoClan";
import { DURACION_DIAS, clanesRetables, getGuerrasDeClan, type GuerraVista } from "@/lib/clanWars";

/** Sin esto la pestaña decía solo "Paragon" en la página de cualquier clan. */
export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const clan = await getClanByTag(tag).catch(() => null);
  const t = await getTranslations("Perfil");
  return { title: clan ? `[${clan.tag}] ${clan.name} · Paragon` : `${t("ClanPage.noEncontrado")} · Paragon` };
}

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
  // Puntuación del clan: lo que han ganado sus miembros estando en él (lib/clans.ts).
  const score = leaderboard.reduce((sum, m) => sum + m.contribucion, 0);
  const trofeosEnClan = leaderboard.reduce((sum, m) => sum + m.trofeosEnClan, 0);

  const amIMember = leaderboard.some(m => m.userId === userId);
  const amIOwner = clan.ownerId === userId;

  // Solo se calcula si hace falta: nadie más lo va a ver.
  const invitables = amIOwner && userId ? await getInvitableFriends(userId, clan.id) : [];
  // Guerra de clanes (lib/clanWars.ts). Si fallara (p. ej. sin la tabla),
  // la página del clan se enseña igual, sin la sección.
  const [guerras, retables] = await Promise.all([
    getGuerrasDeClan(clan.id).catch(() => null),
    amIOwner ? clanesRetables(clan.id).catch(() => []) : Promise.resolve([]),
  ]);
  const serializar = (g: GuerraVista) => ({
    id: g.id,
    estado: g.estado,
    soyRetador: g.soyRetador,
    rival: g.rival,
    terminaAt: g.terminaAt?.toISOString() ?? null,
    diasRestantes: g.diasRestantes,
    misPuntos: g.misPuntos,
    susPuntos: g.susPuntos,
    gane: g.gane,
  });

  const t = await getTranslations("Perfil");
  const idioma = await getLocale();
  const librea = libreaDe(clan.tag.toUpperCase());

  return (
    <div className="mx-auto max-w-[1240px] px-7 py-12">
      {/* Antes no había forma de volver sin usar el atrás del navegador. */}
      <BackButton fallbackHref="/clanes" />
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-4">
            <EscudoClan emblema={clan.logoUrl} size={72} />
            <Dorsal id={clan.tag.toUpperCase()} texto={clan.tag} grande />
            <h1 className="font-heading min-w-0 text-[clamp(1.875rem,5vw,2.75rem)] font-bold uppercase leading-tight">
              <span className="carreras-titulo">{clan.name}</span>
            </h1>
          </div>
          {clan.description && <p className="mt-4 max-w-xl text-muted">{clan.description}</p>}
          {amIOwner && (
            <div className="mt-4">
              <EditorEscudo clanId={clan.id} inicial={clan.logoUrl} />
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-4">
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">{t("ClanPage.puntosClan")}</p>
              <p className="carreras-cifra mt-1 text-3xl text-[var(--accent-text)]">{score.toLocaleString(idioma)}</p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">{t("ClanPage.trofeosClan")}</p>
              <p className="carreras-cifra mt-1 text-3xl">{trofeosEnClan.toLocaleString(idioma)}</p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">{t("ClanPage.miembros")}</p>
              <p className="carreras-cifra mt-1 text-3xl">{leaderboard.length}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          {amIOwner && <InviteFriendsButton clanId={clan.id} friends={invitables} />}
          {userId && <ClanActions clanId={clan.id} amIMember={amIMember} amIOwner={amIOwner} />}
        </div>
      </div>

      <div className="carreras-banda mt-8 rounded-full" style={{ ["--librea" as string]: librea.fondo, ["--librea-tinta" as string]: librea.tinta }} aria-hidden="true" />

      {guerras && (
        <div className="mt-10">
          <GuerraDeClanes
            clanId={clan.id}
            clanTag={clan.tag}
            soyLider={amIOwner}
            abierta={guerras.abierta ? serializar(guerras.abierta) : null}
            historial={guerras.historial.map(serializar)}
            retables={retables}
            duracionDias={DURACION_DIAS}
          />
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0" aria-labelledby="clan-contribucion">
          <h2 id="clan-contribucion" className="font-heading text-2xl font-bold uppercase">
            {t("ClanPage.contribucion")}
          </h2>
          <p className="mb-6 mt-1 max-w-xl text-sm text-muted">{t("ClanPage.contribucionTexto")}</p>
          <ol className="overflow-hidden rounded-[18px] border border-border bg-surface">
            {leaderboard.map((m, i) => {
              const parte = score > 0 ? m.contribucion / score : 0;
              const librea = libreaDe(m.userId);
              return (
                <li key={m.userId} className="border-b border-border last:border-0">
                  <Link
                    href={`/u/${m.handle}`}
                    className="carreras-fila flex flex-col gap-2.5 px-4 py-3.5"
                    style={{ ["--librea" as string]: librea.fondo }}
                  >
                    <span className="flex items-center gap-3">
                      <Dorsal id={m.userId} texto={`P${i + 1}`} />
                      <Avatar src={m.image} name={m.name ?? m.handle ?? "?"} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{m.name || m.handle}</span>
                        <span className="block text-xs leading-snug text-muted">
                          {m.role === "owner" ? t("ClanPage.lider") : t("ClanPage.miembro")} ·{" "}
                          {t("ClanPage.desde", { fecha: m.joinedAt.toLocaleDateString(idioma, { day: "numeric", month: "short", year: "numeric" }) })} ·{" "}
                          {t("ClanPage.trofeosEnClan", { n: m.trofeosEnClan })}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="carreras-cifra block text-lg text-[var(--accent-text)]">{m.contribucion.toLocaleString(idioma)}</span>
                        <span className="block text-[0.6875rem] text-muted">
                          {t("ClanPage.parte", { p: Math.round(parte * 100) })}
                        </span>
                      </span>
                    </span>
                    {/* Su parte de los puntos del clan, en su color. */}
                    <span className="block h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                      <span className="block h-full rounded-full" style={{ width: `${Math.max(parte * 100, m.contribucion > 0 ? 2 : 0)}%`, background: librea.fondo }} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs text-muted">{t("ClanPage.nota")}</p>
        </section>

        <section className="min-w-0" aria-labelledby="clan-actividad">
          <h2 id="clan-actividad" className="font-heading mb-6 text-2xl font-bold uppercase">
            {t("ClanPage.actividad")}
          </h2>
          <ClanActivityFeed items={actividad} />
        </section>
      </div>
    </div>
  );
}
