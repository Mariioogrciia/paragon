import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptFriendAction, removeFriendAction } from "@/app/actions";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { AddFriendForm } from "@/components/forms/Forms";
import { TrophyIcon } from "@/components/TrophyIcon";
import {
  getLibrary,
  getProfileByUserId,
  listFriends,
  listPendingRequests,
} from "@/lib/profiles";
import { summarise } from "@/lib/stats";

export const metadata = { title: "Amigos · Platinos" };

const CARD = { border: "1px solid var(--border)", background: "linear-gradient(var(--surface), var(--background))" };
const POS_GOLD = "linear-gradient(150deg, #f7e3a8, #c39a2a)";

export default async function AmigosPage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const [mio, amigos, pendientes] = await Promise.all([
    getProfileByUserId(session.user.id),
    listFriends(session.user.id),
    listPendingRequests(session.user.id),
  ]);

  // Clasificación: yo y cada rival con alguna cuenta vinculada, por platinos.
  const tengoCuenta = (mio?.accounts.length ?? 0) > 0;
  const contendientes = [
    ...(tengoCuenta ? [session.user.id] : []),
    ...amigos.map((a) => a.userId),
  ];

  const ranking = (
    await Promise.all(
      contendientes.map(async (userId) => {
        const full = userId === session.user.id ? mio : await getProfileByUserId(userId);
        if (!full || full.accounts.length === 0) return null;

        const { player, games } = await getLibrary(full);
        const stats = summarise(games);

        return {
          userId: full.userId,
          handle: full.handle,
          name: player.name,
          avatarUrl: player.avatarUrl,
          trophyLevel: player.trophyLevel,
          esMio: full.userId === session.user.id,
          stats,
        };
      }),
    )
  )
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.stats.platinos - a.stats.platinos);

  return (
    <div>
      <h1 className="font-heading text-[42px] font-bold uppercase leading-none">Rivales</h1>
      <p className="mt-2.5 text-[15px] text-muted">
        Se añaden por su usuario de Platinos, no por su ID de PlayStation.
      </p>

      <div className="mt-7 grid gap-3 lg:grid-cols-[1fr_400px]">
        <section className="rounded-[18px] p-[22px]" style={CARD}>
          <h2 className="font-heading mb-3.5 text-[17px] font-bold tracking-[0.03em]">Añadir a alguien</h2>
          <AddFriendForm />
          <p className="mt-3 text-[13px] text-muted">
            El handle lo elige cada uno al darse de alta. Pídeselo y escríbelo aquí.
          </p>
        </section>

        {pendientes.length > 0 && (
          <section className="rounded-[18px] p-[22px]" style={CARD}>
            <h2 className="font-heading mb-3.5 text-[17px] font-bold tracking-[0.03em]">
              Solicitudes <span className="text-accent">{pendientes.length}</span>
            </h2>

            <ul className="space-y-3">
              {pendientes.map((p) => (
                <li key={p.userId} className="flex items-center gap-3">
                  <Avatar src={p.avatarUrl ?? p.image} name={p.handle ?? "?"} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">@{p.handle}</p>
                    {p.trophyLevel !== null && (
                      <p className="mt-0.5 text-xs text-muted">nivel {p.trophyLevel}</p>
                    )}
                  </div>

                  <form action={acceptFriendAction}>
                    <input type="hidden" name="requesterId" value={p.userId} />
                    <button
                      className="rounded-[9px] px-3.5 py-2 text-[13px] font-bold text-background"
                      style={{ background: "var(--accent-grad)" }}
                    >
                      Aceptar
                    </button>
                  </form>

                  <form action={removeFriendAction}>
                    <input type="hidden" name="friendId" value={p.userId} />
                    <button className="text-[13px] font-semibold text-muted hover:text-foreground">
                      Rechazar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <section className="mt-9">
        <div className="mb-4 flex items-baseline gap-3.5">
          <h2 className="font-heading text-2xl font-bold">Clasificación</h2>
          <span className="text-[13px] text-muted">
            Tú y {ranking.length - (tengoCuenta ? 1 : 0)} rivales, por platinos
          </span>
        </div>

        {ranking.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            Todavía no has añadido a nadie con la PlayStation vinculada. Pídele
            su usuario y escríbelo arriba.
          </p>
        ) : (
          <div className="grid gap-2.5">
            {ranking.map((r, i) => (
              <div
                key={r.userId}
                className="grid grid-cols-[34px_44px_1fr] items-center gap-4 rounded-2xl p-4 sm:grid-cols-[44px_52px_1fr_92px_92px_92px_200px] sm:gap-4"
                style={
                  r.esMio
                    ? { border: "1px solid #2f5a8f", background: "linear-gradient(160deg, #14243a, #0e141e)" }
                    : { border: "1px solid var(--border)", background: "var(--surface)" }
                }
              >
                <span
                  className="font-heading flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-sm font-bold"
                  style={
                    i === 0
                      ? { background: POS_GOLD, color: "#3a2a08" }
                      : r.esMio
                        ? { background: "rgb(var(--accent-rgb) / 0.18)", color: "var(--accent-text)" }
                        : { background: "var(--surface-2)", color: "var(--muted)" }
                  }
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <Avatar src={r.avatarUrl} name={r.name} size={52} />

                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <p className="truncate text-[15px] font-semibold">
                    {r.name}
                    {r.esMio && " (tú)"}
                  </p>
                  {r.handle && (
                    <p className="mt-0.5 text-xs text-muted">
                      @{r.handle}
                      {r.trophyLevel !== undefined && ` · nivel ${r.trophyLevel}`}
                    </p>
                  )}
                </div>

                <div>
                  <p className="font-heading flex items-center gap-1.5 text-xl font-bold text-platinum">
                    <TrophyIcon grade="platinum" size={15} />
                    {r.stats.platinos}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Platinos</p>
                </div>
                <div>
                  <p className="text-[17px] font-semibold">{r.stats.trofeos.toLocaleString("es-ES")}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Trofeos</p>
                </div>
                <div>
                  <p className="text-[17px] font-semibold">{r.stats.completadoMedio}%</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Medio</p>
                </div>

                {!r.esMio && r.handle && (
                  <div className="col-span-3 flex justify-end gap-2 sm:col-span-1">
                    <Link
                      href={`/comparar/${r.handle}`}
                      className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold"
                      style={{ background: "#151d29", border: "1px solid var(--border)", color: "var(--accent-text)" }}
                    >
                      Comparar
                    </Link>
                    <Link
                      href={`/u/${r.handle}`}
                      className="px-1 py-2 text-[13px] font-semibold text-muted hover:text-foreground"
                    >
                      Perfil
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {amigos.length > 0 && (
        <section className="mt-9">
          <h2 className="font-heading mb-3.5 text-2xl font-bold">Tus amigos</h2>

          <ul className="overflow-hidden rounded-[18px] border border-border bg-surface">
            {amigos.map((a) => (
              <li
                key={a.userId}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <Avatar src={a.avatarUrl ?? a.image} name={a.handle ?? "?"} />

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${a.handle}`}
                    className="truncate text-sm hover:text-accent"
                  >
                    {a.displayName ?? `@${a.handle}`}
                  </Link>
                  <p className="text-xs text-muted">
                    @{a.handle}
                    {a.trophyLevel !== null && ` · nivel ${a.trophyLevel}`}
                  </p>
                </div>

                <Link
                  href={`/comparar/${a.handle}`}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-accent/50"
                >
                  Comparar
                </Link>

                <form action={removeFriendAction}>
                  <input type="hidden" name="friendId" value={a.userId} />
                  <button className="text-sm text-muted hover:text-danger">
                    Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
