import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getProfileByUserId, resolveAvatarUrl } from "@/lib/profiles";
import { getLigaMensualDesglose } from "@/lib/ligas";
import { Avatar } from "@/components/Avatar";
import { BackButton } from "@/components/BackButton";
import { relativeDate } from "@/lib/design";

export const metadata = { title: "Desglose de puntos · Liga Mensual · Paragon" };

const COLOR_GRADO: Record<string, string> = {
  platinum: "var(--platinum)",
  gold: "var(--gold)",
  silver: "var(--silver)",
  bronze: "var(--bronze)",
};

export default async function DesgloseLigaMensualPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const t = await getTranslations("Perfil.LigasPage");

  const profile = await getProfileByUserId(userId);
  if (!profile) notFound();

  const desglose = await getLigaMensualDesglose(userId);
  const totalPuntos = desglose.reduce((sum, tr) => sum + tr.points, 0);

  const monthName = new Date().toLocaleString("es-ES", { month: "long" });
  const year = new Date().getFullYear();

  return (
    <div className="mx-auto max-w-[700px] px-7 py-12">
      <BackButton fallbackHref="/ligas" />

      <div className="mb-8 flex items-center gap-4">
        <Avatar src={resolveAvatarUrl(profile)} name={profile.displayName ?? profile.handle ?? "?"} size={56} />
        <div className="min-w-0">
          <h1 className="font-heading truncate text-2xl font-bold">{profile.displayName ?? `@${profile.handle}`}</h1>
          {profile.handle && (
            <Link href={`/u/${profile.handle}`} className="text-sm text-muted hover:text-[rgb(var(--accent-rgb))] hover:underline">
              @{profile.handle} — ver perfil
            </Link>
          )}
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">
          {t("tituloLiga", { mes: monthName, anio: year })}
        </p>
        <p className="mt-1 font-heading text-3xl font-bold text-[rgb(var(--accent-rgb))]">
          {totalPuntos.toLocaleString()} <span className="text-base font-normal text-muted">puntos</span>
        </p>
      </div>

      <h2 className="font-heading mb-3 text-lg font-bold uppercase tracking-wide">Trofeos que suman puntos este mes</h2>

      {desglose.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">{t("sinTrofeosEsteMes")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {desglose.map((tr, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
              {tr.gameIconUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tr.gameIconUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{tr.trophyName}</p>
                <p className="truncate text-xs text-muted">{tr.gameTitle} · {tr.earnedAt ? relativeDate(tr.earnedAt) : "—"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {tr.grade && (
                  <span className="h-2 w-2 rounded-full" style={{ background: COLOR_GRADO[tr.grade] ?? "var(--muted)" }} />
                )}
                <span className="font-mono text-sm font-bold text-[rgb(var(--accent-rgb))]">+{tr.points}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
