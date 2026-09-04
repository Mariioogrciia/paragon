import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { StatsAmigo } from "@/lib/profileStats";

/**
 * Tú y tus amigos, ordenados por horas — un vistazo rápido, no un
 * comparador completo. Cada fila enlaza a las estadísticas de esa persona
 * para el detalle real (gráficos, mapa de actividad); esto es el resumen,
 * no la duplica.
 */
export function FriendsLeaderboard({ personas, propioUserId }: { personas: StatsAmigo[]; propioUserId: string }) {
  if (personas.length <= 1) {
    return (
      <div className="rounded-2xl p-5 text-sm text-muted" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
        Todavía no tienes amigos añadidos — en cuanto tengas alguno, aquí sale cómo os comparáis.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-border px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted">
        <span></span>
        <span className="text-right">Horas</span>
        <span className="text-right">Trofeos</span>
        <span className="text-right">Platinos</span>
      </div>
      {personas.map((p, i) => {
        const esYo = p.userId === propioUserId;
        return (
          <Link
            key={p.userId}
            href={p.handle ? `/u/${p.handle}/estadisticas` : "#"}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-0 transition-colors hover:bg-surface-2"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="w-4 shrink-0 text-center text-xs font-bold text-muted">{i + 1}</span>
              <Avatar src={p.avatarUrl} name={p.displayName ?? p.handle ?? "?"} size={28} />
              <span className="min-w-0 truncate text-sm font-semibold">
                {p.displayName ?? (p.handle ? `@${p.handle}` : "Alguien")}
                {esYo && <span className="ml-1.5 text-xs font-normal text-accent">(tú)</span>}
              </span>
            </span>
            <span className="text-right text-sm font-bold">{p.horas.toLocaleString("es-ES")}</span>
            <span className="text-right text-sm font-bold">{p.trofeos.toLocaleString("es-ES")}</span>
            <span className="text-right text-sm font-bold" style={{ color: "var(--platinum)" }}>{p.platinos}</span>
          </Link>
        );
      })}
    </div>
  );
}
