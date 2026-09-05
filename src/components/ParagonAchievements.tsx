import type { Game } from "@/lib/types";
import { esPlatinoEquivalente } from "@/lib/stats";
import { AchievementIcon } from "@/components/AchievementIcon";

/**
 * Cuenta platinos "de verdad": el metal real de PSN + el 100% de Steam
 * (`esPlatinoEquivalente`, lib/stats.ts — la misma fuente que ya usa
 * `checkAndGrantBadges` en lib/profiles.ts para otorgar estas mismas
 * insignias). Antes esto sumaba solo `g.earned?.platinum` (solo PSN): a
 * alguien con muchos 100% de Steam la insignia le salía ya otorgada en la
 * base (el contador de arriba, que sale de ahí) pero la tarjeta seguía
 * enseñando "23/50" en vez de "Conseguido" — el mismo dato, calculado de
 * dos formas distintas que no coincidían.
 */
function platinosEquivalentes(games: Game[]): number {
  return games.filter((g) => !g.isWishlist && esPlatinoEquivalente(g)).length;
}

const ACHIEVEMENTS = [
  { id: "first_blood", name: "Primera joya", description: "Consigue tu primer platino.", target: 1, value: platinosEquivalentes, color: "var(--platinum)" },
  { id: "cazador", name: "Cazador", description: "Consigue 10 platinos.", target: 10, value: platinosEquivalentes, color: "var(--accent)" },
  { id: "experto", name: "Experto", description: "Consigue 50 platinos.", target: 50, value: platinosEquivalentes, color: "var(--gold)" },
  { id: "leyenda", name: "Leyenda", description: "Consigue 100 platinos.", target: 100, value: platinosEquivalentes, color: "var(--bronze)" },
  { id: "coleccionista", name: "Coleccionista", description: "Añade 100 juegos a tu biblioteca.", target: 100, value: (games: Game[]) => games.filter((g) => !g.isWishlist).length, color: "var(--good)" },
  { id: "madrugador", name: "Pionero", description: "Forma parte de los primeros usuarios de Paragon.", target: 1, value: () => 1, color: "var(--accent-2)" },
] as const;

export function ParagonAchievements({ games, earnedIds }: { games: Game[]; earnedIds: string[] }) {
  // `earned` se calcula igual aquí que en cada tarjeta (en vivo, con
  // `earnedIds` como red de seguridad si algún día cambia un umbral y una
  // insignia ya otorgada dejara de cumplirlo en teoría) — así el contador de
  // arriba nunca puede desincronizarse de lo que enseñan las tarjetas, que es
  // justo el bug que había antes.
  const evaluados = ACHIEVEMENTS.map((achievement) => {
    const value = achievement.value(games);
    const earned = value >= achievement.target || earnedIds.includes(achievement.id);
    return { achievement, value, earned };
  });
  const totalConseguidos = evaluados.filter((e) => e.earned).length;

  return (
    <section className="rounded-[18px] border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-heading text-xl font-bold uppercase tracking-wide">Logros de Paragon</h2>
          <p className="mt-1 text-sm text-muted">Retos internos por jugar, completar y coleccionar.</p>
        </div>
        <span className="text-xs font-semibold text-muted">{totalConseguidos}/{ACHIEVEMENTS.length} conseguidos</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {evaluados.map(({ achievement, value, earned }) => {
          const percent = Math.min(100, Math.round((value / achievement.target) * 100));
          return (
            <div key={achievement.id} className="rounded-xl border border-border p-3" style={{ opacity: earned ? 1 : 0.62 }}>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${achievement.color} 18%, transparent)`, color: achievement.color }}>
                  <AchievementIcon id={achievement.id} size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">{achievement.name}</h3>
                    <span className="text-[10px] font-bold uppercase" style={{ color: earned ? "var(--good)" : "var(--muted)" }}>{earned ? "Conseguido" : `${value}/${achievement.target}`}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{achievement.description}</p>
                </div>
              </div>
              {!earned && <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${percent}%`, background: achievement.color }} /></div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
