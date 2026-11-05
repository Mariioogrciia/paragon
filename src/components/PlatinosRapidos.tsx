import Link from "@/components/Enlace";
import { getTranslations } from "next-intl/server";
import { Avatar } from "@/components/Avatar";
import { platinosMasRapidos } from "@/lib/platinoRapido";
import { duracionLegible } from "@/lib/platinoRapidoReglas";
import { PLATFORM_LABEL } from "@/lib/types";

/**
 * "Platinos más rápidos" de la ficha pública de un juego (lib/platinoRapido.ts):
 * del primer trofeo al platino. Va en la copia de la CDN también: no mira la
 * sesión, solo la base. Sin nadie con el platino, no se pinta.
 */
export async function PlatinosRapidos({ gameId }: { gameId: string }) {
  const lista = await platinosMasRapidos(gameId).catch(() => []);
  if (lista.length === 0) return null;
  const t = await getTranslations("Biblioteca.JuegoPage.rapidos");
  const unidades = { d: t("d"), h: t("h"), min: t("min") };
  const medallas = ["🥇", "🥈", "🥉"];

  return (
    <section>
      <h2 className="mb-1 font-heading text-2xl font-bold">{t("titulo")}</h2>
      <p className="mb-4 text-sm text-muted">{t("descripcion")}</p>
      <ol className="flex flex-col gap-2">
        {lista.map((p, i) => (
          <li key={p.userId} className="flex items-center gap-3 rounded-[14px] px-4 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <span className="w-7 shrink-0 text-center font-heading text-lg font-bold tabular-nums">{medallas[i] ?? i + 1}</span>
            <Avatar src={p.avatarUrl} name={p.nombre ?? p.handle ?? "?"} size={32} />
            <span className="min-w-0 flex-1">
              {p.handle ? (
                <Link href={`/u/${p.handle}`} className="block truncate text-sm font-semibold hover:text-[var(--accent-text)]">
                  {p.nombre ?? `@${p.handle}`}
                </Link>
              ) : (
                <span className="block truncate text-sm font-semibold">{p.nombre}</span>
              )}
              <span className="text-xs text-muted">{PLATFORM_LABEL[p.platform as keyof typeof PLATFORM_LABEL] ?? p.platform}</span>
            </span>
            <span className="shrink-0 font-heading text-base font-bold tabular-nums">{duracionLegible(p.duracionMs, unidades)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
