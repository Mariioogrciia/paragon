import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Badges } from "@/components/Badges";
import { DescargarPdfButton } from "@/components/DescargarPdfButton";
import { coverGradient } from "@/lib/design";
import { paragonProgress } from "@/lib/level";
import { getLibrary, getProfileByHandle, getUserBadges } from "@/lib/profiles";
import { summarise } from "@/lib/stats";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return { title: `Hoja de servicios de @${handle} · Paragon` };
}

/**
 * "Hoja de servicios": el perfil entero (nivel, insignias, platinos, horas)
 * en una sola página pensada para imprimirse o guardarse como PDF — algo que
 * la gente sí comparte fuera de la app, a diferencia de un link interno. Los
 * mismos números que ya calcula `/u/[handle]`, sin repetir consultas nuevas
 * ni añadir una dependencia de generación de PDF en el servidor: el botón
 * usa el diálogo de impresión del navegador (ver DescargarPdfButton).
 */
export default async function HojaDeServiciosPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const { player, games } = await getLibrary(profile);
  if (games.length === 0) notFound();

  const stats = summarise(games);
  const nivel = paragonProgress(games);
  const badges = await getUserBadges(profile.userId);

  const horas = Math.round(
    games.reduce((total, g) => total + (g.playtimeMinutes ?? 0), 0) / 60,
  );

  // Los 6 juegos más "exprimidos": por horas si las hay, y si no, por
  // trofeos conseguidos — mismo criterio que el Wrap, para no contar dos
  // historias distintas del mismo dato en dos sitios de la app.
  const destacados = [...games]
    .filter((g) => !g.isWishlist)
    .sort((a, b) => {
      const horasA = a.playtimeMinutes ?? 0;
      const horasB = b.playtimeMinutes ?? 0;
      if (horasA !== horasB) return horasB - horasA;
      return b.earnedTotal - a.earnedTotal;
    })
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-[820px] px-7 pb-24 pt-9 print:max-w-none print:px-0 print:pt-0">
      <div className="mb-6 flex items-center justify-end gap-3 print:hidden" data-no-print>
        <DescargarPdfButton />
      </div>

      <header className="mb-9 flex flex-wrap items-center gap-5 border-b border-border pb-7 print:border-black/20">
        <Avatar src={player.avatarUrl} name={player.name} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-3xl font-bold uppercase leading-none">
            {player.name}
          </h1>
          <p className="mt-2 text-sm text-muted print:text-black/60">@{handle}</p>
        </div>
        <div className="text-right">
          <p className="font-heading text-2xl font-bold">Nivel {nivel.level}</p>
          <p className="text-xs text-muted print:text-black/60">
            {nivel.xp.toLocaleString("es-ES")} XP Paragon
          </p>
        </div>
      </header>

      <section className="mb-9 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { valor: stats.platinos, etiqueta: "Platinos" },
          { valor: stats.trofeos, etiqueta: "Trofeos" },
          { valor: stats.juegos, etiqueta: "Juegos" },
          { valor: horas > 0 ? `${horas.toLocaleString("es-ES")} h` : "—", etiqueta: "Jugadas" },
        ].map((item) => (
          <div
            key={item.etiqueta}
            className="rounded-xl p-4 text-center print:border print:border-black/15"
            style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
          >
            <p className="font-heading text-2xl font-bold">{item.valor}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-muted print:text-black/60">
              {item.etiqueta}
            </p>
          </div>
        ))}
      </section>

      {badges.length > 0 && (
        <section className="mb-9">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted print:text-black/60">
            Insignias
          </h2>
          <Badges earnedBadges={badges} />
        </section>
      )}

      {destacados.length > 0 && (
        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted print:text-black/60">
            Juegos destacados
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {destacados.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-3 rounded-xl p-3 print:border print:border-black/15"
                style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
              >
                <span
                  className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-cover bg-center"
                  style={{ background: g.iconUrl ? `url(${g.iconUrl}) center/cover` : coverGradient(g.id) }}
                />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold" title={g.title}>
                    {g.title}
                  </p>
                  <p className="text-[11px] text-muted print:text-black/60">
                    {g.playtimeMinutes
                      ? `${(g.playtimeMinutes / 60).toFixed(0)} h`
                      : `${g.earnedTotal} trofeos`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-12 text-center text-[11px] text-muted print:text-black/50">
        Generado por Paragon · paragon.app/u/{handle}
      </p>
    </div>
  );
}
